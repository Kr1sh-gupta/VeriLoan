from fastapi import APIRouter, HTTPException, Depends, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, List, Callable
from app.database import get_db
from app.models import User
from app.schemas import UserAuthRequest, UserResponse, UserBase

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

def get_current_user(
    authorization: Optional[str] = Header(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Extracts and validates the authentication token from either Authorization header
    (e.g., 'Bearer jwt-mock-token-usr-001-operator' or raw 'jwt-mock-token-usr-001-operator').
    Returns the authenticated User database model or raises HTTP 401.
    """
    raw_token = None
    if credentials and credentials.credentials:
        raw_token = credentials.credentials
    elif authorization:
        raw_token = authorization.replace("Bearer ", "").replace("bearer ", "").strip()
    
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please provide Authorization header."
        )

    token_str = raw_token.strip().strip('"').strip("'")
    
    user = None
    for prefix in ["jwt-mock-token-", "mock-jwt-token-", "token-"]:
        if token_str.startswith(prefix):
            remainder = token_str[len(prefix):]
            parts = remainder.rsplit("-", 1)
            potential_user_id = parts[0]
            user = db.query(User).filter(User.id == potential_user_id).first()
            if user:
                break
    
    if not user:
        user = db.query(User).filter((User.id == token_str) | (User.username == token_str)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )
    
    return user


def require_role(allowed_roles: List[str]) -> Callable:
    """
    Role-Based Access Control (RBAC) guard.
    Ensures that the authenticated user possesses one of the allowed roles.
    Raises HTTP 403 Forbidden if the user's role is insufficient.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        allowed_upper = [r.upper() for r in allowed_roles]
        if current_user.role.upper() == "ADMIN" or current_user.role.upper() in allowed_upper:
            return current_user
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Action requires one of {allowed_roles} roles. Your role is '{current_user.role}'."
        )
    return role_checker


@router.post("/login", response_model=UserResponse)
def login(payload: UserAuthRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or user.password_hash != payload.password:
        raise HTTPException(status_code=401, detail="Invalid username or password credentials.")
    
    return UserResponse(
        user=UserBase(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            email=user.email,
            avatar_badge=user.avatar_badge
        ),
        token=f"jwt-mock-token-{user.id}-{user.role.lower()}"
    )

@router.get("/me", response_model=UserBase)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserBase(
        id=current_user.id,
        username=current_user.username,
        full_name=current_user.full_name,
        role=current_user.role,
        email=current_user.email,
        avatar_badge=current_user.avatar_badge
    )

@router.get("/users", response_model=list[UserBase])
def list_mock_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        UserBase(
            id=u.id,
            username=u.username,
            full_name=u.full_name,
            role=u.role,
            email=u.email,
            avatar_badge=u.avatar_badge
        )
        for u in users
    ]
