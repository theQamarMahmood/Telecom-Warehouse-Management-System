from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import AuditLog, User
from app.auth import get_current_user
from app.rbac import require_roles

router = APIRouter(prefix="/api/audit", tags=["Immutable Audit Trail"])

@router.get("")
def get_audit_trail(
    action: Optional[str] = None,
    entity_name: Optional[str] = None,
    username: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "AUDITOR", "WAREHOUSE_MANAGER"])(current_user)

    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_name:
        query = query.filter(AuditLog.entity_name == entity_name)
    if username:
        query = query.filter(AuditLog.username.ilike(f"%{username}%"))
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                AuditLog.action.ilike(s),
                AuditLog.entity_name.ilike(s),
                AuditLog.entity_id.ilike(s),
                AuditLog.username.ilike(s),
                AuditLog.new_state.ilike(s)
            )
        )

    logs = query.order_by(AuditLog.id.desc()).limit(limit).all()
    return [{
        "id": l.id,
        "username": l.username,
        "action": l.action,
        "entity_name": l.entity_name,
        "entity_id": l.entity_id,
        "previous_state": l.previous_state,
        "new_state": l.new_state,
        "ip_address": l.ip_address,
        "created_at": l.created_at
    } for l in logs]
