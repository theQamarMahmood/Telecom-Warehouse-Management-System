import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    EquipmentLoan, InventoryBalance, SerializedAsset, StockMovementLedger,
    EquipmentItem, Warehouse, MaintenanceTicket, User
)
from app.schemas import EquipmentLoanCreate, EquipmentLoanReturn, EquipmentLoanOut
from app.auth import get_current_user
from app.rbac import require_roles, verify_warehouse_access
from app.audit_service import log_audit

router = APIRouter(prefix="/api/loans", tags=["Borrowing & Temporary Loans"])

@router.get("", response_model=List[EquipmentLoanOut])
def list_loans(
    status_filter: Optional[str] = None,
    borrower: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(EquipmentLoan).join(EquipmentItem).join(Warehouse)
    if status_filter:
        query = query.filter(EquipmentLoan.status == status_filter)
    if borrower:
        query = query.filter(EquipmentLoan.borrower_name.ilike(f"%{borrower}%"))
    if warehouse_id:
        query = query.filter(EquipmentLoan.issuing_warehouse_id == warehouse_id)

    loans = query.order_by(EquipmentLoan.id.desc()).all()
    now = datetime.utcnow()
    res = []
    for l in loans:
        is_overdue = (l.status == "ISSUED" and l.expected_return_date < now)
        res.append(EquipmentLoanOut(
            id=l.id,
            loan_number=l.loan_number,
            borrower_name=l.borrower_name,
            borrower_department=l.borrower_department,
            warehouse_name=l.warehouse.name if l.warehouse else "Warehouse",
            item_name=l.item.name if l.item else "Item",
            sku=l.item.sku if l.item else "",
            serial_number=l.serial_number,
            quantity=l.quantity,
            purpose=l.purpose,
            issue_date=l.issue_date,
            expected_return_date=l.expected_return_date,
            actual_return_date=l.actual_return_date,
            status=l.status,
            is_damaged_reported=l.is_damaged_reported,
            damage_notes=l.damage_notes,
            is_overdue=is_overdue
        ))
    return res

@router.post("", response_model=EquipmentLoanOut)
def create_loan(
    payload: EquipmentLoanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_OFFICER"])(current_user)
    verify_warehouse_access(db, current_user, payload.issuing_warehouse_id)

    item = db.query(EquipmentItem).filter(EquipmentItem.id == payload.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Equipment item not found")

    wh = db.query(Warehouse).filter(Warehouse.id == payload.issuing_warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    # Verify inventory availability
    bal = db.query(InventoryBalance).filter(
        InventoryBalance.item_id == item.id,
        InventoryBalance.warehouse_id == wh.id
    ).first()

    if not bal or bal.quantity_available < payload.quantity:
        available_cnt = bal.quantity_available if bal else 0.0
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient available stock for '{item.name}'. Available: {available_cnt}, Requested: {payload.quantity}"
        )

    # Check serialized unit
    asset = None
    if item.tracking_mode == "SERIALIZED":
        if not payload.serial_number:
            raise HTTPException(status_code=400, detail="Serialized equipment requires serial number for loan")
        asset = db.query(SerializedAsset).filter(
            SerializedAsset.item_id == item.id,
            SerializedAsset.serial_number == payload.serial_number
        ).first()
        if not asset:
            raise HTTPException(status_code=404, detail=f"Serial number '{payload.serial_number}' not found")
        if asset.status != "AVAILABLE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unit with SN '{payload.serial_number}' is not available (Current Status: {asset.status})"
            )
        # Update asset status
        asset.status = "BORROWED"

    # Decrement available, increment borrowed
    bal.quantity_available -= payload.quantity
    bal.quantity_borrowed += payload.quantity

    loan_number = f"LN-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    loan = EquipmentLoan(
        loan_number=loan_number,
        borrower_name=payload.borrower_name,
        borrower_department=payload.borrower_department,
        borrower_email=payload.borrower_email,
        borrower_phone=payload.borrower_phone,
        issuing_warehouse_id=wh.id,
        item_id=item.id,
        serial_number=payload.serial_number,
        quantity=payload.quantity,
        purpose=payload.purpose,
        issue_date=datetime.utcnow(),
        expected_return_date=payload.expected_return_date,
        status="ISSUED",
        condition_on_issue="GOOD",
        issued_by_id=current_user.id
    )
    db.add(loan)

    # Stock Movement Ledger
    movement = StockMovementLedger(
        movement_type="LOAN",
        reference_type="LOAN",
        reference_id=loan_number,
        item_id=item.id,
        serial_number=payload.serial_number,
        from_warehouse_id=wh.id,
        to_warehouse_id=None,
        quantity=payload.quantity,
        balance_before=bal.quantity_available + payload.quantity,
        balance_after=bal.quantity_available,
        performed_by_id=current_user.id,
        reason=f"Loan issued to {payload.borrower_name} ({payload.borrower_department}): {payload.purpose}"
    )
    db.add(movement)

    log_audit(db, current_user, "CREATE_LOAN", "EquipmentLoan", loan_number, None, {"borrower": payload.borrower_name, "qty": payload.quantity})
    db.commit()
    db.refresh(loan)

    return EquipmentLoanOut(
        id=loan.id,
        loan_number=loan.loan_number,
        borrower_name=loan.borrower_name,
        borrower_department=loan.borrower_department,
        warehouse_name=wh.name,
        item_name=item.name,
        sku=item.sku,
        serial_number=loan.serial_number,
        quantity=loan.quantity,
        purpose=loan.purpose,
        issue_date=loan.issue_date,
        expected_return_date=loan.expected_return_date,
        actual_return_date=loan.actual_return_date,
        status=loan.status,
        is_damaged_reported=loan.is_damaged_reported,
        damage_notes=loan.damage_notes,
        is_overdue=False
    )

@router.post("/{loan_id}/return", response_model=EquipmentLoanOut)
def return_loan(
    loan_id: int,
    payload: EquipmentLoanReturn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_OFFICER"])(current_user)
    loan = db.query(EquipmentLoan).filter(EquipmentLoan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan record not found")
    if loan.status != "ISSUED":
        raise HTTPException(status_code=400, detail=f"Loan cannot be returned. Current status: {loan.status}")

    verify_warehouse_access(db, current_user, loan.issuing_warehouse_id)

    item = loan.item
    wh = loan.warehouse
    bal = db.query(InventoryBalance).filter(
        InventoryBalance.item_id == item.id,
        InventoryBalance.warehouse_id == wh.id
    ).first()

    loan.actual_return_date = datetime.utcnow()
    loan.condition_on_return = payload.condition_on_return
    loan.is_damaged_reported = payload.is_damaged or (payload.condition_on_return in ["DAMAGED", "FAULTY"])
    loan.damage_notes = payload.damage_notes
    loan.returned_to_id = current_user.id

    if bal:
        bal.quantity_borrowed = max(0.0, bal.quantity_borrowed - loan.quantity)

    asset = None
    if loan.serial_number:
        asset = db.query(SerializedAsset).filter(
            SerializedAsset.item_id == item.id,
            SerializedAsset.serial_number == loan.serial_number
        ).first()

    # CRITICAL TELECOM RULE: If equipment returned damaged, FAULTY, or with missing accessories:
    # IT MUST NOT BE RESTORED TO AVAILABLE STOCK!
    if loan.is_damaged_reported:
        loan.status = "RETURNED_DAMAGED"
        if bal:
            bal.quantity_damaged += loan.quantity
            bal.quantity_quarantined += loan.quantity
        if asset:
            asset.status = "DAMAGED"
            asset.condition = "DAMAGED"

        # Automatically open maintenance ticket for investigation & repair
        mt_ticket_no = f"MT-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:5].upper()}"
        ticket = MaintenanceTicket(
            ticket_number=mt_ticket_no,
            asset_id=asset.id if asset else None,
            item_id=item.id,
            warehouse_id=wh.id,
            fault_type="LOAN_RETURN_DAMAGE",
            severity="HIGH",
            description=f"Equipment returned damaged from loan {loan.loan_number} by {loan.borrower_name}. Notes: {payload.damage_notes or 'Damaged condition on return'}",
            reported_by_id=current_user.id,
            status="REPORTED"
        )
        db.add(ticket)
    else:
        loan.status = "CLOSED"
        if bal:
            bal.quantity_available += loan.quantity
        if asset:
            asset.status = "AVAILABLE"
            asset.condition = payload.condition_on_return

    # Stock Movement Ledger
    movement = StockMovementLedger(
        movement_type="RETURN",
        reference_type="LOAN",
        reference_id=loan.loan_number,
        item_id=item.id,
        serial_number=loan.serial_number,
        from_warehouse_id=None,
        to_warehouse_id=wh.id,
        quantity=loan.quantity,
        balance_before=bal.quantity_available - (0 if loan.is_damaged_reported else loan.quantity) if bal else 0,
        balance_after=bal.quantity_available if bal else 0,
        performed_by_id=current_user.id,
        reason=f"Loan return from {loan.borrower_name}. Status: {loan.status}. Notes: {payload.damage_notes or 'Returned in good order'}"
    )
    db.add(movement)

    log_audit(db, current_user, "RETURN_LOAN", "EquipmentLoan", loan.loan_number, {"status": "ISSUED"}, {"status": loan.status, "damaged": loan.is_damaged_reported})
    db.commit()
    db.refresh(loan)

    return EquipmentLoanOut(
        id=loan.id,
        loan_number=loan.loan_number,
        borrower_name=loan.borrower_name,
        borrower_department=loan.borrower_department,
        warehouse_name=wh.name,
        item_name=item.name,
        sku=item.sku,
        serial_number=loan.serial_number,
        quantity=loan.quantity,
        purpose=loan.purpose,
        issue_date=loan.issue_date,
        expected_return_date=loan.expected_return_date,
        actual_return_date=loan.actual_return_date,
        status=loan.status,
        is_damaged_reported=loan.is_damaged_reported,
        damage_notes=loan.damage_notes,
        is_overdue=False
    )
