"""
User API endpoints.
"""

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import Database, CurrentUser
from app.services.user_service import UserService
from app.schemas.user import UserResponse, UserUpdate, PasswordChange
from app.schemas.auth import MessageResponse

router = APIRouter()


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Get the profile of the currently authenticated user.",
)
async def get_current_user(current_user: CurrentUser):
    """Get current user profile."""
    return UserResponse.model_validate(current_user)


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update current user",
    description="Update the profile of the currently authenticated user.",
)
async def update_current_user(
    data: UserUpdate,
    db: Database,
    current_user: CurrentUser,
):
    """Update current user profile."""
    service = UserService(db)
    user = await service.update(current_user["_id"], data)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return UserResponse.model_validate(user)


@router.put(
    "/me/password",
    response_model=MessageResponse,
    summary="Change password",
    description="Change the password of the currently authenticated user.",
)
async def change_password(
    data: PasswordChange,
    db: Database,
    current_user: CurrentUser,
):
    """Change current user password."""
    service = UserService(db)
    try:
        await service.change_password(current_user["_id"], data)
        return MessageResponse(message="Password changed successfully")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/me",
    response_model=MessageResponse,
    summary="Delete account",
    description="Delete the account of the currently authenticated user (soft delete).",
)
async def delete_current_user(
    db: Database,
    current_user: CurrentUser,
):
    """Delete current user account."""
    service = UserService(db)
    deleted = await service.delete(current_user["_id"])
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return MessageResponse(message="Account deleted successfully")

