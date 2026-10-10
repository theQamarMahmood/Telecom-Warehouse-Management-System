import csv
import io
import uuid
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    EquipmentCategory, EquipmentItem, Warehouse, InventoryBalance,
    SerializedAsset, StockMovementLedger, GoodsReceipt, GoodsReceiptItem, User
)
from app.auth import get_current_user
from app.rbac import require_roles, verify_warehouse_access
from app.audit_service import log_audit

router = APIRouter(prefix="/api/bulk-import", tags=["Bulk Equipment Import & Data Entry"])

@router.get("/template/items", response_class=PlainTextResponse)
def get_items_template():
    return "category_code,sku,name,manufacturer,model_number,tracking_mode,unit_of_measure,unit_cost,min_stock,max_stock\n" \
           "RAN,ANT-SEC-65-18,65 Degree 18dBi Sector Antenna,CommScope,RRZZ-65B-R4,QUANTITY,UNIT,450.0,10,100\n" \
           "RAN,RRU-5G-3200,5G Dual Band Remote Radio Unit,Ericsson,Radio 4415 B1/B3,SERIALIZED,UNIT,3200.0,5,50\n" \
           "PASSIVE,CBL-78-FEED,7/8 inch Coaxial Feeder Cable (100m Roll),Andrew,AVA5-50,QUANTITY,ROLL,180.0,20,200\n"

@router.get("/template/receiving", response_class=PlainTextResponse)
def get_receiving_template():
    return "warehouse_code,sku,quantity,serial_numbers,condition\n" \
           "WH-DXB-CENTRAL,RRU-5G-3200,3,SN-5G-9001;SN-5G-9002;SN-5G-9003,NEW\n" \
           "WH-DXB-CENTRAL,ANT-SEC-65-18,50,,NEW\n"

@router.post("/preview")
async def preview_csv(file: UploadFile = File(...)):
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except Exception:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    return {
        "filename": file.filename,
        "total_rows": len(rows),
        "headers": reader.fieldnames or [],
        "preview_sample": rows[:10]
    }

@router.post("/items")
async def import_items(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER"])(current_user)
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except Exception:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    accepted = 0
    rejected = 0
    errors = []
    seen_skus = set()

    for idx, row in enumerate(rows, start=2):
        cat_code = row.get("category_code", "").strip()
        sku = row.get("sku", "").strip()
        name = row.get("name", "").strip()
        mfr = row.get("manufacturer", "").strip()
        model = row.get("model_number", "").strip()

        if not sku or not name or not mfr:
            rejected += 1
            errors.append({"row": idx, "sku": sku, "error": "Missing required fields (sku, name, manufacturer)"})
            continue

        if sku in seen_skus:
            rejected += 1
            errors.append({"row": idx, "sku": sku, "error": f"SKU '{sku}' already exists in batch"})
            continue

        cat = db.query(EquipmentCategory).filter(EquipmentCategory.code == cat_code).first()
        if not cat:
            # Fallback or create category
            cat = db.query(EquipmentCategory).first()

        existing = db.query(EquipmentItem).filter(EquipmentItem.sku == sku).first()
        if existing:
            rejected += 1
            errors.append({"row": idx, "sku": sku, "error": f"SKU '{sku}' already exists"})
            continue

        seen_skus.add(sku)
        item = EquipmentItem(
            category_id=cat.id if cat else 1,
            sku=sku,
            name=name,
            manufacturer=mfr,
            model_number=model or "Standard",
            tracking_mode=row.get("tracking_mode", "SERIALIZED").strip().upper(),
            unit_of_measure=row.get("unit_of_measure", "UNIT").strip(),
            unit_cost=float(row.get("unit_cost", 0.0) or 0.0),
            min_stock_level=int(row.get("min_stock", 5) or 5),
            max_stock_level=int(row.get("max_stock", 100) or 100),
            reorder_threshold=int(row.get("reorder_threshold", 10) or 10),
        )
        db.add(item)
        accepted += 1

    log_audit(db, current_user, "BULK_IMPORT_ITEMS", "EquipmentItem", None, None, {"accepted": accepted, "rejected": rejected})
    db.commit()

    return {
        "status": "COMPLETED",
        "total_processed": len(rows),
        "accepted": accepted,
        "rejected": rejected,
        "errors": errors
    }

@router.post("/receiving")
async def bulk_receive_stock(
    file: UploadFile = File(...),
    delivery_note_ref: str = Form("BULK-IMPORT-DN"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_OFFICER"])(current_user)

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except Exception:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    # Pre-validate all serials across whole batch to ensure NO duplicates
    all_new_serials = set()
    accepted_rows = []
    rejected_rows = []
    errors = []

    for idx, row in enumerate(rows, start=2):
        wh_code = row.get("warehouse_code", "").strip()
        sku = row.get("sku", "").strip()
        qty_str = row.get("quantity", "0").strip()
        serials_raw = row.get("serial_numbers", "").strip()

        wh = db.query(Warehouse).filter(Warehouse.code == wh_code).first()
        if not wh:
            errors.append({"row": idx, "sku": sku, "error": f"Warehouse code '{wh_code}' does not exist"})
            rejected_rows.append(row)
            continue

        item = db.query(EquipmentItem).filter(EquipmentItem.sku == sku).first()
        if not item:
            errors.append({"row": idx, "sku": sku, "error": f"SKU '{sku}' not found in catalogue"})
            rejected_rows.append(row)
            continue

        try:
            qty = float(qty_str)
        except ValueError:
            errors.append({"row": idx, "sku": sku, "error": f"Invalid quantity '{qty_str}'"})
            rejected_rows.append(row)
            continue

        serials = [s.strip() for s in serials_raw.split(";") if s.strip()] if serials_raw else []

        if item.tracking_mode == "SERIALIZED":
            if len(serials) != int(qty):
                errors.append({"row": idx, "sku": sku, "error": f"Item is serialized: expected {int(qty)} serials, got {len(serials)}"})
                rejected_rows.append(row)
                continue

            # Duplicate check in CSV batch
            dup_in_batch = [s for s in serials if s in all_new_serials]
            if dup_in_batch:
                errors.append({"row": idx, "sku": sku, "error": f"Duplicate serial in batch: {', '.join(dup_in_batch)}"})
                rejected_rows.append(row)
                continue

            # Duplicate check in DB
            db_dups = db.query(SerializedAsset).filter(SerializedAsset.serial_number.in_(serials)).all()
            if db_dups:
                dup_names = [d.serial_number for d in db_dups]
                errors.append({"row": idx, "sku": sku, "error": f"Serial already exists in database: {', '.join(dup_names)}"})
                rejected_rows.append(row)
                continue

            all_new_serials.update(serials)

        accepted_rows.append((wh, item, qty, serials, row.get("condition", "NEW").strip()))

    if errors:
        # Halt import and report errors
        return {
            "status": "VALIDATION_FAILED",
            "message": "Bulk import aborted due to validation errors. No stock was modified.",
            "total_rows": len(rows),
            "errors": errors
        }

    # Execute atomic stock commit
    grn_number = f"GRN-BULK-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:5].upper()}"
    target_wh = accepted_rows[0][0]

    grn = GoodsReceipt(
        grn_number=grn_number,
        source_type="BULK_IMPORT",
        receiving_warehouse_id=target_wh.id,
        delivery_note_ref=delivery_note_ref,
        received_by_id=current_user.id,
        status="ACCEPTED",
        notes=f"Bulk imported {len(accepted_rows)} lines"
    )
    db.add(grn)
    db.flush()

    for wh, item, qty, serials, cond in accepted_rows:
        # Create SerializedAsset records
        for sn in serials:
            asset = SerializedAsset(
                item_id=item.id,
                serial_number=sn,
                barcode=f"BC-{sn}",
                current_warehouse_id=wh.id,
                status="AVAILABLE",
                ownership="COMPANY",
                condition=cond
            )
            db.add(asset)

        # Update InventoryBalance
        bal = db.query(InventoryBalance).filter(
            InventoryBalance.item_id == item.id,
            InventoryBalance.warehouse_id == wh.id
        ).first()

        if not bal:
            bal = InventoryBalance(
                item_id=item.id,
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

        prev_qty = bal.quantity_on_hand
        bal.quantity_on_hand += qty
        bal.quantity_available += qty

        # Append to StockMovementLedger
        movement = StockMovementLedger(
            movement_type="RECEIVE",
            reference_type="BULK_IMPORT",
            reference_id=grn_number,
            item_id=item.id,
            serial_number=",".join(serials) if serials else None,
            from_warehouse_id=None,
            to_warehouse_id=wh.id,
            quantity=qty,
            balance_before=prev_qty,
            balance_after=bal.quantity_on_hand,
            performed_by_id=current_user.id,
            reason=f"Bulk receiving commit via {grn_number}"
        )
        db.add(movement)

    log_audit(db, current_user, "BULK_RECEIVE", "GoodsReceipt", grn_number, None, {"lines": len(accepted_rows)})
    db.commit()

    return {
        "status": "SUCCESS",
        "grn_number": grn_number,
        "total_rows": len(rows),
        "accepted_count": len(accepted_rows),
        "message": f"Successfully committed {len(accepted_rows)} equipment items with full receipt and audit ledger tracking."
    }
