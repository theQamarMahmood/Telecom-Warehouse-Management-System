import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    InterBranchTransfer, TransferItem, InventoryBalance, SerializedAsset,
    StockMovementLedger, EquipmentItem, Warehouse, Branch, User
)
from app.schemas import (
    TransferCreate, TransferDispatchInput, TransferReceiveInput, TransferOut
)
from app.auth import get_current_user
from app.rbac import require_roles, verify_warehouse_access
from app.audit_service import log_audit

router = APIRouter(prefix="/api/transfers", tags=["Inter-Branch & Warehouse Transfers"])

@router.get("", response_model=List[TransferOut])
def list_transfers(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InterBranchTransfer)
    if status_filter:
        query = query.filter(InterBranchTransfer.status == status_filter)

    transfers = query.order_by(InterBranchTransfer.id.desc()).all()
    res = []
    for t in transfers:
        items_data = []
        for it in t.items:
            items_data.append({
                "item_id": it.item_id,
                "item_name": it.item.name if it.item else "",
                "sku": it.item.sku if it.item else "",
                "requested_quantity": it.requested_quantity,
                "dispatched_quantity": it.dispatched_quantity,
                "received_quantity": it.received_quantity,
                "discrepancy_quantity": it.discrepancy_quantity,
                "serial_numbers": it.serial_numbers
            })

        res.append(TransferOut(
            id=t.id,
            transfer_number=t.transfer_number,
            from_warehouse_id=t.from_warehouse_id,
            from_warehouse_name=t.from_warehouse.name if t.from_warehouse else "",
            from_branch_name=t.from_warehouse.branch.name if t.from_warehouse and t.from_warehouse.branch else "",
            to_warehouse_id=t.to_warehouse_id,
            to_warehouse_name=t.to_warehouse.name if t.to_warehouse else "",
            to_branch_name=t.to_warehouse.branch.name if t.to_warehouse and t.to_warehouse.branch else "",
            requester_name=t.requester.full_name if t.requester else "Staff",
            approver_name=t.approver.full_name if t.approver else None,
            receiver_name=t.receiver.full_name if t.receiver else None,
            carrier=t.carrier,
            tracking_reference=t.tracking_reference,
            dispatch_date=t.dispatch_date,
            received_date=t.received_date,
            status=t.status,
            notes=t.notes,
            discrepancy_notes=t.discrepancy_notes,
            items=items_data,
            created_at=t.created_at
        ))
    return res

@router.post("", response_model=TransferOut)
def create_transfer_request(
    payload: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.from_warehouse_id == payload.to_warehouse_id:
        raise HTTPException(status_code=400, detail="Source and destination warehouse cannot be identical")

    from_wh = db.query(Warehouse).filter(Warehouse.id == payload.from_warehouse_id).first()
    to_wh = db.query(Warehouse).filter(Warehouse.id == payload.to_warehouse_id).first()
    if not from_wh or not to_wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    verify_warehouse_access(db, current_user, payload.from_warehouse_id)

    trf_no = f"TRF-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    transfer = InterBranchTransfer(
        transfer_number=trf_no,
        from_warehouse_id=from_wh.id,
        to_warehouse_id=to_wh.id,
        requester_id=current_user.id,
        carrier=payload.carrier,
        tracking_reference=payload.tracking_reference,
        status="SUBMITTED",
        notes=payload.notes
    )
    db.add(transfer)
    db.flush()

    for item_input in payload.items:
        item = db.query(EquipmentItem).filter(EquipmentItem.id == item_input.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_input.item_id} not found")

        # Check balance at from_wh
        bal = db.query(InventoryBalance).filter(
            InventoryBalance.item_id == item.id,
            InventoryBalance.warehouse_id == from_wh.id
        ).first()

        if not bal or bal.quantity_available < item_input.requested_quantity:
            avail = bal.quantity_available if bal else 0.0
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient available stock for '{item.name}' at source warehouse. Available: {avail}, Requested: {item_input.requested_quantity}"
            )

        # Reserve quantity so it cannot be double-allocated
        bal.quantity_available -= item_input.requested_quantity
        bal.quantity_reserved += item_input.requested_quantity

        serials_str = ",".join(item_input.serial_numbers) if item_input.serial_numbers else None
        t_item = TransferItem(
            transfer_id=transfer.id,
            item_id=item.id,
            requested_quantity=item_input.requested_quantity,
            dispatched_quantity=0.0,
            received_quantity=0.0,
            discrepancy_quantity=0.0,
            serial_numbers=serials_str
        )
        db.add(t_item)

    log_audit(db, current_user, "CREATE_TRANSFER", "InterBranchTransfer", trf_no, None, {"from": from_wh.name, "to": to_wh.name})
    db.commit()
    db.refresh(transfer)

    return list_transfers(db=db, current_user=current_user)[0]

@router.post("/{transfer_id}/approve")
def approve_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER", "BRANCH_MANAGER", "CLUSTER_OWNER"])(current_user)
    transfer = db.query(InterBranchTransfer).filter(InterBranchTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    if transfer.status != "SUBMITTED":
        raise HTTPException(status_code=400, detail=f"Transfer cannot be approved. Current status: {transfer.status}")

    # Segregation of duties: requester cannot approve their own transfer unless Super Admin
    if transfer.requester_id == current_user.id and current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Segregation of Duties Violation: You cannot approve your own transfer request."
        )

    transfer.status = "APPROVED"
    transfer.approver_id = current_user.id
    log_audit(db, current_user, "APPROVE_TRANSFER", "InterBranchTransfer", transfer.transfer_number, None, {"approver": current_user.username})
    db.commit()
    return {"message": f"Transfer {transfer.transfer_number} approved successfully"}

@router.post("/{transfer_id}/dispatch")
def dispatch_transfer(
    transfer_id: int,
    payload: TransferDispatchInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER", "BRANCH_MANAGER", "WAREHOUSE_OFFICER"])(current_user)
    transfer = db.query(InterBranchTransfer).filter(InterBranchTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    if transfer.status not in ["APPROVED", "PICKED"]:
        raise HTTPException(status_code=400, detail=f"Transfer cannot be dispatched. Status: {transfer.status}")

    verify_warehouse_access(db, current_user, transfer.from_warehouse_id)

    from_wh = transfer.from_warehouse
    for it in transfer.items:
        bal = db.query(InventoryBalance).filter(
            InventoryBalance.item_id == it.item_id,
            InventoryBalance.warehouse_id == from_wh.id
        ).first()

        it.dispatched_quantity = it.requested_quantity

        # Deduct from source warehouse on hand & reserved, and add to in_transit
        if bal:
            bal.quantity_reserved = max(0.0, bal.quantity_reserved - it.requested_quantity)
            bal.quantity_on_hand = max(0.0, bal.quantity_on_hand - it.requested_quantity)
            bal.quantity_in_transit += it.requested_quantity

        # Serialized assets transition to IN_TRANSIT
        if it.serial_numbers:
            serials = [s.strip() for s in it.serial_numbers.split(",") if s.strip()]
            for sn in serials:
                asset = db.query(SerializedAsset).filter(SerializedAsset.serial_number == sn).first()
                if asset:
                    asset.status = "IN_TRANSIT"
                    asset.current_warehouse_id = None

        # Movement ledger
        movement = StockMovementLedger(
            movement_type="TRANSFER_OUT",
            reference_type="TRANSFER",
            reference_id=transfer.transfer_number,
            item_id=it.item_id,
            serial_number=it.serial_numbers,
            from_warehouse_id=from_wh.id,
            to_warehouse_id=transfer.to_warehouse_id,
            quantity=it.dispatched_quantity,
            balance_before=bal.quantity_on_hand + it.dispatched_quantity if bal else 0,
            balance_after=bal.quantity_on_hand if bal else 0,
            performed_by_id=current_user.id,
            reason=f"Transfer dispatched to {transfer.to_warehouse.name} (Carrier: {payload.carrier or 'Courier'})"
        )
        db.add(movement)

    transfer.status = "IN_TRANSIT"
    transfer.dispatch_date = datetime.utcnow()
    if payload.carrier:
        transfer.carrier = payload.carrier
    if payload.tracking_reference:
        transfer.tracking_reference = payload.tracking_reference

    log_audit(db, current_user, "DISPATCH_TRANSFER", "InterBranchTransfer", transfer.transfer_number, None, {"carrier": payload.carrier})
    db.commit()
    return {"message": f"Transfer {transfer.transfer_number} dispatched. Status is now IN_TRANSIT."}

@router.post("/{transfer_id}/receive")
def receive_transfer(
    transfer_id: int,
    payload: TransferReceiveInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER", "BRANCH_MANAGER", "WAREHOUSE_OFFICER"])(current_user)
    transfer = db.query(InterBranchTransfer).filter(InterBranchTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    if transfer.status != "IN_TRANSIT":
        raise HTTPException(status_code=400, detail=f"Transfer is not in transit. Status: {transfer.status}")

    # RULE: The sending branch must not be able to claim receipt on behalf of destination!
    verify_warehouse_access(db, current_user, transfer.to_warehouse_id)

    to_wh = transfer.to_warehouse
    from_wh = transfer.from_warehouse
    total_discrepancy = 0.0
    discrepancy_details = []

    for item_rcv in payload.items:
        t_item = db.query(TransferItem).filter(
            TransferItem.transfer_id == transfer.id,
            TransferItem.item_id == item_rcv.item_id
        ).first()

        if not t_item:
            continue

        dispatched = t_item.dispatched_quantity
        received = item_rcv.received_quantity
        discrepancy = dispatched - received
        t_item.received_quantity = received
        t_item.discrepancy_quantity = discrepancy

        # Clear in_transit from source balance
        from_bal = db.query(InventoryBalance).filter(
            InventoryBalance.item_id == t_item.item_id,
            InventoryBalance.warehouse_id == from_wh.id
        ).first()
        if from_bal:
            from_bal.quantity_in_transit = max(0.0, from_bal.quantity_in_transit - dispatched)

        # Update destination warehouse balance for received units only
        to_bal = db.query(InventoryBalance).filter(
            InventoryBalance.item_id == t_item.item_id,
            InventoryBalance.warehouse_id == to_wh.id
        ).first()

        if not to_bal:
            to_bal = InventoryBalance(
                item_id=t_item.item_id,
                warehouse_id=to_wh.id,
                quantity_on_hand=0.0,
                quantity_available=0.0,
                quantity_reserved=0.0,
                quantity_borrowed=0.0,
                quantity_in_transit=0.0,
                quantity_damaged=0.0,
                quantity_quarantined=0.0
            )
            db.add(to_bal)
            db.flush()

        to_bal.quantity_on_hand += received
        to_bal.quantity_available += (received - item_rcv.damaged_quantity)
        to_bal.quantity_damaged += item_rcv.damaged_quantity

        # If serialized, update received serials
        if item_rcv.received_serial_numbers:
            for sn in item_rcv.received_serial_numbers:
                asset = db.query(SerializedAsset).filter(SerializedAsset.serial_number == sn).first()
                if asset:
                    asset.status = "AVAILABLE" if item_rcv.damaged_quantity == 0 else "DAMAGED"
                    asset.current_warehouse_id = to_wh.id

        if discrepancy != 0.0:
            total_discrepancy += discrepancy
            discrepancy_details.append(f"Item ID {t_item.item_id}: Dispatched {dispatched}, Received {received}, Discrepancy: {discrepancy}")

        # Movement ledger for received portion
        movement = StockMovementLedger(
            movement_type="TRANSFER_IN",
            reference_type="TRANSFER",
            reference_id=transfer.transfer_number,
            item_id=t_item.item_id,
            serial_number=",".join(item_rcv.received_serial_numbers) if item_rcv.received_serial_numbers else None,
            from_warehouse_id=from_wh.id,
            to_warehouse_id=to_wh.id,
            quantity=received,
            balance_before=to_bal.quantity_on_hand - received,
            balance_after=to_bal.quantity_on_hand,
            performed_by_id=current_user.id,
            reason=f"Transfer received at {to_wh.name} from {from_wh.name}."
        )
        db.add(movement)

    transfer.received_date = datetime.utcnow()
    transfer.receiver_id = current_user.id

    if total_discrepancy > 0.0:
        # ACCEPTANCE TEST #8 & #9:
        # System records unresolved transfer discrepancies instead of silently creating or deleting stock!
        transfer.status = "PARTIALLY_RECEIVED"
        transfer.discrepancy_notes = f"Transfer Discrepancy Alert: {total_discrepancy} units missing in transit. " + " | ".join(discrepancy_details)
    else:
        transfer.status = "RECEIVED"

    log_audit(db, current_user, "RECEIVE_TRANSFER", "InterBranchTransfer", transfer.transfer_number, None, {
        "status": transfer.status,
        "discrepancy": total_discrepancy,
        "details": discrepancy_details
    })
    db.commit()

    return {
        "transfer_number": transfer.transfer_number,
        "status": transfer.status,
        "total_discrepancy": total_discrepancy,
        "notes": transfer.discrepancy_notes or "Received in full"
    }
