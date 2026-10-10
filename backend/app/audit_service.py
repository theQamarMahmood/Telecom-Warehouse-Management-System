import json
from typing import Any, Optional
from sqlalchemy.orm import Session
from app.models import AuditLog, User

def log_audit(
    db: Session,
    user: Optional[User],
    action: str,
    entity_name: str,
    entity_id: Optional[str] = None,
    previous_state: Optional[Any] = None,
    new_state: Optional[Any] = None,
    ip_address: Optional[str] = None,
):
    prev_str = json.dumps(previous_state, default=str) if isinstance(previous_state, (dict, list)) else (str(previous_state) if previous_state is not None else None)
    new_str = json.dumps(new_state, default=str) if isinstance(new_state, (dict, list)) else (str(new_state) if new_state is not None else None)

    audit_entry = AuditLog(
        user_id=user.id if user else None,
        username=user.username if user else "SYSTEM",
        action=action,
        entity_name=entity_name,
        entity_id=str(entity_id) if entity_id is not None else None,
        previous_state=prev_str,
        new_state=new_str,
        ip_address=ip_address,
    )
    db.add(audit_entry)
    # Database transaction will commit this with the caller's atomic commit
