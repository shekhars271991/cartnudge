"""
Member service - business logic for team member management.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.member import Role, MemberInvite, MemberRoleUpdate


class MemberService:
    """Service for team member management."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_members(self, project_id: str) -> list[dict]:
        """Get all members of a project."""
        project = await self.db.projects.find_one(
            {"_id": ObjectId(project_id), "is_active": True},
            {"members": 1}
        )
        
        if not project:
            return []
        
        members = []
        for member in project.get("members", []):
            user = await self.db.users.find_one(
                {"_id": member["user_id"]},
                {"email": 1, "name": 1}
            )
            if user:
                members.append({
                    "user_id": str(member["user_id"]),
                    "email": user.get("email", ""),
                    "name": user.get("name", ""),
                    "role": member.get("role"),
                    "joined_at": member.get("joined_at"),
                })
        
        return members
    
    async def invite_member(
        self, project_id: str, inviter_id: str, data: MemberInvite
    ) -> dict:
        """Invite a new member to the project."""
        # Check inviter permission
        if not await self._has_permission(project_id, inviter_id, ["owner", "admin"]):
            raise PermissionError("You don't have permission to invite members")
        
        # Can't invite as owner
        if data.role == Role.OWNER:
            raise ValueError("Cannot invite as owner")
        
        # Check if user already a member
        existing_user = await self.db.users.find_one({"email": data.email.lower()})
        if existing_user:
            project = await self.db.projects.find_one({
                "_id": ObjectId(project_id),
                "members.user_id": existing_user["_id"],
            })
            if project:
                raise ValueError("User is already a member of this project")
        
        # Check for existing invitation
        existing_invite = await self.db.invitations.find_one({
            "project_id": ObjectId(project_id),
            "email": data.email.lower(),
            "accepted_at": None,
            "expires_at": {"$gt": datetime.utcnow()},
        })
        if existing_invite:
            raise ValueError("Invitation already sent to this email")
        
        # Create invitation
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=7)
        
        invitation_doc = {
            "project_id": ObjectId(project_id),
            "email": data.email.lower(),
            "role": data.role.value,
            "token": token,
            "invited_by": ObjectId(inviter_id),
            "expires_at": expires_at,
            "accepted_at": None,
            "created_at": datetime.utcnow(),
        }
        
        result = await self.db.invitations.insert_one(invitation_doc)
        invitation_doc["_id"] = str(result.inserted_id)
        invitation_doc["project_id"] = project_id
        invitation_doc["invited_by"] = inviter_id
        
        # Get project name
        project = await self.db.projects.find_one(
            {"_id": ObjectId(project_id)},
            {"name": 1}
        )
        invitation_doc["project_name"] = project.get("name") if project else None
        
        return invitation_doc
    
    async def accept_invitation(self, token: str, user_id: str) -> dict:
        """Accept an invitation to join a project."""
        invitation = await self.db.invitations.find_one({
            "token": token,
            "accepted_at": None,
            "expires_at": {"$gt": datetime.utcnow()},
        })
        
        if not invitation:
            raise ValueError("Invalid or expired invitation")
        
        # Get user email to verify
        user = await self.db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user["email"].lower() != invitation["email"].lower():
            raise ValueError("Invitation is for a different email address")
        
        now = datetime.utcnow()
        
        # Add member to project
        await self.db.projects.update_one(
            {"_id": invitation["project_id"]},
            {
                "$push": {
                    "members": {
                        "user_id": ObjectId(user_id),
                        "role": invitation["role"],
                        "invited_by": invitation["invited_by"],
                        "joined_at": now,
                    }
                },
                "$set": {"updated_at": now},
            }
        )
        
        # Mark invitation as accepted
        await self.db.invitations.update_one(
            {"_id": invitation["_id"]},
            {"$set": {"accepted_at": now}}
        )
        
        # Return updated project with populated members
        project = await self.db.projects.find_one({"_id": invitation["project_id"]})
        project["_id"] = str(project["_id"])
        project["created_by"] = str(project["created_by"])
        
        # Populate member details (email, name) from users collection
        populated_members = []
        for member in project.get("members", []):
            member_user = await self.db.users.find_one(
                {"_id": member["user_id"]},
                {"email": 1, "name": 1}
            )
            if member_user:
                populated_members.append({
                    "user_id": str(member["user_id"]),
                    "email": member_user.get("email", ""),
                    "name": member_user.get("name", ""),
                    "role": member.get("role"),
                    "joined_at": member.get("joined_at"),
                })
        project["members"] = populated_members
        
        return project
    
    async def update_role(
        self, project_id: str, updater_id: str, target_user_id: str, data: MemberRoleUpdate
    ) -> bool:
        """Update a member's role."""
        # Check updater permission
        if not await self._has_permission(project_id, updater_id, ["owner", "admin"]):
            raise PermissionError("You don't have permission to update member roles")
        
        # Can't change to/from owner unless you're the owner
        target_role = await self._get_user_role(project_id, target_user_id)
        if target_role == "owner" or data.role == Role.OWNER:
            if not await self._has_permission(project_id, updater_id, ["owner"]):
                raise PermissionError("Only owners can transfer ownership")
        
        # Can't demote yourself if you're the only owner
        if updater_id == target_user_id and target_role == "owner":
            owners = await self._count_owners(project_id)
            if owners <= 1:
                raise ValueError("Cannot demote yourself as the only owner")
        
        result = await self.db.projects.update_one(
            {
                "_id": ObjectId(project_id),
                "members.user_id": ObjectId(target_user_id),
            },
            {
                "$set": {
                    "members.$.role": data.role.value,
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        
        return result.modified_count > 0
    
    async def remove_member(
        self, project_id: str, remover_id: str, target_user_id: str
    ) -> bool:
        """Remove a member from the project."""
        # Check remover permission
        if not await self._has_permission(project_id, remover_id, ["owner", "admin"]):
            raise PermissionError("You don't have permission to remove members")
        
        # Can't remove an owner unless you're an owner
        target_role = await self._get_user_role(project_id, target_user_id)
        if target_role == "owner":
            if not await self._has_permission(project_id, remover_id, ["owner"]):
                raise PermissionError("Only owners can remove other owners")
            # Can't remove the last owner
            owners = await self._count_owners(project_id)
            if owners <= 1:
                raise ValueError("Cannot remove the only owner")
        
        result = await self.db.projects.update_one(
            {"_id": ObjectId(project_id)},
            {
                "$pull": {"members": {"user_id": ObjectId(target_user_id)}},
                "$set": {"updated_at": datetime.utcnow()},
            }
        )
        
        return result.modified_count > 0
    
    async def get_invitation(self, token: str) -> dict | None:
        """Get invitation details by token."""
        invitation = await self.db.invitations.find_one({
            "token": token,
            "accepted_at": None,
            "expires_at": {"$gt": datetime.utcnow()},
        })
        
        if invitation:
            invitation["_id"] = str(invitation["_id"])
            invitation["project_id"] = str(invitation["project_id"])
            invitation["invited_by"] = str(invitation["invited_by"])
            
            # Get project name
            project = await self.db.projects.find_one(
                {"_id": ObjectId(invitation["project_id"])},
                {"name": 1}
            )
            invitation["project_name"] = project.get("name") if project else None
        
        return invitation
    
    async def _has_permission(self, project_id: str, user_id: str, allowed_roles: list[str]) -> bool:
        """Check if user has one of the allowed roles."""
        role = await self._get_user_role(project_id, user_id)
        return role in allowed_roles
    
    async def _get_user_role(self, project_id: str, user_id: str) -> str | None:
        """Get user's role in a project."""
        project = await self.db.projects.find_one(
            {
                "_id": ObjectId(project_id),
                "members.user_id": ObjectId(user_id),
            },
            {"members.$": 1}
        )
        
        if project and project.get("members"):
            return project["members"][0]["role"]
        return None
    
    async def _count_owners(self, project_id: str) -> int:
        """Count number of owners in a project."""
        project = await self.db.projects.find_one(
            {"_id": ObjectId(project_id)},
            {"members": 1}
        )
        
        if not project:
            return 0
        
        return sum(1 for m in project.get("members", []) if m.get("role") == "owner")

