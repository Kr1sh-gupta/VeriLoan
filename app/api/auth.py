import json
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserAuthRequest, UserResponse, UserBase

router = APIRouter(prefix="/auth", tags=["Authentication"])

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
