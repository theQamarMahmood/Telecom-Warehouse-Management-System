import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    MaintenanceTicket, SerializedAsset, EquipmentItem, Warehouse,
    InventoryBalance, StockMovementLedger, User
)
from app.schemas import (
    MaintenanceTicketCreate, MaintenanceTicketUpdate, MaintenanceTicketOut
)
from app.auth import get_current_user
from app.rbac import require_roles, verify_warehouse_access
from app.audit_service import log_audit

router = APIRouter(prefix="/api/maintenance", tags=["Repairs, Damaged & Missing Equipment"])

@router.get("/tickets", response_model=List[MaintenanceTicketOut])
def list_tickets(
    status_filter: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MaintenanceTicket).join(EquipmentItem).join(Warehouse)
    if status_filter:
        query = query.filter(MaintenanceTicket.status == status_filter)
    if warehouse_id:
        query = query.filter(MaintenanceTicket.warehouse_id == warehouse_id)

    tickets = query.order_by(MaintenanceTicket.id.desc()).all()
    res = []
    for t in tickets:
        res.append(MaintenanceTicketOut(
            id=t.id,
            ticket_number=t.ticket_number,
            item_name=t.item.name if t.item else "",
            sku=t.item.sku if t.item else "",
            serial_number=t.asset.serial_number if t.asset else None,
            warehouse_name=t.warehouse.name if t.warehouse else "",
            fault_type=t.fault_type,
            severity=t.severity,
            description=t.description,
            status=t.status,
            repair_vendor=t.repair_vendor,
            repair_cost=t.repair_cost,
            reported_by_name=t.reporter.full_name if t.reporter else "Staff",
            created_at=t.created_at
        ))
    return res

@router.post("/tickets", response_model=MaintenanceTicketOut)
def report_faulty_or_damaged(
    payload: MaintenanceTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    wh = db.query(Warehouse).filter(Warehouse.id == payload.warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    item = db.query(EquipmentItem).filter(EquipmentItem.id == payload.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    asset = None
    if payload.asset_id:
        asset = db.query(SerializedAsset).filter(SerializedAsset.id == payload.asset_id).first()
        if asset:
            # Change asset status to DAMAGED or QUARANTINED
            asset.status = "DAMAGED"
            asset.condition = "DAMAGED"

    # Adjust inventory balance: move from available to damaged/quarantined
    bal = db.query(InventoryBalance).filter(
        InventoryBalance.item_id == item.id,
        InventoryBalance.warehouse_id == wh.id
    ).first()

    if bal:
        if bal.quantity_available >= 1.0:
            bal.quantity_available -= 1.0
        bal.quantity_damaged += 1.0

    t_number = f"MT-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:5].upper()}"
    ticket = MaintenanceTicket(
        ticket_number=t_number,
        asset_id=asset.id if asset else None,
        item_id=item.id,
        warehouse_id=wh.id,
        fault_type=payload.fault_type,
        severity=payload.severity,
        description=payload.description,
        vendor_service_ref=payload.vendor_service_ref,
        repair_vendor=payload.repair_vendor,
        reported_by_id=current_user.id,
        status="REPORTED"
    )
    db.add(ticket)

    log_audit(db, current_user, "REPORT_FAULT", "MaintenanceTicket", t_number, None, {"fault": payload.fault_type})
    db.commit()
    db.refresh(ticket)

    return list_tickets(db=db, current_user=current_user)[0]

@router.put("/tickets/{ticket_id}/status")
def update_ticket_status(
    ticket_id: int,
    payload: MaintenanceTicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER", "FIELD_ENGINEER"])(current_user)
    ticket = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_status = ticket.status
    ticket.status = payload.status
    if payload.resolution_notes:
        ticket.resolution_notes = payload.resolution_notes
    if payload.repair_cost:
        ticket.repair_cost = payload.repair_cost

    # If INSPECTED_PASSED / Return-to-service: restore to AVAILABLE!
    if payload.status == "INSPECTED_PASSED":
        ticket.resolved_at = datetime.utcnow()
        if ticket.asset:
            ticket.asset.status = "AVAILABLE"
            ticket.asset.condition = "REFURBISHED"
        
        # Restore balance
        bal = db.query(InventoryBalance).filter(
            InventoryBalance.item_id == ticket.item_id,
            InventoryBalance.warehouse_id == ticket.warehouse_id
        ).first()
        if bal:
            bal.quantity_damaged = max(0.0, bal.quantity_damaged - 1.0)
            bal.quantity_available += 1.0

        # Ledger record
        movement = StockMovementLedger(
            movement_type="REPAIR_RETURN",
            reference_type="MAINTENANCE",
            reference_id=ticket.ticket_number,
            item_id=ticket.item_id,
            serial_number=ticket.asset.serial_number if ticket.asset else None,
            from_warehouse_id=None,
            to_warehouse_id=ticket.warehouse_id,
            quantity=1.0,
            balance_before=bal.quantity_available - 1.0 if bal else 0,
            balance_after=bal.quantity_available if bal else 1.0,
            performed_by_id=current_user.id,
            reason=f"Returned to service following successful repair and inspection ({ticket.ticket_number})"
        )
        db.add(movement)

    elif payload.status == "WRITTEN_OFF":
        # Write-off equipment completely
        ticket.resolved_at = datetime.utcnow()
        if ticket.asset:
            ticket.asset.status = "WRITTEN_OFF"
        bal = db.query(InventoryBalance).filter(
            InventoryBalance.item_id == ticket.item_id,
            InventoryBalance.warehouse_id == ticket.warehouse_id
        ).first()
        if bal:
            bal.quantity_damaged = max(0.0, bal.quantity_damaged - 1.0)
            bal.quantity_on_hand = max(0.0, bal.quantity_on_hand - 1.0)

        movement = StockMovementLedger(
            movement_type="WRITE_OFF",
            reference_type="MAINTENANCE",
            reference_id=ticket.ticket_number,
            item_id=ticket.item_id,
            serial_number=ticket.asset.serial_number if ticket.asset else None,
            from_warehouse_id=ticket.warehouse_id,
            to_warehouse_id=None,
            quantity=1.0,
            balance_before=bal.quantity_on_hand + 1.0 if bal else 1,
            balance_after=bal.quantity_on_hand if bal else 0,
            performed_by_id=current_user.id,
            reason=f"Asset written off: {payload.resolution_notes or 'Beyond economical repair'}"
        )
        db.add(movement)

    log_audit(db, current_user, "UPDATE_MAINTENANCE", "MaintenanceTicket", ticket.ticket_number, {"status": old_status}, {"status": ticket.status})
    db.commit()

    return {"message": f"Maintenance ticket updated to {ticket.status}"}
