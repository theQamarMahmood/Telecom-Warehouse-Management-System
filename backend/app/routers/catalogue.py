from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import EquipmentCategory, EquipmentItem, InventoryBalance, User
from app.schemas import CategoryCreate, CategoryOut, EquipmentItemCreate, EquipmentItemUpdate, EquipmentItemOut, WarehouseStockSummary
from app.auth import get_current_user
from app.rbac import require_roles
from app.audit_service import log_audit

router = APIRouter(prefix="/api/catalogue", tags=["Equipment Catalogue"])

@router.get("/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    categories = db.query(EquipmentCategory).all()
    res = []
    for c in categories:
        cnt = db.query(EquipmentItem).filter(EquipmentItem.category_id == c.id).count()
        res.append(CategoryOut(
            id=c.id,
            code=c.code,
            name=c.name,
            description=c.description,
            item_count=cnt
        ))
    return res

@router.post("/categories", response_model=CategoryOut)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER"])(current_user)
    if db.query(EquipmentCategory).filter(EquipmentCategory.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Category code already exists")
    cat = EquipmentCategory(**payload.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    log_audit(db, current_user, "CREATE", "EquipmentCategory", str(cat.id), None, payload.model_dump())
    db.commit()
    return CategoryOut(id=cat.id, code=cat.code, name=cat.name, description=cat.description, item_count=0)

def build_item_out(db: Session, item: EquipmentItem, include_warehouses: bool = True) -> EquipmentItemOut:
    bal_stats = db.query(
        func.sum(InventoryBalance.quantity_on_hand),
        func.sum(InventoryBalance.quantity_available),
        func.sum(InventoryBalance.quantity_reserved),
        func.sum(InventoryBalance.quantity_borrowed),
        func.sum(InventoryBalance.quantity_in_transit),
        func.sum(InventoryBalance.quantity_damaged),
        func.sum(InventoryBalance.quantity_quarantined)
    ).filter(InventoryBalance.item_id == item.id).first()

    on_hand = float(bal_stats[0] or 0.0)
    avail = float(bal_stats[1] or 0.0)
    res = float(bal_stats[2] or 0.0)
    borrowed = float(bal_stats[3] or 0.0)
    in_transit = float(bal_stats[4] or 0.0)
    damaged = float(bal_stats[5] or 0.0)
    quarantined = float(bal_stats[6] or 0.0)

    warehouses_list = []
    if include_warehouses:
        bals = db.query(InventoryBalance).filter(InventoryBalance.item_id == item.id).all()
        for b in bals:
            wh = b.warehouse
            br = wh.branch if wh else None
            cl = br.cluster if br else None
            warehouses_list.append(WarehouseStockSummary(
                warehouse_id=b.warehouse_id,
                warehouse_name=wh.name if wh else "Unknown",
                warehouse_code=wh.code if wh else "",
                branch_name=br.name if br else "Unknown",
                cluster_name=cl.name if cl else "Unknown",
                location_code=b.location.location_code if b.location else None,
                quantity_on_hand=b.quantity_on_hand,
                quantity_available=b.quantity_available,
                quantity_reserved=b.quantity_reserved,
                quantity_borrowed=b.quantity_borrowed,
                quantity_in_transit=b.quantity_in_transit,
                quantity_damaged=b.quantity_damaged,
                quantity_quarantined=b.quantity_quarantined
            ))

    return EquipmentItemOut(
        id=item.id,
        category_id=item.category_id,
        sku=item.sku,
        name=item.name,
        subcategory=item.subcategory,
        manufacturer=item.manufacturer,
        model_number=item.model_number,
        part_number=item.part_number,
        description=item.description,
        technical_specs=item.technical_specs,
        tracking_mode=item.tracking_mode,
        unit_of_measure=item.unit_of_measure,
        barcode=item.barcode,
        unit_cost=item.unit_cost,
        currency=item.currency,
        min_stock_level=item.min_stock_level,
        max_stock_level=item.max_stock_level,
        reorder_threshold=item.reorder_threshold,
        image_url=item.image_url,
        equipment_type=item.equipment_type,
        frequency_band=item.frequency_band,
        power_consumption_w=item.power_consumption_w,
        weight_kg=item.weight_kg,
        dimensions=item.dimensions,
        warranty_months=item.warranty_months,
        is_active=item.is_active,
        category_name=item.category.name if item.category else None,
        total_on_hand=on_hand,
        total_available=avail,
        total_reserved=res,
        total_borrowed=borrowed,
        total_in_transit=in_transit,
        total_damaged=damaged,
        total_quarantined=quarantined,
        warehouses_stock=warehouses_list,
        created_at=item.created_at
    )

@router.get("/items", response_model=List[EquipmentItemOut])
def get_items(
    category_id: Optional[int] = None,
    tracking_mode: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(EquipmentItem)
    if category_id:
        query = query.filter(EquipmentItem.category_id == category_id)
    if tracking_mode:
        query = query.filter(EquipmentItem.tracking_mode == tracking_mode)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (EquipmentItem.name.ilike(s)) |
            (EquipmentItem.sku.ilike(s)) |
            (EquipmentItem.manufacturer.ilike(s)) |
            (EquipmentItem.model_number.ilike(s)) |
            (EquipmentItem.barcode.ilike(s)) |
            (EquipmentItem.equipment_type.ilike(s))
        )

    items = query.order_by(EquipmentItem.name).all()
    return [build_item_out(db, it, include_warehouses=True) for it in items]

@router.get("/items/{item_id}", response_model=EquipmentItemOut)
def get_item_by_id(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(EquipmentItem).filter(EquipmentItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Equipment item not found")
    return build_item_out(db, item, include_warehouses=True)

@router.post("/items", response_model=EquipmentItemOut)
def create_item(payload: EquipmentItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER"])(current_user)
    if db.query(EquipmentItem).filter(EquipmentItem.sku == payload.sku).first():
        raise HTTPException(status_code=400, detail="SKU already exists")

    item = EquipmentItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    log_audit(db, current_user, "CREATE", "EquipmentItem", str(item.id), None, payload.model_dump())
    db.commit()

    return build_item_out(db, item, include_warehouses=False)

@router.put("/items/{item_id}", response_model=EquipmentItemOut)
def update_item(item_id: int, payload: EquipmentItemUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER"])(current_user)
    item = db.query(EquipmentItem).filter(EquipmentItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Equipment item not found")

    old_data = {"name": item.name, "image_url": item.image_url, "unit_cost": item.unit_cost}
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(item, field, val)

    db.commit()
    db.refresh(item)
    log_audit(db, current_user, "UPDATE", "EquipmentItem", str(item.id), old_data, update_data)
    db.commit()

    return build_item_out(db, item, include_warehouses=True)
