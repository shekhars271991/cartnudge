"""
Authentication API endpoints.
"""

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import Database
from app.services.auth_service import AuthService
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    RefreshResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
)
from app.schemas.user import UserResponse

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account with email and password.",
)
async def register(data: RegisterRequest, db: Database):
    """Register a new user."""
    service = AuthService(db)
    try:
        user = await service.register(data)
        return UserResponse.model_validate(user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Login with email and password",
    description="Authenticate user and return access and refresh tokens.",
)
async def login(data: LoginRequest, db: Database):
    """Login and get tokens."""
    service = AuthService(db)
    try:
        result = await service.login(data)
        return LoginResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout and revoke refresh token",
    description="Revoke the refresh token to logout the user.",
)
async def logout(data: RefreshRequest, db: Database):
    """Logout and revoke refresh token."""
    service = AuthService(db)
    try:
        await service.logout(data.refresh_token)
        return MessageResponse(message="Successfully logged out")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/refresh",
    response_model=RefreshResponse,
    summary="Refresh access token",
    description="Get a new access token using a valid refresh token.",
)
async def refresh_token(data: RefreshRequest, db: Database):
    """Refresh access token."""
    service = AuthService(db)
    try:
        access_token = await service.refresh_access_token(data.refresh_token)
        return RefreshResponse(access_token=access_token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request password reset",
    description="Send a password reset link to the user's email.",
)
async def forgot_password(data: ForgotPasswordRequest, db: Database):
    """Request password reset."""
    service = AuthService(db)
    token = await service.request_password_reset(data.email)
    
    # In production, send email with token
    # For now, just return success (don't reveal if email exists)
    if token:
        # TODO: Send email with reset link
        print(f"Password reset token: {token}")  # Remove in production
    
    return MessageResponse(message="If the email exists, a reset link has been sent")


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password",
    description="Reset password using the token from the reset email.",
)
async def reset_password(data: ResetPasswordRequest, db: Database):
    """Reset password with token."""
    service = AuthService(db)
    try:
        await service.reset_password(data.token, data.new_password)
        return MessageResponse(message="Password has been reset successfully")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

