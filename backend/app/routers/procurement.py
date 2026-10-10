import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Supplier, PurchaseOrder, PurchaseOrderItem, EquipmentItem, Warehouse, User
from app.schemas import (
    SupplierCreate, SupplierOut, PurchaseOrderCreate, PurchaseOrderOut
)
from app.auth import get_current_user
from app.rbac import require_roles
from app.audit_service import log_audit

router = APIRouter(prefix="/api/procurement", tags=["Procurement & Suppliers"])

@router.get("/suppliers", response_model=List[SupplierOut])
def get_suppliers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Supplier).all()

@router.post("/suppliers", response_model=SupplierOut)
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_roles(["SUPER_ADMIN", "PROCUREMENT_OFFICER"])(current_user)
    if db.query(Supplier).filter(Supplier.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Supplier code already exists")
    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    log_audit(db, current_user, "CREATE", "Supplier", str(supplier.id), None, payload.model_dump())
    db.commit()
    return supplier

@router.get("/purchase-orders", response_model=List[PurchaseOrderOut])
def list_purchase_orders(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(PurchaseOrder)
    if status_filter:
        query = query.filter(PurchaseOrder.status == status_filter)

    pos = query.order_by(PurchaseOrder.id.desc()).all()
    res = []
    for po in pos:
        items_data = []
        for it in po.items:
            items_data.append({
                "item_id": it.item_id,
                "item_name": it.item.name if it.item else "",
                "sku": it.item.sku if it.item else "",
                "ordered_quantity": it.ordered_quantity,
                "received_quantity": it.received_quantity,
                "unit_price": it.unit_price,
            })

        res.append(PurchaseOrderOut(
            id=po.id,
            po_number=po.po_number,
            supplier_id=po.supplier_id,
            supplier_name=po.supplier.name if po.supplier else "",
            target_warehouse_id=po.target_warehouse_id,
            target_warehouse_name=po.warehouse.name if po.warehouse else "",
            order_date=po.order_date,
            expected_delivery_date=po.expected_delivery_date,
            total_amount=po.total_amount,
            status=po.status,
            items=items_data
        ))
    return res

@router.post("/purchase-orders", response_model=PurchaseOrderOut)
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "PROCUREMENT_OFFICER"])(current_user)
    supplier = db.query(Supplier).filter(Supplier.id == payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    wh = db.query(Warehouse).filter(Warehouse.id == payload.target_warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    po_number = f"PO-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:5].upper()}"
    total = sum(i.ordered_quantity * i.unit_price for i in payload.items)

    po = PurchaseOrder(
        po_number=po_number,
        supplier_id=supplier.id,
        target_warehouse_id=wh.id,
        order_date=datetime.utcnow(),
        expected_delivery_date=payload.expected_delivery_date,
        total_amount=total,
        status="SUBMITTED",
        notes=payload.notes
    )
    db.add(po)
    db.flush()

    for it in payload.items:
        po_item = PurchaseOrderItem(
            po_id=po.id,
            item_id=it.item_id,
            ordered_quantity=it.ordered_quantity,
            received_quantity=0.0,
            unit_price=it.unit_price
        )
        db.add(po_item)

    log_audit(db, current_user, "CREATE_PO", "PurchaseOrder", po.po_number, None, {"supplier": supplier.name, "amount": total})
    db.commit()
    db.refresh(po)

    return list_purchase_orders(db=db, current_user=current_user)[0]

@router.post("/purchase-orders/{po_id}/approve")
def approve_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "FINANCE_CONTROLLER", "WAREHOUSE_MANAGER"])(current_user)
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    po.status = "APPROVED"
    log_audit(db, current_user, "APPROVE_PO", "PurchaseOrder", po.po_number, None, {"approver": current_user.username})
    db.commit()
    return {"message": f"PO {po.po_number} approved"}
