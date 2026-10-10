from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import (
    InventoryBalance, SerializedAsset, StockMovementLedger,
    EquipmentItem, Warehouse, Branch, Cluster, User
)
from app.schemas import InventoryBalanceOut, SerializedAssetOut, StockMovementLedgerOut
from app.auth import get_current_user
from app.rbac import get_user_accessible_branch_ids

router = APIRouter(prefix="/api/inventory", tags=["Inventory & Serialized Assets"])

@router.get("/balances", response_model=List[InventoryBalanceOut])
def get_inventory_balances(
    cluster_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    item_id: Optional[int] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InventoryBalance).join(Warehouse).join(Branch).join(EquipmentItem)
    
    # Scoping check
    accessible_branch_ids = get_user_accessible_branch_ids(db, current_user)
    if accessible_branch_ids is not None:
        query = query.filter(Branch.id.in_(accessible_branch_ids))

    if cluster_id:
        query = query.filter(Branch.cluster_id == cluster_id)
    if branch_id:
        query = query.filter(Branch.id == branch_id)
    if warehouse_id:
        query = query.filter(Warehouse.id == warehouse_id)
    if item_id:
        query = query.filter(EquipmentItem.id == item_id)
    if category_id:
        query = query.filter(EquipmentItem.category_id == category_id)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                EquipmentItem.name.ilike(s),
                EquipmentItem.sku.ilike(s),
                EquipmentItem.model_number.ilike(s),
                Warehouse.name.ilike(s)
            )
        )

    balances = query.all()
    res = []
    for b in balances:
        res.append(InventoryBalanceOut(
            id=b.id,
            item_id=b.item_id,
            item_name=b.item.name,
            sku=b.item.sku,
            manufacturer=b.item.manufacturer,
            model_number=b.item.model_number,
            category_name=b.item.category.name if b.item.category else "Uncategorized",
            tracking_mode=b.item.tracking_mode,
            unit_cost=b.item.unit_cost,
            warehouse_id=b.warehouse_id,
            warehouse_name=b.warehouse.name,
            branch_name=b.warehouse.branch.name if b.warehouse and b.warehouse.branch else "",
            cluster_name=b.warehouse.branch.cluster.name if b.warehouse and b.warehouse.branch and b.warehouse.branch.cluster else "",
            location_id=b.location_id,
            location_code=b.location.location_code if b.location else "DEFAULT_BIN",
            quantity_on_hand=b.quantity_on_hand,
            quantity_available=b.quantity_available,
            quantity_reserved=b.quantity_reserved,
            quantity_borrowed=b.quantity_borrowed,
            quantity_in_transit=b.quantity_in_transit,
            quantity_damaged=b.quantity_damaged,
            quantity_quarantined=b.quantity_quarantined,
            last_updated=b.last_updated
        ))
    return res

@router.get("/assets", response_model=List[SerializedAssetOut])
def get_serialized_assets(
    item_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    status: Optional[str] = None,
    serial_number: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SerializedAsset).join(EquipmentItem)
    
    # Scoping
    accessible_branch_ids = get_user_accessible_branch_ids(db, current_user)
    if accessible_branch_ids is not None:
        query = query.join(Warehouse, SerializedAsset.current_warehouse_id == Warehouse.id, isouter=True)
        query = query.filter(
            or_(
                SerializedAsset.current_warehouse_id == None,
                Warehouse.branch_id.in_(accessible_branch_ids)
            )
        )

    if item_id:
        query = query.filter(SerializedAsset.item_id == item_id)
    if warehouse_id:
        query = query.filter(SerializedAsset.current_warehouse_id == warehouse_id)
    if status:
        query = query.filter(SerializedAsset.status == status)
    if serial_number:
        query = query.filter(SerializedAsset.serial_number == serial_number)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                SerializedAsset.serial_number.ilike(s),
                SerializedAsset.barcode.ilike(s),
                EquipmentItem.name.ilike(s),
                EquipmentItem.sku.ilike(s)
            )
        )

    assets = query.order_by(SerializedAsset.id.desc()).limit(500).all()
    res = []
    for a in assets:
        res.append(SerializedAssetOut(
            id=a.id,
            item_id=a.item_id,
            item_name=a.item.name,
            sku=a.item.sku,
            manufacturer=a.item.manufacturer,
            model_number=a.item.model_number,
            serial_number=a.serial_number,
            barcode=a.barcode,
            current_warehouse_id=a.current_warehouse_id,
            warehouse_name=a.warehouse.name if a.warehouse else "Site / In Transit",
            location_code=a.location.location_code if a.location else None,
            status=a.status,
            ownership=a.ownership,
            condition=a.condition,
            warranty_expiry=a.warranty_expiry,
            created_at=a.created_at
        ))
    return res

@router.get("/movements", response_model=List[StockMovementLedgerOut])
def get_stock_movements(
    item_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    movement_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    serial_number: Optional[str] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(StockMovementLedger).join(EquipmentItem)
    if item_id:
        query = query.filter(StockMovementLedger.item_id == item_id)
    if warehouse_id:
        query = query.filter(
            or_(
                StockMovementLedger.from_warehouse_id == warehouse_id,
                StockMovementLedger.to_warehouse_id == warehouse_id
            )
        )
    if movement_type:
        query = query.filter(StockMovementLedger.movement_type == movement_type)
    if reference_id:
        query = query.filter(StockMovementLedger.reference_id == reference_id)
    if serial_number:
        query = query.filter(StockMovementLedger.serial_number == serial_number)

    movements = query.order_by(StockMovementLedger.id.desc()).limit(limit).all()
    res = []
    for m in movements:
        from_wh = db.query(Warehouse).filter(Warehouse.id == m.from_warehouse_id).first() if m.from_warehouse_id else None
        to_wh = db.query(Warehouse).filter(Warehouse.id == m.to_warehouse_id).first() if m.to_warehouse_id else None
        res.append(StockMovementLedgerOut(
            id=m.id,
            movement_type=m.movement_type,
            reference_type=m.reference_type,
            reference_id=m.reference_id,
            item_id=m.item_id,
            item_name=m.item.name,
            sku=m.item.sku,
            serial_number=m.serial_number,
            from_warehouse_id=m.from_warehouse_id,
            from_warehouse_name=from_wh.name if from_wh else None,
            to_warehouse_id=m.to_warehouse_id,
            to_warehouse_name=to_wh.name if to_wh else None,
            quantity=m.quantity,
            balance_before=m.balance_before,
            balance_after=m.balance_after,
            performed_by_name=m.user.full_name if m.user else "System",
            reason=m.reason,
            created_at=m.created_at
        ))
    return res

@router.get("/global-search")
def global_search(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    s = f"%{q}%"
    # Search items
    items = db.query(EquipmentItem).filter(
        or_(
            EquipmentItem.name.ilike(s),
            EquipmentItem.sku.ilike(s),
            EquipmentItem.model_number.ilike(s),
            EquipmentItem.barcode.ilike(s)
        )
    ).limit(5).all()

    # Search serials
    serials = db.query(SerializedAsset).filter(
        or_(
            SerializedAsset.serial_number.ilike(s),
            SerializedAsset.barcode.ilike(s)
        )
    ).limit(5).all()

    # Search warehouses / branches
    branches = db.query(Branch).filter(or_(Branch.name.ilike(s), Branch.code.ilike(s))).limit(5).all()

    return {
        "items": [{"id": i.id, "name": i.name, "sku": i.sku, "model": i.model_number} for i in items],
        "serials": [{"id": a.id, "serial_number": a.serial_number, "status": a.status, "item": a.item.name} for a in serials],
        "branches": [{"id": b.id, "name": b.name, "code": b.code} for b in branches]
    }
