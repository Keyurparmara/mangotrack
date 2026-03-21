from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from auth_utils import hash_password, verify_password, create_access_token, get_current_user
from pydantic import BaseModel


class PasswordChangePayload(BaseModel):
    new_password: str

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Owner can create managers and employees
    # Manager can only create employees
    if current_user.role == models.UserRole.owner:
        if payload.role == models.UserRole.owner:
            raise HTTPException(status_code=400, detail="Cannot create another owner")
    elif current_user.role == models.UserRole.manager:
        if payload.role != models.UserRole.employee:
            raise HTTPException(status_code=403, detail="Manager can only create employees")
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    existing = db.query(models.User).filter(models.User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Manager always creates employees under themselves
    parent_id = None
    if current_user.role == models.UserRole.manager:
        parent_id = current_user.id
    elif current_user.role == models.UserRole.owner and payload.role == models.UserRole.employee:
        # Owner creating an employee — requires specifying which manager
        # For now owner can create employees without a manager parent
        parent_id = None

    user = models.User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        parent_id=parent_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/team", response_model=List[schemas.UserOut])
def get_team(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Owner sees all users. Manager sees their own employees."""
    if current_user.role == models.UserRole.owner:
        users = db.query(models.User).filter(
            models.User.role != models.UserRole.owner
        ).order_by(models.User.role, models.User.created_at).all()
    elif current_user.role == models.UserRole.manager:
        users = db.query(models.User).filter(
            models.User.parent_id == current_user.id
        ).order_by(models.User.created_at).all()
    else:
        raise HTTPException(status_code=403, detail="Access denied")
    return users


@router.put("/users/{user_id}/password")
def change_user_password(
    user_id: int,
    payload: PasswordChangePayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.owner:
        raise HTTPException(status_code=403, detail="Only owner can change passwords")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role == models.UserRole.owner:
        raise HTTPException(status_code=400, detail="Cannot change owner password from here")
    target.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}
