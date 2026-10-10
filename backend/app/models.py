from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base

# --- RBAC & USERS ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    department = Column(String(100), default="Telecom Operations")
    phone = Column(String(30), nullable=True)
    role = Column(String(50), nullable=False, default="WAREHOUSE_OFFICER")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Scoping relations
    branch_scopes = relationship("UserBranchScope", back_populates="user", cascade="all, delete-orphan")
    cluster_scopes = relationship("UserClusterScope", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")

class UserBranchScope(Base):
    __tablename__ = "user_branch_scopes"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="branch_scopes")
    branch = relationship("Branch")

class UserClusterScope(Base):
    __tablename__ = "user_cluster_scopes"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    cluster_id = Column(Integer, ForeignKey("clusters.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="cluster_scopes")
    cluster = relationship("Cluster")


# --- ORGANIZATIONAL HIERARCHY ---
class Region(Base):
    __tablename__ = "regions"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    clusters = relationship("Cluster", back_populates="region")

class Cluster(Base):
    __tablename__ = "clusters"
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=False)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    cluster_owner_name = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    region = relationship("Region", back_populates="clusters")
    branches = relationship("Branch", back_populates="cluster")
    projects = relationship("ExpansionProject", back_populates="cluster")

class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=False)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=True)
    manager_name = Column(String(100), nullable=True)
    manager_email = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cluster = relationship("Cluster", back_populates="branches")
    warehouses = relationship("Warehouse", back_populates="branch")

class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    warehouse_type = Column(String(50), default="MAIN")  # MAIN, REGIONAL_DISTRIBUTION, STAGING, PROJECT_SITE, REPAIR_CENTER
    address = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    branch = relationship("Branch", back_populates="warehouses")
    locations = relationship("StorageLocation", back_populates="warehouse")
    balances = relationship("InventoryBalance", back_populates="warehouse")

class StorageLocation(Base):
    __tablename__ = "storage_locations"
    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    zone = Column(String(50), nullable=False)      # e.g., Zone A (RAN), Zone B (Fiber)
    rack = Column(String(50), nullable=False)      # e.g., R01
    shelf = Column(String(50), nullable=False)     # e.g., S03
    bin = Column(String(50), nullable=False)       # e.g., B12
    location_code = Column(String(100), unique=True, nullable=False, index=True) # e.g. WH-N1-Z_A-R01-S03-B12
    description = Column(String(255), nullable=True)

    warehouse = relationship("Warehouse", back_populates="locations")


# --- EQUIPMENT CATALOGUE & SPECIFICATIONS ---
class EquipmentCategory(Base):
    __tablename__ = "equipment_categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    items = relationship("EquipmentItem", back_populates="category")

class EquipmentItem(Base):
    __tablename__ = "equipment_items"
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("equipment_categories.id"), nullable=False)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False, index=True)
    subcategory = Column(String(100), nullable=True)
    manufacturer = Column(String(100), nullable=False) # Ericsson, Nokia, Huawei, Cisco, CommScope, etc.
    model_number = Column(String(100), nullable=False, index=True)
    part_number = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    technical_specs = Column(Text, nullable=True) # JSON or key specs
    tracking_mode = Column(String(20), nullable=False, default="SERIALIZED") # SERIALIZED or QUANTITY
    unit_of_measure = Column(String(20), nullable=False, default="UNIT") # UNIT, METER, ROLL, BOX, SET, PAIR
    barcode = Column(String(100), nullable=True, index=True)
    unit_cost = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), default="USD")
    min_stock_level = Column(Integer, default=5)
    max_stock_level = Column(Integer, default=100)
    reorder_threshold = Column(Integer, default=10)
    image_url = Column(String(500), nullable=True)
    equipment_type = Column(String(100), nullable=True) # e.g. "Remote Radio Unit (RRU)", "Massive MIMO AAU", "Core Router"
    frequency_band = Column(String(100), nullable=True) # e.g. "1800/2100 MHz (B1/B3)", "2 MHz - 4 GHz"
    power_consumption_w = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    dimensions = Column(String(100), nullable=True) # e.g. "380 x 335 x 135 mm"
    warranty_months = Column(Integer, default=36)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("EquipmentCategory", back_populates="items")
    serialized_assets = relationship("SerializedAsset", back_populates="item")
    balances = relationship("InventoryBalance", back_populates="item")


# --- INVENTORY BALANCES & SERIALIZED ASSETS ---
class InventoryBalance(Base):
    __tablename__ = "inventory_balances"
    __table_args__ = (
        UniqueConstraint("item_id", "warehouse_id", "location_id", name="uq_item_wh_loc"),
    )
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("equipment_items.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    quantity_on_hand = Column(Float, default=0.0, nullable=False)
    quantity_available = Column(Float, default=0.0, nullable=False)
    quantity_reserved = Column(Float, default=0.0, nullable=False)
    quantity_borrowed = Column(Float, default=0.0, nullable=False)
    quantity_in_transit = Column(Float, default=0.0, nullable=False)
    quantity_damaged = Column(Float, default=0.0, nullable=False)
    quantity_quarantined = Column(Float, default=0.0, nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    item = relationship("EquipmentItem", back_populates="balances")
    warehouse = relationship("Warehouse", back_populates="balances")
    location = relationship("StorageLocation")

class SerializedAsset(Base):
    __tablename__ = "serialized_assets"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("equipment_items.id"), nullable=False)
    serial_number = Column(String(100), unique=True, nullable=False, index=True)
    barcode = Column(String(100), nullable=True)
    current_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    current_location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    
    # STATUS: AVAILABLE, RESERVED, ALLOCATED, ISSUED, INSTALLED, BORROWED, IN_TRANSIT, UNDER_INSPECTION, UNDER_REPAIR, DAMAGED, QUARANTINED, MISSING, WRITTEN_OFF, RETIRED
    status = Column(String(50), default="AVAILABLE", nullable=False, index=True)
    ownership = Column(String(50), default="COMPANY") # COMPANY, SUPPLIER, CUSTOMER
    condition = Column(String(50), default="NEW") # NEW, GOOD, REFURBISHED, FAULTY, DAMAGED
    batch_number = Column(String(50), nullable=True)
    manufacturing_date = Column(DateTime, nullable=True)
    warranty_expiry = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    item = relationship("EquipmentItem", back_populates="serialized_assets")
    warehouse = relationship("Warehouse")
    location = relationship("StorageLocation")


# --- ATOMIC STOCK MOVEMENT LEDGER (AUDIT HISTORY OF ALL INVENTORY MOVEMENTS) ---
class StockMovementLedger(Base):
    __tablename__ = "stock_movement_ledger"
    id = Column(Integer, primary_key=True, index=True)
    movement_type = Column(String(50), nullable=False, index=True) # RECEIVE, ISSUE, DISPATCH, LOAN, RETURN, TRANSFER_OUT, TRANSFER_IN, COUNT_ADJUST, REPAIR_SEND, REPAIR_RETURN, WRITE_OFF
    reference_type = Column(String(50), nullable=True) # GOODS_RECEIPT, DISPATCH_ORDER, LOAN, TRANSFER, STOCK_COUNT, PROJECT
    reference_id = Column(String(50), nullable=True, index=True)
    item_id = Column(Integer, ForeignKey("equipment_items.id"), nullable=False)
    serial_number = Column(String(100), nullable=True, index=True)
    from_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    to_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    quantity = Column(Float, nullable=False)
    balance_before = Column(Float, nullable=True)
    balance_after = Column(Float, nullable=True)
    performed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    item = relationship("EquipmentItem")
    user = relationship("User")


# --- SUPPLIERS & PROCUREMENT ---
class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    contact_person = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    is_approved = Column(Boolean, default=True)
    rating = Column(Float, default=5.0)

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), unique=True, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    target_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    order_date = Column(DateTime, default=datetime.utcnow)
    expected_delivery_date = Column(DateTime, nullable=True)
    total_amount = Column(Float, default=0.0)
    # STATUS: DRAFT, SUBMITTED, APPROVED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
    status = Column(String(50), default="SUBMITTED", nullable=False)
    notes = Column(Text, nullable=True)

    supplier = relationship("Supplier")
    warehouse = relationship("Warehouse")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    id = Column(Integer, primary_key=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("equipment_items.id"), nullable=False)
    ordered_quantity = Column(Float, nullable=False)
    received_quantity = Column(Float, default=0.0)
    unit_price = Column(Float, default=0.0)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    item = relationship("EquipmentItem")


# --- GOODS RECEIVING & INSPECTION ---
class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"
    id = Column(Integer, primary_key=True, index=True)
    grn_number = Column(String(50), unique=True, nullable=False, index=True) # Goods Receipt Note
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True)
    source_type = Column(String(50), default="PURCHASE_ORDER") # PURCHASE_ORDER, TRANSFER, RETURN, DIRECT_RECEIPT
    receiving_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    delivery_note_ref = Column(String(100), nullable=True)
    received_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # STATUS: PENDING_INSPECTION, INSPECTED_PASSED, QUARANTINED, ACCEPTED, REJECTED
    status = Column(String(50), default="ACCEPTED", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    warehouse = relationship("Warehouse")
    received_by = relationship("User")
    items = relationship("GoodsReceiptItem", back_populates="receipt")

class GoodsReceiptItem(Base):
    __tablename__ = "goods_receipt_items"
    id = Column(Integer, primary_key=True)
    receipt_id = Column(Integer, ForeignKey("goods_receipts.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("equipment_items.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    expected_quantity = Column(Float, nullable=False)
    received_quantity = Column(Float, nullable=False)
    damaged_quantity = Column(Float, default=0.0)
    serial_numbers = Column(Text, nullable=True) # Comma-separated or JSON list of serials received
    inspection_passed = Column(Boolean, default=True)

    receipt = relationship("GoodsReceipt", back_populates="items")
    item = relationship("EquipmentItem")
    location = relationship("StorageLocation")


# --- EQUIPMENT LOANS / BORROWING ---
class EquipmentLoan(Base):
    __tablename__ = "equipment_loans"
    id = Column(Integer, primary_key=True, index=True)
    loan_number = Column(String(50), unique=True, nullable=False, index=True)
    borrower_name = Column(String(100), nullable=False)
    borrower_department = Column(String(100), nullable=False)
    borrower_email = Column(String(100), nullable=True)
    borrower_phone = Column(String(50), nullable=True)
    issuing_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("equipment_items.id"), nullable=False)
    serial_number = Column(String(100), nullable=True)
    quantity = Column(Float, default=1.0, nullable=False)
    purpose = Column(String(255), nullable=False)
    issue_date = Column(DateTime, default=datetime.utcnow)
    expected_return_date = Column(DateTime, nullable=False)
    actual_return_date = Column(DateTime, nullable=True)
    # STATUS: REQUESTED, APPROVED, ISSUED, PARTIALLY_RETURNED, RETURNED, OVERDUE, INSPECTED, CLOSED, REJECTED
    status = Column(String(50), default="ISSUED", nullable=False, index=True)
    condition_on_issue = Column(String(50), default="GOOD")
    condition_on_return = Column(String(50), nullable=True)
    is_damaged_reported = Column(Boolean, default=False)
    damage_notes = Column(Text, nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    issued_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    returned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    warehouse = relationship("Warehouse")
    item = relationship("EquipmentItem")


# --- INTER-BRANCH & INTER-WAREHOUSE TRANSFERS ---
class InterBranchTransfer(Base):
    __tablename__ = "transfers"
    id = Column(Integer, primary_key=True, index=True)
    transfer_number = Column(String(50), unique=True, nullable=False, index=True)
    from_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    to_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    carrier = Column(String(100), nullable=True)
    tracking_reference = Column(String(100), nullable=True)
    dispatch_date = Column(DateTime, nullable=True)
    expected_arrival_date = Column(DateTime, nullable=True)
    received_date = Column(DateTime, nullable=True)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # STATUS: DRAFT, SUBMITTED, APPROVED, PICKED, DISPATCHED, IN_TRANSIT, PARTIALLY_RECEIVED, RECEIVED, RECONCILED, CLOSED, CANCELLED
    status = Column(String(50), default="DRAFT", nullable=False, index=True)
    notes = Column(Text, nullable=True)
    discrepancy_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    from_warehouse = relationship("Warehouse", foreign_keys=[from_warehouse_id])
    to_warehouse = relationship("Warehouse", foreign_keys=[to_warehouse_id])
    requester = relationship("User", foreign_keys=[requester_id])
    approver = relationship("User", foreign_keys=[approver_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    items = relationship("TransferItem", back_populates="transfer")

class TransferItem(Base):
    __tablename__ = "transfer_items"
    id = Column(Integer, primary_key=True)
    transfer_id = Column(Integer, ForeignKey("transfers.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("equipment_items.id"), nullable=False)
    requested_quantity = Column(Float, nullable=False)
    dispatched_quantity = Column(Float, default=0.0)
    received_quantity = Column(Float, default=0.0)
    discrepancy_quantity = Column(Float, default=0.0) # difference
    serial_numbers = Column(Text, nullable=True) # Serials involved

    transfer = relationship("InterBranchTransfer", back_populates="items")
    item = relationship("EquipmentItem")


# --- NETWORK EXPANSION PROJECTS & SITE ALLOCATION ---
class ExpansionProject(Base):
    __tablename__ = "expansion_projects"
    id = Column(Integer, primary_key=True, index=True)
    project_code = Column(String(50), unique=True, nullable=False, index=True) # e.g. PRJ-5G-METRO-01
    name = Column(String(150), nullable=False)
    target_cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=False)
    site_id = Column(String(100), nullable=True) # e.g. SITE-DXB-442
    project_type = Column(String(50), default="5G_ROLLOUT") # 5G_ROLLOUT, LTE_EXPANSION, FIBER_BACKHAUL, CAPACITY_UPGRADE, EMERGENCY_RESTORE
    priority = Column(String(20), default="HIGH") # CRITICAL, HIGH, MEDIUM, LOW
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # STATUS: PLANNING, APPROVED, ALLOCATED, DISPATCHED, IN_INSTALLATION, COMMISSIONED, COMPLETED, CANCELLED
    status = Column(String(50), default="PLANNING", nullable=False)
    target_start_date = Column(DateTime, nullable=True)
    target_completion_date = Column(DateTime, nullable=True)
    budget = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cluster = relationship("Cluster", back_populates="projects")
    manager = relationship("User")
    bom_items = relationship("ProjectBOMItem", back_populates="project")

class ProjectBOMItem(Base):
    __tablename__ = "project_bom_items"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("expansion_projects.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("equipment_items.id"), nullable=False)
    required_quantity = Column(Float, nullable=False)
    allocated_quantity = Column(Float, default=0.0)
    dispatched_quantity = Column(Float, default=0.0)
    installed_quantity = Column(Float, default=0.0)

    project = relationship("ExpansionProject", back_populates="bom_items")
    item = relationship("EquipmentItem")


# --- REPAIRS, DAMAGED, FAULTY & MISSING EQUIPMENT ---
class MaintenanceTicket(Base):
    __tablename__ = "maintenance_tickets"
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(50), unique=True, nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("serialized_assets.id"), nullable=True)
    item_id = Column(Integer, ForeignKey("equipment_items.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    fault_type = Column(String(100), nullable=False) # HARDWARE_FAILURE, TRANSIT_DAMAGE, WATER_INGRESS, LIGHTNING_SURGE, CALIBRATION_EXPIRED, MISSING
    severity = Column(String(20), default="HIGH") # CRITICAL, MAJOR, MINOR
    description = Column(Text, nullable=False)
    reported_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vendor_service_ref = Column(String(100), nullable=True)
    repair_vendor = Column(String(100), nullable=True)
    repair_cost = Column(Float, default=0.0)
    warranty_claim_ref = Column(String(100), nullable=True)
    # STATUS: REPORTED, QUARANTINED, IN_REPAIR, AWAITING_PARTS, INSPECTED_PASSED, WRITTEN_OFF, CLOSED
    status = Column(String(50), default="REPORTED", nullable=False, index=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    asset = relationship("SerializedAsset")
    item = relationship("EquipmentItem")
    warehouse = relationship("Warehouse")
    reporter = relationship("User")


# --- PHYSICAL STOCK COUNTS & AUDIT CYCLE COUNTING ---
class PhysicalStockCount(Base):
    __tablename__ = "physical_stock_counts"
    id = Column(Integer, primary_key=True, index=True)
    count_number = Column(String(50), unique=True, nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    count_type = Column(String(50), default="CYCLE_COUNT") # FULL_ANNUAL, CYCLE_COUNT, BLIND_COUNT, SPOT_CHECK
    # STATUS: DRAFT, IN_PROGRESS, PENDING_APPROVAL, APPROVED_RECONCILED, REJECTED
    status = Column(String(50), default="IN_PROGRESS", nullable=False)
    initiated_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reconciliation_notes = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    warehouse = relationship("Warehouse")
    initiator = relationship("User", foreign_keys=[initiated_by_id])
    approver = relationship("User", foreign_keys=[approved_by_id])
    items = relationship("StockCountItem", back_populates="count")

class StockCountItem(Base):
    __tablename__ = "stock_count_items"
    id = Column(Integer, primary_key=True)
    count_id = Column(Integer, ForeignKey("physical_stock_counts.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("equipment_items.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    system_quantity = Column(Float, nullable=False)
    counted_quantity = Column(Float, nullable=False)
    variance = Column(Float, nullable=False) # counted - system
    is_reconciled = Column(Boolean, default=False)
    discrepancy_reason = Column(Text, nullable=True)

    count = relationship("PhysicalStockCount", back_populates="items")
    item = relationship("EquipmentItem")
    location = relationship("StorageLocation")


# --- APPROVAL WORKFLOWS ---
class ApprovalRequest(Base):
    __tablename__ = "approval_requests"
    id = Column(Integer, primary_key=True, index=True)
    request_type = Column(String(50), nullable=False, index=True) # EXPANSION_ALLOCATION, INTER_BRANCH_TRANSFER, STOCK_ADJUSTMENT, WRITE_OFF, HIGH_VALUE_ISSUE, LOAN_EXTENSION
    reference_id = Column(String(50), nullable=False) # e.g. PRJ-01, TRF-01, ADJ-01
    title = Column(String(200), nullable=False)
    details = Column(Text, nullable=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # STATUS: PENDING, APPROVED, REJECTED, CANCELLED
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    decided_at = Column(DateTime, nullable=True)

    requester = relationship("User", foreign_keys=[requester_id])
    approver = relationship("User", foreign_keys=[approver_id])


# --- AUDIT TRAIL (IMMUTABLE JOURNAL) ---
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False, index=True) # CREATE, UPDATE, DELETE, APPROVE, REJECT, DISPATCH, RECEIVE, RECONCILE, BACKUP, RESTORE
    entity_name = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(100), nullable=True)
    previous_state = Column(Text, nullable=True)
    new_state = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")


# --- SYSTEM NOTIFICATIONS ---
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # null means broadcast to authorized roles
    target_role = Column(String(50), nullable=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), default="INFO") # INFO, WARNING, CRITICAL, SUCCESS
    is_read = Column(Boolean, default=False)
    link = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# --- SYSTEM SETTINGS ---
class SystemSetting(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
