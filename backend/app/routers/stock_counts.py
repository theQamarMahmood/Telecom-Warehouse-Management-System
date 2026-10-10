import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    PhysicalStockCount, StockCountItem, InventoryBalance,
    StockMovementLedger, EquipmentItem, Warehouse, User
)
from app.schemas import (
    StockCountCreate, StockCountItemEntry, StockCountReconcileInput, StockCountOut
)
from app.auth import get_current_user
from app.rbac import require_roles, verify_warehouse_access
from app.audit_service import log_audit

router = APIRouter(prefix="/api/stock-counts", tags=["Physical Stock Counts & Reconciliation"])

@router.get("", response_model=List[StockCountOut])
def list_stock_counts(
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(PhysicalStockCount)
    if warehouse_id:
        query = query.filter(PhysicalStockCount.warehouse_id == warehouse_id)

    counts = query.order_by(PhysicalStockCount.id.desc()).all()
    res = []
    for c in counts:
        items_data = []
        for it in c.items:
            items_data.append({
                "item_id": it.item_id,
                "item_name": it.item.name if it.item else "",
                "sku": it.item.sku if it.item else "",
                "system_quantity": it.system_quantity,
                "counted_quantity": it.counted_quantity,
                "variance": it.variance,
                "is_reconciled": it.is_reconciled,
                "discrepancy_reason": it.discrepancy_reason
            })

        res.append(StockCountOut(
            id=c.id,
            count_number=c.count_number,
            warehouse_id=c.warehouse_id,
            warehouse_name=c.warehouse.name if c.warehouse else "",
            count_type=c.count_type,
            status=c.status,
            initiated_by_name=c.initiator.full_name if c.initiator else "Staff",
            approver_name=c.approver.full_name if c.approver else None,
            started_at=c.started_at,
            items=items_data
        ))
    return res

@router.post("", response_model=StockCountOut)
def initiate_stock_count(
    payload: StockCountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_OFFICER"])(current_user)
    verify_warehouse_access(db, current_user, payload.warehouse_id)

    wh = db.query(Warehouse).filter(Warehouse.id == payload.warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    count_no = f"CNT-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:5].upper()}"
    stock_count = PhysicalStockCount(
        count_number=count_no,
        warehouse_id=wh.id,
        count_type=payload.count_type,
        status="IN_PROGRESS",
        initiated_by_id=current_user.id,
        started_at=datetime.utcnow()
    )
    db.add(stock_count)
    db.flush()

    # Pre-populate items in warehouse
    balances = db.query(InventoryBalance).filter(InventoryBalance.warehouse_id == wh.id).all()
    for b in balances:
        c_item = StockCountItem(
            count_id=stock_count.id,
            item_id=b.item_id,
            location_id=b.location_id,
            system_quantity=b.quantity_on_hand,
            counted_quantity=b.quantity_on_hand, # Default to system before user updates physical counts
            variance=0.0,
            is_reconciled=False
        )
        db.add(c_item)

    log_audit(db, current_user, "INITIATE_COUNT", "PhysicalStockCount", count_no, None, {"warehouse": wh.name, "type": payload.count_type})
    db.commit()
    db.refresh(stock_count)

    return list_stock_counts(db=db, current_user=current_user)[0]

@router.post("/{count_id}/record-item")
def record_count_entry(
    count_id: int,
    payload: StockCountItemEntry,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = db.query(PhysicalStockCount).filter(PhysicalStockCount.id == count_id).first()
    if not count:
        raise HTTPException(status_code=404, detail="Stock count session not found")
    if count.status != "IN_PROGRESS":
        raise HTTPException(status_code=400, detail="Count session is not in progress")

    item = db.query(StockCountItem).filter(
        StockCountItem.count_id == count.id,
        StockCountItem.item_id == payload.item_id
    ).first()

    if not item:
        # Item wasn't on hand; add it
        item = StockCountItem(
            count_id=count.id,
            item_id=payload.item_id,
            location_id=payload.location_id,
            system_quantity=0.0,
            counted_quantity=payload.counted_quantity,
            variance=payload.counted_quantity,
            discrepancy_reason=payload.discrepancy_reason
        )
        db.add(item)
    else:
        item.counted_quantity = payload.counted_quantity
        item.variance = payload.counted_quantity - item.system_quantity
        item.discrepancy_reason = payload.discrepancy_reason

    db.commit()
    return {"message": "Count entry saved", "variance": item.variance}

@router.post("/{count_id}/reconcile")
def reconcile_and_post_adjustments(
    count_id: int,
    payload: StockCountReconcileInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Managerial approval required for reconciliation!
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER"])(current_user)
    count = db.query(PhysicalStockCount).filter(PhysicalStockCount.id == count_id).first()
    if not count:
        raise HTTPException(status_code=404, detail="Stock count session not found")

    verify_warehouse_access(db, current_user, count.warehouse_id)

    wh = count.warehouse
    for it in count.items:
        if it.variance != 0.0 and not it.is_reconciled:
            bal = db.query(InventoryBalance).filter(
                InventoryBalance.item_id == it.item_id,
                InventoryBalance.warehouse_id == wh.id
            ).first()

            if not bal:
                bal = InventoryBalance(
                    item_id=it.item_id,
                    warehouse_id=wh.id,
                    quantity_on_hand=0.0,
                    quantity_available=0.0,
                    quantity_reserved=0.0,
                    quantity_borrowed=0.0,
                    quantity_in_transit=0.0,
                    quantity_damaged=0.0,
                    quantity_quarantined=0.0
                )
                db.add(bal)
                db.flush()

            prev_hand = bal.quantity_on_hand
            bal.quantity_on_hand += it.variance
            bal.quantity_available = max(0.0, bal.quantity_available + it.variance)
            new_hand = bal.quantity_on_hand

            # Log adjustment in StockMovementLedger
            movement = StockMovementLedger(
                movement_type="COUNT_ADJUST",
                reference_type="STOCK_COUNT",
                reference_id=count.count_number,
                item_id=it.item_id,
                from_warehouse_id=wh.id if it.variance < 0 else None,
                to_warehouse_id=wh.id if it.variance > 0 else None,
                quantity=abs(it.variance),
                balance_before=prev_hand,
                balance_after=new_hand,
                performed_by_id=current_user.id,
                reason=f"Stock count variance adjustment: {it.variance} units. Reason: {it.discrepancy_reason or 'Physical Count Audit'}"
            )
            db.add(movement)
            it.is_reconciled = True

    count.status = "APPROVED_RECONCILED"
    count.approver_id = current_user.id
    count.completed_at = datetime.utcnow()
    count.reconciliation_notes = payload.approval_notes

    log_audit(db, current_user, "RECONCILE_COUNT", "PhysicalStockCount", count.count_number, None, {"approver": current_user.username, "notes": payload.approval_notes})
    db.commit()

    return {"message": f"Stock count {count.count_number} reconciled and adjustments posted atomically."}
