from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Region, Cluster, Branch, Warehouse, StorageLocation, User
from app.schemas import (
    RegionCreate, RegionOut, ClusterCreate, ClusterOut,
    BranchCreate, BranchOut, WarehouseCreate, WarehouseOut,
    StorageLocationCreate, StorageLocationOut
)
from app.auth import get_current_user
from app.rbac import require_roles, get_user_accessible_branch_ids
from app.audit_service import log_audit

router = APIRouter(prefix="/api/hierarchy", tags=["Organizational Hierarchy"])

# --- REGIONS ---
@router.get("/regions", response_model=List[RegionOut])
def get_regions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Region).order_by(Region.code).all()

@router.post("/regions", response_model=RegionOut)
def create_region(payload: RegionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_roles(["SUPER_ADMIN"])(current_user)
    if db.query(Region).filter(Region.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Region code already exists")
    region = Region(**payload.model_dump())
    db.add(region)
    db.commit()
    db.refresh(region)
    log_audit(db, current_user, "CREATE", "Region", str(region.id), None, payload.model_dump())
    db.commit()
    return region

# --- CLUSTERS ---
@router.get("/clusters", response_model=List[ClusterOut])
def get_clusters(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    clusters = db.query(Cluster).all()
    res = []
    for c in clusters:
        res.append(ClusterOut(
            id=c.id,
            region_id=c.region_id,
            code=c.code,
            name=c.name,
            cluster_owner_name=c.cluster_owner_name,
            description=c.description,
            created_at=c.created_at,
            region_name=c.region.name if c.region else None
        ))
    return res

@router.post("/clusters", response_model=ClusterOut)
def create_cluster(payload: ClusterCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_roles(["SUPER_ADMIN"])(current_user)
    if db.query(Cluster).filter(Cluster.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Cluster code already exists")
    cluster = Cluster(**payload.model_dump())
    db.add(cluster)
    db.commit()
    db.refresh(cluster)
    log_audit(db, current_user, "CREATE", "Cluster", str(cluster.id), None, payload.model_dump())
    db.commit()
    return ClusterOut(
        id=cluster.id,
        region_id=cluster.region_id,
        code=cluster.code,
        name=cluster.name,
        cluster_owner_name=cluster.cluster_owner_name,
        description=cluster.description,
        created_at=cluster.created_at,
        region_name=cluster.region.name if cluster.region else None
    )

# --- BRANCHES ---
@router.get("/branches", response_model=List[BranchOut])
def get_branches(
    cluster_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Branch)
    accessible_branch_ids = get_user_accessible_branch_ids(db, current_user)
    if accessible_branch_ids is not None:
        query = query.filter(Branch.id.in_(accessible_branch_ids))

    if cluster_id:
        query = query.filter(Branch.cluster_id == cluster_id)

    branches = query.order_by(Branch.name).all()
    res = []
    for b in branches:
        res.append(BranchOut(
            id=b.id,
            cluster_id=b.cluster_id,
            code=b.code,
            name=b.name,
            address=b.address,
            manager_name=b.manager_name,
            manager_email=b.manager_email,
            phone=b.phone,
            is_active=b.is_active,
            created_at=b.created_at,
            cluster_name=b.cluster.name if b.cluster else None
        ))
    return res

@router.post("/branches", response_model=BranchOut)
def create_branch(payload: BranchCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_roles(["SUPER_ADMIN"])(current_user)
    if db.query(Branch).filter(Branch.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Branch code already exists")
    branch = Branch(**payload.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)

    # Automatically create default main warehouse for this branch
    wh = Warehouse(
        branch_id=branch.id,
        code=f"WH-{branch.code}",
        name=f"{branch.name} Central Depot",
        warehouse_type="MAIN",
        address=branch.address,
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)

    # Default storage locations
    default_loc = StorageLocation(
        warehouse_id=wh.id,
        zone="Zone A (RAN Equipment)",
        rack="R01",
        shelf="S01",
        bin="B01",
        location_code=f"{wh.code}-ZA-R01-S01-B01",
        description="General Inbound Staging"
    )
    db.add(default_loc)
    db.commit()

    log_audit(db, current_user, "CREATE", "Branch", str(branch.id), None, payload.model_dump())
    db.commit()

    return BranchOut(
        id=branch.id,
        cluster_id=branch.cluster_id,
        code=branch.code,
        name=branch.name,
        address=branch.address,
        manager_name=branch.manager_name,
        manager_email=branch.manager_email,
        phone=branch.phone,
        is_active=branch.is_active,
        created_at=branch.created_at,
        cluster_name=branch.cluster.name if branch.cluster else None
    )

@router.put("/branches/{branch_id}/status")
def toggle_branch_status(
    branch_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN"])(current_user)
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Non-destructive: Preserve all historical transactions!
    branch.is_active = is_active
    log_audit(db, current_user, "UPDATE_STATUS", "Branch", str(branch_id), None, {"is_active": is_active})
    db.commit()
    return {"message": f"Branch '{branch.name}' status set to {'active' if is_active else 'inactive'}. Historical data preserved."}

# --- WAREHOUSES ---
@router.get("/warehouses", response_model=List[WarehouseOut])
def get_warehouses(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Warehouse)
    accessible_branch_ids = get_user_accessible_branch_ids(db, current_user)
    if accessible_branch_ids is not None:
        query = query.filter(Warehouse.branch_id.in_(accessible_branch_ids))

    if branch_id:
        query = query.filter(Warehouse.branch_id == branch_id)

    warehouses = query.order_by(Warehouse.name).all()
    res = []
    for w in warehouses:
        res.append(WarehouseOut(
            id=w.id,
            branch_id=w.branch_id,
            code=w.code,
            name=w.name,
            warehouse_type=w.warehouse_type,
            address=w.address,
            is_active=w.is_active,
            created_at=w.created_at,
            branch_name=w.branch.name if w.branch else None
        ))
    return res

@router.post("/warehouses", response_model=WarehouseOut)
def create_warehouse(payload: WarehouseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER"])(current_user)
    if db.query(Warehouse).filter(Warehouse.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Warehouse code already exists")
    wh = Warehouse(**payload.model_dump())
    db.add(wh)
    db.commit()
    db.refresh(wh)

    # Add default rack/bin
    loc = StorageLocation(
        warehouse_id=wh.id,
        zone="Zone A",
        rack="R01",
        shelf="S01",
        bin="B01",
        location_code=f"{wh.code}-ZA-R01-S01-B01",
        description="General Storage"
    )
    db.add(loc)
    db.commit()

    log_audit(db, current_user, "CREATE", "Warehouse", str(wh.id), None, payload.model_dump())
    db.commit()

    return WarehouseOut(
        id=wh.id,
        branch_id=wh.branch_id,
        code=wh.code,
        name=wh.name,
        warehouse_type=wh.warehouse_type,
        address=wh.address,
        is_active=wh.is_active,
        created_at=wh.created_at,
        branch_name=wh.branch.name if wh.branch else None
    )

# --- STORAGE LOCATIONS (ZONES, RACKS, SHELVES, BINS) ---
@router.get("/locations", response_model=List[StorageLocationOut])
def get_storage_locations(
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(StorageLocation)
    if warehouse_id:
        query = query.filter(StorageLocation.warehouse_id == warehouse_id)
    locs = query.all()
    res = []
    for l in locs:
        res.append(StorageLocationOut(
            id=l.id,
            warehouse_id=l.warehouse_id,
            zone=l.zone,
            rack=l.rack,
            shelf=l.shelf,
            bin=l.bin,
            location_code=l.location_code,
            description=l.description,
            warehouse_name=l.warehouse.name if l.warehouse else None
        ))
    return res

@router.post("/locations", response_model=StorageLocationOut)
def create_storage_location(payload: StorageLocationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_OFFICER"])(current_user)
    wh = db.query(Warehouse).filter(Warehouse.id == payload.warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    loc_code = f"{wh.code}-{payload.zone.replace(' ', '_')}-{payload.rack}-{payload.shelf}-{payload.bin}"
    if db.query(StorageLocation).filter(StorageLocation.location_code == loc_code).first():
        raise HTTPException(status_code=400, detail=f"Location code {loc_code} already exists")

    loc = StorageLocation(
        warehouse_id=payload.warehouse_id,
        zone=payload.zone,
        rack=payload.rack,
        shelf=payload.shelf,
        bin=payload.bin,
        location_code=loc_code,
        description=payload.description
    )
    db.add(loc)
    db.commit()
    db.refresh(loc)
    log_audit(db, current_user, "CREATE", "StorageLocation", str(loc.id), None, {"location_code": loc_code})
    db.commit()

    return StorageLocationOut(
        id=loc.id,
        warehouse_id=loc.warehouse_id,
        zone=loc.zone,
        rack=loc.rack,
        shelf=loc.shelf,
        bin=loc.bin,
        location_code=loc.location_code,
        description=loc.description,
        warehouse_name=wh.name
    )
