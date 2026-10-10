from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ApprovalRequest, User
from app.schemas import ApprovalDecision, ApprovalRequestOut
from app.auth import get_current_user
from app.rbac import require_roles
from app.audit_service import log_audit

router = APIRouter(prefix="/api/approvals", tags=["Approvals & Workflows"])

@router.get("", response_model=List[ApprovalRequestOut])
def list_approvals(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ApprovalRequest)
    if status_filter:
        query = query.filter(ApprovalRequest.status == status_filter)

    approvals = query.order_by(ApprovalRequest.id.desc()).all()
    res = []
    for a in approvals:
        res.append(ApprovalRequestOut(
            id=a.id,
            request_type=a.request_type,
            reference_id=a.reference_id,
            title=a.title,
            details=a.details,
            requester_name=a.requester.full_name if a.requester else "Staff",
            approver_name=a.approver.full_name if a.approver else None,
            status=a.status,
            rejection_reason=a.rejection_reason,
            created_at=a.created_at,
            decided_at=a.decided_at
        ))
    return res

@router.post("/{approval_id}/decide")
def decide_approval(
    approval_id: int,
    payload: ApprovalDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER", "BRANCH_MANAGER", "CLUSTER_OWNER"])(current_user)
    approval = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")

    # Enforce Segregation of Duties
    if approval.requester_id == current_user.id and current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Segregation of Duties: You cannot approve your own request."
        )

    approval.status = payload.decision
    approval.approver_id = current_user.id
    approval.decided_at = datetime.utcnow()
    if payload.decision == "REJECTED":
        approval.rejection_reason = payload.comment

    log_audit(db, current_user, f"APPROVAL_{payload.decision}", "ApprovalRequest", str(approval.id), None, {"decision": payload.decision, "comment": payload.comment})
    db.commit()

    return {"message": f"Request {approval.reference_id} marked as {payload.decision}"}
