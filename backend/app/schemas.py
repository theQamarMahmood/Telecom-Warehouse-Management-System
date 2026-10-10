from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel

# --- AUTH & USERS ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user: Any

class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: str
    department: Optional[str] = "Telecom Operations"
    phone: Optional[str] = None
    cluster_ids: Optional[List[int]] = []
    branch_ids: Optional[List[int]] = []

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    cluster_ids: Optional[List[int]] = None
    branch_ids: Optional[List[int]] = None

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    department: Optional[str]
    phone: Optional[str]
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]
    cluster_ids: List[int] = []
    branch_ids: List[int] = []

    class Config:
        from_attributes = True


# --- HIERARCHY ---
class RegionCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None

class RegionOut(RegionCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class ClusterCreate(BaseModel):
    region_id: int
    code: str
    name: str
    cluster_owner_name: Optional[str] = None
    description: Optional[str] = None

class ClusterOut(ClusterCreate):
    id: int
    created_at: datetime
    region_name: Optional[str] = None
    class Config:
        from_attributes = True

class BranchCreate(BaseModel):
    cluster_id: int
    code: str
    name: str
    address: Optional[str] = None
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    phone: Optional[str] = None

class BranchOut(BranchCreate):
    id: int
    is_active: bool
    created_at: datetime
    cluster_name: Optional[str] = None
    class Config:
        from_attributes = True

class WarehouseCreate(BaseModel):
    branch_id: int
    code: str
    name: str
    warehouse_type: Optional[str] = "MAIN"
    address: Optional[str] = None

class WarehouseOut(WarehouseCreate):
    id: int
    is_active: bool
    created_at: datetime
    branch_name: Optional[str] = None
    class Config:
        from_attributes = True

class StorageLocationCreate(BaseModel):
    warehouse_id: int
    zone: str
    rack: str
    shelf: str
    bin: str
    description: Optional[str] = None

class StorageLocationOut(StorageLocationCreate):
    id: int
    location_code: str
    warehouse_name: Optional[str] = None
    class Config:
        from_attributes = True


# --- CATALOGUE ---
class CategoryCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None

class CategoryOut(CategoryCreate):
    id: int
    item_count: Optional[int] = 0
    class Config:
        from_attributes = True

class WarehouseStockSummary(BaseModel):
    warehouse_id: int
    warehouse_name: str
    warehouse_code: str
    branch_name: str
    cluster_name: str
    location_code: Optional[str] = None
    quantity_on_hand: float = 0.0
    quantity_available: float = 0.0
    quantity_reserved: float = 0.0
    quantity_borrowed: float = 0.0
    quantity_in_transit: float = 0.0
    quantity_damaged: float = 0.0
    quantity_quarantined: float = 0.0

class EquipmentItemCreate(BaseModel):
    category_id: int
    sku: str
    name: str
    subcategory: Optional[str] = None
    manufacturer: str
    model_number: str
    part_number: Optional[str] = None
    description: Optional[str] = None
    technical_specs: Optional[str] = None
    tracking_mode: str = "SERIALIZED"
    unit_of_measure: str = "UNIT"
    barcode: Optional[str] = None
    unit_cost: float = 0.0
    currency: str = "USD"
    min_stock_level: int = 5
    max_stock_level: int = 100
    reorder_threshold: int = 10
    image_url: Optional[str] = None
    equipment_type: Optional[str] = None
    frequency_band: Optional[str] = None
    power_consumption_w: Optional[float] = None
    weight_kg: Optional[float] = None
    dimensions: Optional[str] = None
    warranty_months: Optional[int] = 36

class EquipmentItemUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = None
    subcategory: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    part_number: Optional[str] = None
    description: Optional[str] = None
    technical_specs: Optional[str] = None
    tracking_mode: Optional[str] = None
    unit_of_measure: Optional[str] = None
    barcode: Optional[str] = None
    unit_cost: Optional[float] = None
    currency: Optional[str] = None
    min_stock_level: Optional[int] = None
    max_stock_level: Optional[int] = None
    reorder_threshold: Optional[int] = None
    image_url: Optional[str] = None
    equipment_type: Optional[str] = None
    frequency_band: Optional[str] = None
    power_consumption_w: Optional[float] = None
    weight_kg: Optional[float] = None
    dimensions: Optional[str] = None
    warranty_months: Optional[int] = None

class EquipmentItemOut(EquipmentItemCreate):
    id: int
    is_active: bool
    category_name: Optional[str] = None
    total_on_hand: Optional[float] = 0.0
    total_available: Optional[float] = 0.0
    total_reserved: Optional[float] = 0.0
    total_borrowed: Optional[float] = 0.0
    total_in_transit: Optional[float] = 0.0
    total_damaged: Optional[float] = 0.0
    total_quarantined: Optional[float] = 0.0
    warehouses_stock: Optional[List[WarehouseStockSummary]] = []
    created_at: datetime
    class Config:
        from_attributes = True


# --- INVENTORY & SERIALS ---
class InventoryBalanceOut(BaseModel):
    id: int
    item_id: int
    item_name: str
    sku: str
    manufacturer: str
    model_number: str
    category_name: str
    tracking_mode: str
    unit_cost: float
    warehouse_id: int
    warehouse_name: str
    branch_name: str
    cluster_name: str
    location_id: Optional[int]
    location_code: Optional[str]
    quantity_on_hand: float
    quantity_available: float
    quantity_reserved: float
    quantity_borrowed: float
    quantity_in_transit: float
    quantity_damaged: float
    quantity_quarantined: float
    last_updated: datetime
    class Config:
        from_attributes = True

class SerializedAssetOut(BaseModel):
    id: int
    item_id: int
    item_name: str
    sku: str
    manufacturer: str
    model_number: str
    serial_number: str
    barcode: Optional[str]
    current_warehouse_id: Optional[int]
    warehouse_name: Optional[str]
    location_code: Optional[str]
    status: str
    ownership: str
    condition: str
    warranty_expiry: Optional[datetime]
    created_at: datetime
    class Config:
        from_attributes = True

class StockMovementLedgerOut(BaseModel):
    id: int
    movement_type: str
    reference_type: Optional[str]
    reference_id: Optional[str]
    item_id: int
    item_name: str
    sku: str
    serial_number: Optional[str]
    from_warehouse_id: Optional[int]
    from_warehouse_name: Optional[str]
    to_warehouse_id: Optional[int]
    to_warehouse_name: Optional[str]
    quantity: float
    balance_before: Optional[float]
    balance_after: Optional[float]
    performed_by_name: str
    reason: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True


# --- GOODS RECEIVING ---
class GoodsReceiptItemInput(BaseModel):
    item_id: int
    location_id: Optional[int] = None
    expected_quantity: float
    received_quantity: float
    damaged_quantity: float = 0.0
    serial_numbers: Optional[List[str]] = []
    condition: str = "NEW"

class GoodsReceiptCreate(BaseModel):
    po_id: Optional[int] = None
    receiving_warehouse_id: int
    delivery_note_ref: Optional[str] = None
    notes: Optional[str] = None
    items: List[GoodsReceiptItemInput]

class GoodsReceiptOut(BaseModel):
    id: int
    grn_number: str
    source_type: str
    receiving_warehouse_id: int
    receiving_warehouse_name: str
    delivery_note_ref: Optional[str]
    status: str
    notes: Optional[str]
    created_at: datetime
    received_by_name: str
    items_count: int
    class Config:
        from_attributes = True


# --- BORROWING & LOANS ---
class EquipmentLoanCreate(BaseModel):
    borrower_name: str
    borrower_department: str
    borrower_email: Optional[str] = None
    borrower_phone: Optional[str] = None
    issuing_warehouse_id: int
    item_id: int
    serial_number: Optional[str] = None
    quantity: float = 1.0
    purpose: str
    expected_return_date: datetime

class EquipmentLoanReturn(BaseModel):
    condition_on_return: str # GOOD, DAMAGED, FAULTY, ACCESSORIES_MISSING
    is_damaged: bool = False
    damage_notes: Optional[str] = None

class EquipmentLoanOut(BaseModel):
    id: int
    loan_number: str
    borrower_name: str
    borrower_department: str
    warehouse_name: str
    item_name: str
    sku: str
    serial_number: Optional[str]
    quantity: float
    purpose: str
    issue_date: datetime
    expected_return_date: datetime
    actual_return_date: Optional[datetime]
    status: str
    is_damaged_reported: bool
    damage_notes: Optional[str]
    is_overdue: bool = False
    class Config:
        from_attributes = True


# --- TRANSFERS ---
class TransferItemInput(BaseModel):
    item_id: int
    requested_quantity: float
    serial_numbers: Optional[List[str]] = []

class TransferCreate(BaseModel):
    from_warehouse_id: int
    to_warehouse_id: int
    carrier: Optional[str] = None
    tracking_reference: Optional[str] = None
    notes: Optional[str] = None
    items: List[TransferItemInput]

class TransferDispatchInput(BaseModel):
    carrier: Optional[str] = None
    tracking_reference: Optional[str] = None

class TransferReceiveItemInput(BaseModel):
    item_id: int
    received_quantity: float
    damaged_quantity: float = 0.0
    received_serial_numbers: Optional[List[str]] = []

class TransferReceiveInput(BaseModel):
    items: List[TransferReceiveItemInput]
    notes: Optional[str] = None

class TransferOut(BaseModel):
    id: int
    transfer_number: str
    from_warehouse_id: int
    from_warehouse_name: str
    from_branch_name: str
    to_warehouse_id: int
    to_warehouse_name: str
    to_branch_name: str
    requester_name: str
    approver_name: Optional[str]
    receiver_name: Optional[str]
    carrier: Optional[str]
    tracking_reference: Optional[str]
    dispatch_date: Optional[datetime]
    received_date: Optional[datetime]
    status: str
    notes: Optional[str]
    discrepancy_notes: Optional[str]
    items: List[Any] = []
    created_at: datetime
    class Config:
        from_attributes = True


# --- EXPANSION PROJECTS ---
class BOMItemInput(BaseModel):
    item_id: int
    required_quantity: float

class ProjectCreate(BaseModel):
    project_code: str
    name: str
    target_cluster_id: int
    site_id: Optional[str] = None
    project_type: str = "5G_ROLLOUT"
    priority: str = "HIGH"
    target_start_date: Optional[datetime] = None
    target_completion_date: Optional[datetime] = None
    budget: float = 0.0
    notes: Optional[str] = None
    bom_items: List[BOMItemInput] = []

class ProjectAllocateInput(BaseModel):
    warehouse_id: int
    allocations: List[dict] # [{"item_id": 1, "quantity": 10, "serial_numbers": ["SN01"]}]

class ProjectOut(BaseModel):
    id: int
    project_code: str
    name: str
    target_cluster_id: int
    cluster_name: str
    site_id: Optional[str]
    project_type: str
    priority: str
    status: str
    budget: float
    manager_name: Optional[str]
    created_at: datetime
    bom_items: List[Any] = []
    class Config:
        from_attributes = True


# --- PROCUREMENT ---
class SupplierCreate(BaseModel):
    code: str
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class SupplierOut(SupplierCreate):
    id: int
    is_approved: bool
    rating: float
    class Config:
        from_attributes = True

class POItemInput(BaseModel):
    item_id: int
    ordered_quantity: float
    unit_price: float

class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    target_warehouse_id: int
    expected_delivery_date: Optional[datetime] = None
    notes: Optional[str] = None
    items: List[POItemInput]

class PurchaseOrderOut(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    supplier_name: str
    target_warehouse_id: int
    target_warehouse_name: str
    order_date: datetime
    expected_delivery_date: Optional[datetime]
    total_amount: float
    status: str
    items: List[Any] = []
    class Config:
        from_attributes = True


# --- MAINTENANCE & REPAIRS ---
class MaintenanceTicketCreate(BaseModel):
    item_id: int
    asset_id: Optional[int] = None
    warehouse_id: int
    fault_type: str
    severity: str = "HIGH"
    description: str
    vendor_service_ref: Optional[str] = None
    repair_vendor: Optional[str] = None

class MaintenanceTicketUpdate(BaseModel):
    status: str # IN_REPAIR, AWAITING_PARTS, INSPECTED_PASSED, WRITTEN_OFF, CLOSED
    resolution_notes: Optional[str] = None
    repair_cost: Optional[float] = 0.0

class MaintenanceTicketOut(BaseModel):
    id: int
    ticket_number: str
    item_name: str
    sku: str
    serial_number: Optional[str]
    warehouse_name: str
    fault_type: str
    severity: str
    description: str
    status: str
    repair_vendor: Optional[str]
    repair_cost: float
    reported_by_name: str
    created_at: datetime
    class Config:
        from_attributes = True


# --- PHYSICAL STOCK COUNTS ---
class StockCountCreate(BaseModel):
    warehouse_id: int
    count_type: str = "CYCLE_COUNT" # FULL_ANNUAL, CYCLE_COUNT, BLIND_COUNT

class StockCountItemEntry(BaseModel):
    item_id: int
    location_id: Optional[int] = None
    counted_quantity: float
    discrepancy_reason: Optional[str] = None

class StockCountReconcileInput(BaseModel):
    approval_notes: Optional[str] = None

class StockCountOut(BaseModel):
    id: int
    count_number: str
    warehouse_id: int
    warehouse_name: str
    count_type: str
    status: str
    initiated_by_name: str
    approver_name: Optional[str]
    started_at: datetime
    items: List[Any] = []
    class Config:
        from_attributes = True


# --- APPROVALS ---
class ApprovalDecision(BaseModel):
    decision: str # APPROVED or REJECTED
    comment: Optional[str] = None

class ApprovalRequestOut(BaseModel):
    id: int
    request_type: str
    reference_id: str
    title: str
    details: Optional[str]
    requester_name: str
    approver_name: Optional[str]
    status: str
    rejection_reason: Optional[str]
    created_at: datetime
    decided_at: Optional[datetime]
    class Config:
        from_attributes = True


# --- DASHBOARD & METRICS ---
class DashboardMetrics(BaseModel):
    total_skus: int
    total_units_tracked: float
    total_inventory_value: Optional[float]
    units_available: float
    units_reserved: float
    units_borrowed: float
    units_in_transit: float
    units_damaged: float
    units_quarantined: float
    overdue_loans_count: int
    pending_approvals_count: int
    pending_transfers_count: int
    low_stock_alerts_count: int
    active_projects_count: int
    open_repairs_count: int
    clusters_breakdown: List[dict]
    categories_breakdown: List[dict]
    recent_movements: List[Any]
    shortage_branches: List[dict]
    excess_branches: List[dict]
