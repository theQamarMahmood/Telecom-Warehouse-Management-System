import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    ExpansionProject, ProjectBOMItem, InventoryBalance, SerializedAsset,
    StockMovementLedger, EquipmentItem, Warehouse, Cluster, User
)
from app.schemas import ProjectCreate, ProjectAllocateInput, ProjectOut
from app.auth import get_current_user
from app.rbac import require_roles
from app.audit_service import log_audit

router = APIRouter(prefix="/api/projects", tags=["Expansion Projects & Site Rollout"])

@router.get("", response_model=List[ProjectOut])
def list_projects(
    cluster_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ExpansionProject)
    if cluster_id:
        query = query.filter(ExpansionProject.target_cluster_id == cluster_id)
    if status_filter:
        query = query.filter(ExpansionProject.status == status_filter)

    projects = query.order_by(ExpansionProject.id.desc()).all()
    res = []
    for p in projects:
        bom_data = []
        for b in p.bom_items:
            bom_data.append({
                "item_id": b.item_id,
                "item_name": b.item.name if b.item else "",
                "sku": b.item.sku if b.item else "",
                "manufacturer": b.item.manufacturer if b.item else "",
                "tracking_mode": b.item.tracking_mode if b.item else "SERIALIZED",
                "required_quantity": b.required_quantity,
                "allocated_quantity": b.allocated_quantity,
                "dispatched_quantity": b.dispatched_quantity,
                "installed_quantity": b.installed_quantity
            })

        res.append(ProjectOut(
            id=p.id,
            project_code=p.project_code,
            name=p.name,
            target_cluster_id=p.target_cluster_id,
            cluster_name=p.cluster.name if p.cluster else "",
            site_id=p.site_id,
            project_type=p.project_type,
            priority=p.priority,
            status=p.status,
            budget=p.budget,
            manager_name=p.manager.full_name if p.manager else "Unassigned",
            created_at=p.created_at,
            bom_items=bom_data
        ))
    return res

@router.post("", response_model=ProjectOut)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "CLUSTER_OWNER", "BRANCH_MANAGER", "FIELD_ENGINEER"])(current_user)

    if db.query(ExpansionProject).filter(ExpansionProject.project_code == payload.project_code).first():
        raise HTTPException(status_code=400, detail="Project code already exists")

    cluster = db.query(Cluster).filter(Cluster.id == payload.target_cluster_id).first()
    if not cluster:
        raise HTTPException(status_code=404, detail="Target cluster not found")

    project = ExpansionProject(
        project_code=payload.project_code,
        name=payload.name,
        target_cluster_id=payload.target_cluster_id,
        site_id=payload.site_id,
        project_type=payload.project_type,
        priority=payload.priority,
        target_start_date=payload.target_start_date,
        target_completion_date=payload.target_completion_date,
        budget=payload.budget,
        notes=payload.notes,
        manager_id=current_user.id,
        status="PLANNING"
    )
    db.add(project)
    db.flush()

    for bom_in in payload.bom_items:
        item = db.query(EquipmentItem).filter(EquipmentItem.id == bom_in.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"BOM Item {bom_in.item_id} not found")
        bom_item = ProjectBOMItem(
            project_id=project.id,
            item_id=item.id,
            required_quantity=bom_in.required_quantity,
            allocated_quantity=0.0,
            dispatched_quantity=0.0,
            installed_quantity=0.0
        )
        db.add(bom_item)

    log_audit(db, current_user, "CREATE_PROJECT", "ExpansionProject", project.project_code, None, {"name": project.name, "cluster": cluster.name})
    db.commit()
    db.refresh(project)

    return list_projects(db=db, current_user=current_user)[0]

@router.post("/{project_id}/approve")
def approve_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "CLUSTER_OWNER", "BRANCH_MANAGER"])(current_user)
    project = db.query(ExpansionProject).filter(ExpansionProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.status = "APPROVED"
    log_audit(db, current_user, "APPROVE_PROJECT", "ExpansionProject", project.project_code, None, {"approver": current_user.username})
    db.commit()
    return {"message": f"Project {project.project_code} approved for equipment allocation"}

@router.post("/{project_id}/allocate")
def allocate_project_stock(
    project_id: int,
    payload: ProjectAllocateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(["SUPER_ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_OFFICER"])(current_user)
    project = db.query(ExpansionProject).filter(ExpansionProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status not in ["APPROVED", "ALLOCATED"]:
        raise HTTPException(status_code=400, detail=f"Project must be in APPROVED status before allocating stock. Current: {project.status}")

    wh = db.query(Warehouse).filter(Warehouse.id == payload.warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    for alloc in payload.allocations:
        item_id = alloc.get("item_id")
        qty = float(alloc.get("quantity", 0))
        serials = alloc.get("serial_numbers", [])

        bom_item = db.query(ProjectBOMItem).filter(
            ProjectBOMItem.project_id == project.id,
            ProjectBOMItem.item_id == item_id
        ).first()

        if not bom_item:
            raise HTTPException(status_code=400, detail=f"Item ID {item_id} is not part of project BOM")

        # ATOMIC CONCURRENCY CHECK: Validate stock availability at commit time
        bal = db.query(InventoryBalance).filter(
            InventoryBalance.item_id == item_id,
            InventoryBalance.warehouse_id == wh.id
        ).with_for_update().first() if "sqlite" not in str(db.bind.url) else db.query(InventoryBalance).filter(
            InventoryBalance.item_id == item_id,
            InventoryBalance.warehouse_id == wh.id
        ).first()

        if not bal or bal.quantity_available < qty:
            avail = bal.quantity_available if bal else 0.0
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stock allocation conflict! Item ID {item_id} has only {avail} units available, requested: {qty}. Cannot allocate twice."
            )

        # Check serialized units
        if serials:
            assets = db.query(SerializedAsset).filter(
                SerializedAsset.item_id == item_id,
                SerializedAsset.serial_number.in_(serials)
            ).all()

            if len(assets) != len(serials):
                raise HTTPException(status_code=404, detail="One or more specified serial numbers do not exist")

            for a in assets:
                if a.status != "AVAILABLE":
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Unit '{a.serial_number}' is already '{a.status}' and cannot be allocated to project {project.project_code}"
                    )
                a.status = "ALLOCATED"

        # Dedicate stock
        bal.quantity_available -= qty
        bal.quantity_reserved += qty
        bom_item.allocated_quantity += qty

        # Movement ledger
        movement = StockMovementLedger(
            movement_type="ALLOCATE",
            reference_type="PROJECT",
            reference_id=project.project_code,
            item_id=item_id,
            serial_number=",".join(serials) if serials else None,
            from_warehouse_id=wh.id,
            to_warehouse_id=None,
            quantity=qty,
            balance_before=bal.quantity_available + qty,
            balance_after=bal.quantity_available,
            performed_by_id=current_user.id,
            reason=f"Stock allocated to expansion project {project.project_code} ({project.name})"
        )
        db.add(movement)

    project.status = "ALLOCATED"
    log_audit(db, current_user, "ALLOCATE_PROJECT_STOCK", "ExpansionProject", project.project_code, None, {"warehouse": wh.name, "allocations": payload.allocations})
    db.commit()

    return {"message": f"Stock allocated to project {project.project_code} successfully"}
