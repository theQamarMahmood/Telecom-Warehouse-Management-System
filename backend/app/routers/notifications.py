from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Notification, User
from app.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications & Alerts"])

@router.get("")
def list_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notes = db.query(Notification).filter(
        (Notification.user_id == current_user.id) | (Notification.user_id == None)
    ).order_by(Notification.id.desc()).limit(50).all()

    return [{
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "severity": n.severity,
        "is_read": n.is_read,
        "link": n.link,
        "created_at": n.created_at
    } for n in notes]

@router.post("/{notification_id}/mark-read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.query(Notification).filter(Notification.id == notification_id).first()
    if note:
        note.is_read = True
        db.commit()
    return {"message": "Notification marked as read"}
