"""
Team Member API endpoints.
"""

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import Database, CurrentUser
from app.services.member_service import MemberService
from app.schemas.member import (
    MemberResponse,
    MemberInvite,
    MemberRoleUpdate,
    InvitationResponse,
)
from app.schemas.project import ProjectResponse
from app.schemas.auth import MessageResponse

router = APIRouter()


@router.get(
    "/projects/{project_id}/members",
    response_model=list[MemberResponse],
    summary="List project members",
    description="Get all members of a project.",
)
async def list_members(
    project_id: str,
    db: Database,
    current_user: CurrentUser,
):
    """List all members of a project."""
    service = MemberService(db)
    members = await service.get_members(project_id)
    return [MemberResponse.model_validate(m) for m in members]


@router.post(
    "/projects/{project_id}/members/invite",
    response_model=InvitationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Invite a member",
    description="Invite a new member to the project. Requires owner or admin role.",
)
async def invite_member(
    project_id: str,
    data: MemberInvite,
    db: Database,
    current_user: CurrentUser,
):
    """Invite a new member to the project."""
    service = MemberService(db)
    try:
        invitation = await service.invite_member(project_id, current_user["_id"], data)
        return InvitationResponse.model_validate(invitation)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put(
    "/projects/{project_id}/members/{user_id}",
    response_model=MessageResponse,
    summary="Update member role",
    description="Update a member's role. Requires owner or admin role.",
)
async def update_member_role(
    project_id: str,
    user_id: str,
    data: MemberRoleUpdate,
    db: Database,
    current_user: CurrentUser,
):
    """Update a member's role."""
    service = MemberService(db)
    try:
        updated = await service.update_role(project_id, current_user["_id"], user_id, data)
        
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Member not found",
            )
        
        return MessageResponse(message="Member role updated successfully")
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/projects/{project_id}/members/{user_id}",
    response_model=MessageResponse,
    summary="Remove a member",
    description="Remove a member from the project. Requires owner or admin role.",
)
async def remove_member(
    project_id: str,
    user_id: str,
    db: Database,
    current_user: CurrentUser,
):
    """Remove a member from the project."""
    service = MemberService(db)
    try:
        removed = await service.remove_member(project_id, current_user["_id"], user_id)
        
        if not removed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Member not found",
            )
        
        return MessageResponse(message="Member removed successfully")
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/invitations/{token}",
    response_model=InvitationResponse,
    summary="Get invitation details",
    description="Get details of an invitation by token.",
)
async def get_invitation(
    token: str,
    db: Database,
):
    """Get invitation details by token."""
    service = MemberService(db)
    invitation = await service.get_invitation(token)
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation",
        )
    
    return InvitationResponse.model_validate(invitation)


@router.post(
    "/invitations/{token}/accept",
    response_model=ProjectResponse,
    summary="Accept an invitation",
    description="Accept an invitation to join a project.",
)
async def accept_invitation(
    token: str,
    db: Database,
    current_user: CurrentUser,
):
    """Accept an invitation to join a project."""
    service = MemberService(db)
    try:
        project = await service.accept_invitation(token, current_user["_id"])
        return ProjectResponse.model_validate(project)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

