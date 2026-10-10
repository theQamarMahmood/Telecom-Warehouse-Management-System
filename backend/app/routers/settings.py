from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import SystemSetting, User
from app.auth import get_current_user
from app.rbac import require_roles
from app.audit_service import log_audit

router = APIRouter(prefix="/api/settings", tags=["System Settings"])

DEFAULT_SETTINGS = {
    "COMPANY_NAME": "Apex Telecom Global Operations",
    "BASE_CURRENCY": "USD",
    "ENABLE_BARCODE_SCANNING": "true",
    "DEFAULT_LOAN_DURATION_DAYS": "14",
    "SEGREGATION_OF_DUTIES_ENFORCED": "true",
    "DISCREPANCY_TOLERANCE_PERCENT": "0.0",
    "AUTO_QUARANTINE_DAMAGED_RETURNS": "true"
}

@router.get("")
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings = db.query(SystemSetting).all()
    res = DEFAULT_SETTINGS.copy()
    for s in settings:
        res[s.key] = s.value
    return res

@router.post("")
def update_settings(payload: Dict[str, str], db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_roles(["SUPER_ADMIN"])(current_user)
    for k, v in payload.items():
        s = db.query(SystemSetting).filter(SystemSetting.key == k).first()
        if not s:
            s = SystemSetting(key=k, value=v)
            db.add(s)
        else:
            s.value = v
    log_audit(db, current_user, "UPDATE_SETTINGS", "SystemSetting", None, None, payload)
    db.commit()
    return {"message": "System settings updated successfully"}
