from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models import User, Branch, Warehouse, UserBranchScope, UserClusterScope

ROLES = {
    "SUPER_ADMIN": "Super Administrator with full company-wide access",
    "WAREHOUSE_MANAGER": "Warehouse Manager with operational and approval authority",
    "CLUSTER_OWNER": "Regional / Cluster Owner overseeing multiple branches in assigned clusters",
    "BRANCH_MANAGER": "Branch Manager overseeing specific branch operations",
    "WAREHOUSE_OFFICER": "Warehouse Officer for receiving, dispatching, loans, and inventory counts",
    "FIELD_ENGINEER": "Telecom Field Engineer for rollout requests, installations, and returns",
    "PROCUREMENT_OFFICER": "Procurement Officer for POs and supplier management",
    "FINANCE_CONTROLLER": "Finance / Inventory Controller for valuation and cost analysis",
    "AUDITOR": "Auditor with read-only audit and compliance inspection rights"
}

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User):
        if current_user.role == "SUPER_ADMIN":
            return current_user
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}. Your role: {current_user.role}"
            )
        return current_user
    return role_checker

def get_user_accessible_branch_ids(db: Session, user: User) -> Optional[List[int]]:
    """
    Returns None if user has company-wide access (SUPER_ADMIN, AUDITOR, FINANCE_CONTROLLER).
    Returns list of branch IDs if user is scoped by cluster or specific branches.
    """
    if user.role in ["SUPER_ADMIN", "AUDITOR", "FINANCE_CONTROLLER"]:
        return None  # Unrestricted company-wide access

    accessible_branch_ids = set()

    # If Cluster Owner, get all branches belonging to assigned clusters
    if user.role == "CLUSTER_OWNER":
        cluster_scopes = db.query(UserClusterScope).filter(UserClusterScope.user_id == user.id).all()
        cluster_ids = [cs.cluster_id for cs in cluster_scopes]
        if cluster_ids:
            branches = db.query(Branch).filter(Branch.cluster_id.in_(cluster_ids)).all()
            for b in branches:
                accessible_branch_ids.add(b.id)

    # Branch-specific scopes
    branch_scopes = db.query(UserBranchScope).filter(UserBranchScope.user_id == user.id).all()
    for bs in branch_scopes:
        accessible_branch_ids.add(bs.branch_id)

    return list(accessible_branch_ids)

def verify_branch_access(db: Session, user: User, branch_id: int):
    """
    Enforces server-side data isolation. Raises 403 if user cannot access this branch.
    """
    accessible_branches = get_user_accessible_branch_ids(db, user)
    if accessible_branches is not None and branch_id not in accessible_branches:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied to Branch ID {branch_id}. You are restricted to your assigned organizational scope."
        )

def verify_warehouse_access(db: Session, user: User, warehouse_id: int):
    accessible_branches = get_user_accessible_branch_ids(db, user)
    if accessible_branches is None:
        return
    wh = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    if wh.branch_id not in accessible_branches:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied to Warehouse '{wh.name}'. Belongs to unassigned Branch ID {wh.branch_id}."
        )
