from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.database import get_db
from app.models import (
    InventoryBalance, SerializedAsset, StockMovementLedger, EquipmentItem,
    Warehouse, Branch, Cluster, Region, EquipmentLoan, InterBranchTransfer,
    ExpansionProject, MaintenanceTicket, User
)
from app.schemas import DashboardMetrics
from app.auth import get_current_user
from app.rbac import get_user_accessible_branch_ids

router = APIRouter(prefix="/api/reports", tags=["Reports & Executive Analytics"])

@router.get("/dashboard-metrics", response_model=DashboardMetrics)
def get_dashboard_metrics(
    cluster_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InventoryBalance).join(Warehouse).join(Branch).join(EquipmentItem)
    accessible_branches = get_user_accessible_branch_ids(db, current_user)
    if accessible_branches is not None:
        query = query.filter(Branch.id.in_(accessible_branches))

    if cluster_id:
        query = query.filter(Branch.cluster_id == cluster_id)
    if branch_id:
        query = query.filter(Branch.id == branch_id)
    if warehouse_id:
        query = query.filter(Warehouse.id == warehouse_id)

    balances = query.all()

    total_skus = len(set(b.item_id for b in balances))
    total_avail = sum(b.quantity_available for b in balances)
    total_res = sum(b.quantity_reserved for b in balances)
    total_borrowed = sum(b.quantity_borrowed for b in balances)
    total_transit = sum(b.quantity_in_transit for b in balances)
    total_damaged = sum(b.quantity_damaged for b in balances)
    total_quar = sum(b.quantity_quarantined for b in balances)
    total_on_hand = sum(b.quantity_on_hand for b in balances) + total_transit

    # Valuation is visible only to SUPER_ADMIN, FINANCE_CONTROLLER, WAREHOUSE_MANAGER, CLUSTER_OWNER
    can_view_valuation = current_user.role in ["SUPER_ADMIN", "FINANCE_CONTROLLER", "WAREHOUSE_MANAGER", "CLUSTER_OWNER"]
    total_valuation = sum(b.quantity_on_hand * b.item.unit_cost for b in balances) if can_view_valuation else None

    # Alerts & pending
    now = datetime.utcnow()
    overdue_loans = db.query(EquipmentLoan).filter(
        EquipmentLoan.status == "ISSUED",
        EquipmentLoan.expected_return_date < now
    ).count()

    pending_transfers = db.query(InterBranchTransfer).filter(
        InterBranchTransfer.status.in_(["SUBMITTED", "IN_TRANSIT"])
    ).count()

    open_repairs = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.status.in_(["REPORTED", "IN_REPAIR", "AWAITING_PARTS"])
    ).count()

    active_projects = db.query(ExpansionProject).filter(
        ExpansionProject.status.in_(["PLANNING", "APPROVED", "ALLOCATED", "DISPATCHED"])
    ).count()

    # Cluster breakdown
    clusters = db.query(Cluster).all()
    clusters_breakdown = []
    for cl in clusters:
        cl_bals = db.query(InventoryBalance).join(Warehouse).join(Branch).filter(Branch.cluster_id == cl.id).all()
        cl_qty = sum(cb.quantity_on_hand for cb in cl_bals)
        cl_val = sum(cb.quantity_on_hand * cb.item.unit_cost for cb in cl_bals) if can_view_valuation else 0
        clusters_breakdown.append({
            "cluster_id": cl.id,
            "cluster_name": cl.name,
            "cluster_code": cl.code,
            "units_tracked": cl_qty,
            "valuation": cl_val,
            "branches_count": len(cl.branches)
        })

    # Categories breakdown
    cats_breakdown = []
    all_items = db.query(EquipmentItem).all()
    from collections import defaultdict
    cat_counts = defaultdict(float)
    for b in balances:
        cat_name = b.item.category.name if b.item.category else "Other"
        cat_counts[cat_name] += b.quantity_on_hand
    for k, v in cat_counts.items():
        cats_breakdown.append({"category": k, "units": v})

    # Recent movements
    recent_m = db.query(StockMovementLedger).order_by(StockMovementLedger.id.desc()).limit(8).all()
    movements_list = []
    for m in recent_m:
        movements_list.append({
            "id": m.id,
            "type": m.movement_type,
            "item_name": m.item.name if m.item else "Unknown",
            "quantity": m.quantity,
            "ref": m.reference_id,
            "time": m.created_at.strftime("%Y-%m-%d %H:%M"),
            "user": m.user.full_name if m.user else "System"
        })

    # Branch stock comparison: Shortage (< min_stock) vs Excess (> max_stock)
    branches = db.query(Branch).all()
    shortage_branches = []
    excess_branches = []
    for br in branches:
        br_bals = db.query(InventoryBalance).join(Warehouse).filter(Warehouse.branch_id == br.id).all()
        shortages = 0
        excess = 0
        for bb in br_bals:
            if bb.quantity_available < bb.item.min_stock_level:
                shortages += 1
            if bb.quantity_on_hand > bb.item.max_stock_level:
                excess += 1
        if shortages > 0:
            shortage_branches.append({"branch_name": br.name, "branch_code": br.code, "shortage_items_count": shortages})
        if excess > 0:
            excess_branches.append({"branch_name": br.name, "branch_code": br.code, "excess_items_count": excess})

    low_stock_count = sum(1 for b in balances if b.quantity_available <= b.item.reorder_threshold)

    return DashboardMetrics(
        total_skus=total_skus,
        total_units_tracked=total_on_hand,
        total_inventory_value=total_valuation,
        units_available=total_avail,
        units_reserved=total_res,
        units_borrowed=total_borrowed,
        units_in_transit=total_transit,
        units_damaged=total_damaged,
        units_quarantined=total_quar,
        overdue_loans_count=overdue_loans,
        pending_approvals_count=overdue_loans + pending_transfers, # composite approval tasks
        pending_transfers_count=pending_transfers,
        low_stock_alerts_count=low_stock_count,
        active_projects_count=active_projects,
        open_repairs_count=open_repairs,
        clusters_breakdown=clusters_breakdown,
        categories_breakdown=cats_breakdown,
        recent_movements=movements_list,
        shortage_branches=shortage_branches,
        excess_branches=excess_branches
    )

@router.get("/branch-comparison")
def branch_stock_comparison(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    branches = db.query(Branch).all()
    res = []
    for b in branches:
        bals = db.query(InventoryBalance).join(Warehouse).filter(Warehouse.branch_id == b.id).all()
        units = sum(x.quantity_on_hand for x in bals)
        avail = sum(x.quantity_available for x in bals)
        damaged = sum(x.quantity_damaged for x in bals)
        val = sum(x.quantity_on_hand * x.item.unit_cost for x in bals)
        res.append({
            "branch_id": b.id,
            "branch_name": b.name,
            "branch_code": b.code,
            "cluster_name": b.cluster.name if b.cluster else "",
            "total_units": units,
            "available_units": avail,
            "damaged_units": damaged,
            "valuation": val
        })
    return res

@router.get("/chain-of-custody/{serial_number}")
def get_asset_chain_of_custody(
    serial_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset = db.query(SerializedAsset).filter(SerializedAsset.serial_number == serial_number).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Serial number not found")

    movements = db.query(StockMovementLedger).filter(
        StockMovementLedger.serial_number.ilike(f"%{serial_number}%")
    ).order_by(StockMovementLedger.created_at.asc()).all()

    trail = []
    for m in movements:
        from_wh = db.query(Warehouse).filter(Warehouse.id == m.from_warehouse_id).first() if m.from_warehouse_id else None
        to_wh = db.query(Warehouse).filter(Warehouse.id == m.to_warehouse_id).first() if m.to_warehouse_id else None
        trail.append({
            "timestamp": m.created_at,
            "action": m.movement_type,
            "reference": m.reference_id,
            "from_warehouse": from_wh.name if from_wh else "Supplier / External",
            "to_warehouse": to_wh.name if to_wh else "External / Site / Borrower",
            "performed_by": m.user.full_name if m.user else "System",
            "notes": m.reason
        })

    return {
        "serial_number": asset.serial_number,
        "item_name": asset.item.name,
        "sku": asset.item.sku,
        "model": asset.item.model_number,
        "current_status": asset.status,
        "current_warehouse": asset.warehouse.name if asset.warehouse else "Site / In Transit",
        "current_location": asset.location.location_code if asset.location else "N/A",
        "condition": asset.condition,
        "ownership": asset.ownership,
        "movement_history": trail
    }
