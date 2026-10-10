from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserBranchScope, UserClusterScope, Branch, Cluster
from app.schemas import LoginRequest, Token, UserCreate, UserUpdate, UserOut
from app.auth import verify_password, hash_password, create_access_token, get_current_user
from app.rbac import require_roles
from app.audit_service import log_audit

router = APIRouter(prefix="/api/auth", tags=["Authentication & Users"])

@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the administrator.",
        )
    
    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token({"sub": user.username, "role": user.role, "id": user.id})
    log_audit(db, user, "LOGIN", "User", str(user.id), None, {"status": "SUCCESS"})
    db.commit()

    # User profile payload
    c_ids = [cs.cluster_id for cs in user.cluster_scopes]
    b_ids = [bs.branch_id for bs in user.branch_scopes]
    user_data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "department": user.department,
        "phone": user.phone,
        "cluster_ids": c_ids,
        "branch_ids": b_ids,
    }

    return {"access_token": token, "token_type": "bearer", "user": user_data}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    c_ids = [cs.cluster_id for cs in current_user.cluster_scopes]
    b_ids = [bs.branch_id for bs in current_user.branch_scopes]
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "department": current_user.department,
        "phone": current_user.phone,
        "is_active": current_user.is_active,
        "cluster_ids": c_ids,
        "branch_ids": b_ids,
    }

@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "AUDITOR"])(current_user)
    users = db.query(User).all()
    results = []
    for u in users:
        results.append(UserOut(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            department=u.department,
            phone=u.phone,
            is_active=u.is_active,
            created_at=u.created_at,
            last_login=u.last_login,
            cluster_ids=[cs.cluster_id for cs in u.cluster_scopes],
            branch_ids=[bs.branch_id for bs in u.branch_scopes]
        ))
    return results

@router.post("/users", response_model=UserOut)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN"])(current_user)

    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        department=payload.department,
        phone=payload.phone,
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    for cid in (payload.cluster_ids or []):
        db.add(UserClusterScope(user_id=new_user.id, cluster_id=cid))
    for bid in (payload.branch_ids or []):
        db.add(UserBranchScope(user_id=new_user.id, branch_id=bid))

    log_audit(db, current_user, "CREATE_USER", "User", str(new_user.id), None, {"username": new_user.username, "role": new_user.role})
    db.commit()
    db.refresh(new_user)

    return UserOut(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        department=new_user.department,
        phone=new_user.phone,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        last_login=new_user.last_login,
        cluster_ids=[cs.cluster_id for cs in new_user.cluster_scopes],
        branch_ids=[bs.branch_id for bs in new_user.branch_scopes]
    )

@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN"])(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_state = {"role": user.role, "is_active": user.is_active, "email": user.email}

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.email is not None:
        user.email = payload.email
    if payload.role is not None:
        user.role = payload.role
    if payload.department is not None:
        user.department = payload.department
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.is_active is not None:
        user.is_active = payload.is_active

    if payload.cluster_ids is not None:
        db.query(UserClusterScope).filter(UserClusterScope.user_id == user.id).delete()
        for cid in payload.cluster_ids:
            db.add(UserClusterScope(user_id=user.id, cluster_id=cid))

    if payload.branch_ids is not None:
        db.query(UserBranchScope).filter(UserBranchScope.user_id == user.id).delete()
        for bid in payload.branch_ids:
            db.add(UserBranchScope(user_id=user.id, branch_id=bid))

    log_audit(db, current_user, "UPDATE_USER", "User", str(user.id), old_state, {"role": user.role, "is_active": user.is_active})
    db.commit()
    db.refresh(user)

    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department=user.department,
        phone=user.phone,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login,
        cluster_ids=[cs.cluster_id for cs in user.cluster_scopes],
        branch_ids=[bs.branch_id for bs in user.branch_scopes]
    )
