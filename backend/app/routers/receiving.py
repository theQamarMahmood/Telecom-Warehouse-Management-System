import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    GoodsReceipt, GoodsReceiptItem, InventoryBalance, SerializedAsset,
    StockMovementLedger, PurchaseOrder, PurchaseOrderItem, EquipmentItem,
    Warehouse, User
)
from app.schemas import GoodsReceiptCreate, GoodsReceiptOut
from app.auth import get_current_user
from app.rbac import require_roles, verify_warehouse_access
from app.audit_service import log_audit

router = APIRouter(prefix="/api/receiving", tags=["Goods Receiving & Inspection"])

@router.get("/receipts", response_model=List[GoodsReceiptOut])
def list_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    receipts = db.query(GoodsReceipt).order_by(GoodsReceipt.id.desc()).all()
    res = []
    for r in receipts:
        res.append(GoodsReceiptOut(
            id=r.id,
            grn_number=r.grn_number,
            source_type=r.source_type,
            receiving_warehouse_id=r.receiving_warehouse_id,
            receiving_warehouse_name=r.warehouse.name if r.warehouse else "Warehouse",
            delivery_note_ref=r.delivery_note_ref,
            status=r.status,
            notes=r.notes,
            created_at=r.created_at,
            received_by_name=r.received_by.full_name if r.received_by else "Staff",
            items_count=len(r.items)
        ))
    return res

@router.post("/receipts", response_model=GoodsReceiptOut)
def create_goods_receipt(
    payload: GoodsReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_OFFICER"])(current_user)
    verify_warehouse_access(db, current_user, payload.receiving_warehouse_id)

    wh = db.query(Warehouse).filter(Warehouse.id == payload.receiving_warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Receiving warehouse not found")

    # Generate unique Goods Receipt Note
    grn_number = f"GRN-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    receipt = GoodsReceipt(
        grn_number=grn_number,
        po_id=payload.po_id,
        source_type="PURCHASE_ORDER" if payload.po_id else "DIRECT_RECEIPT",
        receiving_warehouse_id=payload.receiving_warehouse_id,
        delivery_note_ref=payload.delivery_note_ref,
        received_by_id=current_user.id,
        status="ACCEPTED",
        notes=payload.notes
    )
    db.add(receipt)
    db.flush()

    for item_input in payload.items:
        item = db.query(EquipmentItem).filter(EquipmentItem.id == item_input.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Equipment item ID {item_input.item_id} not found")

        # Serialized equipment validation
        serials_str = None
        if item.tracking_mode == "SERIALIZED":
            if not item_input.serial_numbers or len(item_input.serial_numbers) != int(item_input.received_quantity):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item '{item.name}' requires exactly {int(item_input.received_quantity)} serial numbers. Received {len(item_input.serial_numbers or [])}."
                )

            # Check duplicate serial numbers in input
            if len(item_input.serial_numbers) != len(set(item_input.serial_numbers)):
                raise HTTPException(status_code=400, detail="Duplicate serial numbers detected in receipt payload!")

            # Check duplicate serial numbers in database
            existing_serials = db.query(SerializedAsset).filter(SerializedAsset.serial_number.in_(item_input.serial_numbers)).all()
            if existing_serials:
                duplicates = [es.serial_number for es in existing_serials]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Validation error: Duplicate serial number(s) already exist in system: {', '.join(duplicates)}"
                )

            serials_str = ",".join(item_input.serial_numbers)

            # Insert SerializedAsset records
            for sn in item_input.serial_numbers:
                asset = SerializedAsset(
                    item_id=item.id,
                    serial_number=sn,
                    barcode=f"BC-{sn}",
                    current_warehouse_id=wh.id,
                    current_location_id=item_input.location_id,
                    status="AVAILABLE" if item_input.condition != "DAMAGED" else "DAMAGED",
                    ownership="COMPANY",
                    condition=item_input.condition
                )
                db.add(asset)

        # Record receipt line item
        grn_item = GoodsReceiptItem(
            receipt_id=receipt.id,
            item_id=item.id,
            location_id=item_input.location_id,
            expected_quantity=item_input.expected_quantity,
            received_quantity=item_input.received_quantity,
            damaged_quantity=item_input.damaged_quantity,
            serial_numbers=serials_str,
            inspection_passed=(item_input.damaged_quantity == 0)
        )
        db.add(grn_item)

        # Update or create InventoryBalance
        bal = db.query(InventoryBalance).filter(
            InventoryBalance.item_id == item.id,
            InventoryBalance.warehouse_id == wh.id,
            InventoryBalance.location_id == item_input.location_id
        ).first()

        prev_qty = bal.quantity_on_hand if bal else 0.0

        if not bal:
            bal = InventoryBalance(
                item_id=item.id,
                warehouse_id=wh.id,
                location_id=item_input.location_id,
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

        accepted_qty = item_input.received_quantity - item_input.damaged_quantity
        bal.quantity_on_hand += item_input.received_quantity
        bal.quantity_available += accepted_qty
        bal.quantity_damaged += item_input.damaged_quantity
        new_qty = bal.quantity_on_hand

        # Append to atomic Stock Movement Ledger
        movement = StockMovementLedger(
            movement_type="RECEIVE",
            reference_type="GOODS_RECEIPT",
            reference_id=grn_number,
            item_id=item.id,
            serial_number=serials_str if item.tracking_mode == "SERIALIZED" else None,
            from_warehouse_id=None,
            to_warehouse_id=wh.id,
            quantity=item_input.received_quantity,
            balance_before=prev_qty,
            balance_after=new_qty,
            performed_by_id=current_user.id,
            reason=f"Goods Receipt {grn_number} from Delivery Note: {payload.delivery_note_ref or 'N/A'}"
        )
        db.add(movement)

        # If linked to PO, update PO line received_quantity
        if payload.po_id:
            po_item = db.query(PurchaseOrderItem).filter(
                PurchaseOrderItem.po_id == payload.po_id,
                PurchaseOrderItem.item_id == item.id
            ).first()
            if po_item:
                po_item.received_quantity += item_input.received_quantity

    # If all items in PO received, update PO status
    if payload.po_id:
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == payload.po_id).first()
        if po:
            all_received = all(it.received_quantity >= it.ordered_quantity for it in po.items)
            po.status = "RECEIVED" if all_received else "PARTIALLY_RECEIVED"

    log_audit(db, current_user, "RECEIVE_GOODS", "GoodsReceipt", str(receipt.id), None, {"grn": grn_number, "items_count": len(payload.items)})
    db.commit()
    db.refresh(receipt)

    return GoodsReceiptOut(
        id=receipt.id,
        grn_number=receipt.grn_number,
        source_type=receipt.source_type,
        receiving_warehouse_id=receipt.receiving_warehouse_id,
        receiving_warehouse_name=wh.name,
        delivery_note_ref=receipt.delivery_note_ref,
        status=receipt.status,
        notes=receipt.notes,
        created_at=receipt.created_at,
        received_by_name=current_user.full_name,
        items_count=len(payload.items)
    )
