export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  department?: string;
  phone?: string;
  is_active: boolean;
  cluster_ids: number[];
  branch_ids: number[];
}

export interface DashboardMetrics {
  total_skus: number;
  total_units_tracked: number;
  total_inventory_value?: number;
  units_available: number;
  units_reserved: number;
  units_borrowed: number;
  units_in_transit: number;
  units_damaged: number;
  units_quarantined: number;
  overdue_loans_count: number;
  pending_approvals_count: number;
  pending_transfers_count: number;
  low_stock_alerts_count: number;
  active_projects_count: number;
  open_repairs_count: number;
  clusters_breakdown: Array<{
    cluster_id: number;
    cluster_name: string;
    cluster_code: string;
    units_tracked: number;
    valuation: number;
    branches_count: number;
  }>;
  categories_breakdown: Array<{
    category: string;
    units: number;
  }>;
  recent_movements: Array<{
    id: number;
    type: string;
    item_name: string;
    quantity: number;
    ref: string;
    time: string;
    user: string;
  }>;
  shortage_branches: Array<{
    branch_name: string;
    branch_code: string;
    shortage_items_count: number;
  }>;
  excess_branches: Array<{
    branch_name: string;
    branch_code: string;
    excess_items_count: number;
  }>;
}

export interface InventoryBalance {
  id: number;
  item_id: number;
  item_name: string;
  sku: string;
  manufacturer: string;
  model_number: string;
  category_name: string;
  tracking_mode: string;
  unit_cost: number;
  warehouse_id: number;
  warehouse_name: string;
  branch_name: string;
  cluster_name: string;
  location_id?: number;
  location_code?: string;
  quantity_on_hand: number;
  quantity_available: number;
  quantity_reserved: number;
  quantity_borrowed: number;
  quantity_in_transit: number;
  quantity_damaged: number;
  quantity_quarantined: number;
  last_updated: string;
}

export interface SerializedAsset {
  id: number;
  item_id: number;
  item_name: string;
  sku: string;
  manufacturer: string;
  model_number: string;
  serial_number: string;
  barcode?: string;
  current_warehouse_id?: number;
  warehouse_name?: string;
  location_code?: string;
  status: string;
  ownership: string;
  condition: string;
  warranty_expiry?: string;
  created_at: string;
}

export interface WarehouseStockSummary {
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  branch_name: string;
  cluster_name: string;
  location_code?: string;
  quantity_on_hand: number;
  quantity_available: number;
  quantity_reserved: number;
  quantity_borrowed: number;
  quantity_in_transit: number;
  quantity_damaged: number;
  quantity_quarantined: number;
}

export interface EquipmentItem {
  id: number;
  category_id: number;
  sku: string;
  name: string;
  subcategory?: string;
  manufacturer: string;
  model_number: string;
  part_number?: string;
  description?: string;
  technical_specs?: string;
  tracking_mode: string;
  unit_of_measure: string;
  barcode?: string;
  unit_cost: number;
  currency: string;
  min_stock_level: number;
  max_stock_level: number;
  reorder_threshold: number;
  image_url?: string;
  equipment_type?: string;
  frequency_band?: string;
  power_consumption_w?: number;
  weight_kg?: number;
  dimensions?: string;
  warranty_months?: number;
  is_active: boolean;
  category_name?: string;
  total_on_hand?: number;
  total_available?: number;
  total_reserved?: number;
  total_borrowed?: number;
  total_in_transit?: number;
  total_damaged?: number;
  total_quarantined?: number;
  warehouses_stock?: WarehouseStockSummary[];
}

export interface EquipmentCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
  item_count: number;
}

export interface EquipmentLoan {
  id: number;
  loan_number: string;
  borrower_name: string;
  borrower_department: string;
  warehouse_name: string;
  item_name: string;
  sku: string;
  serial_number?: string;
  quantity: number;
  purpose: string;
  issue_date: string;
  expected_return_date: string;
  actual_return_date?: string;
  status: string;
  is_damaged_reported: boolean;
  damage_notes?: string;
  is_overdue: boolean;
}

export interface InterBranchTransfer {
  id: number;
  transfer_number: string;
  from_warehouse_id: number;
  from_warehouse_name: string;
  from_branch_name: string;
  to_warehouse_id: number;
  to_warehouse_name: string;
  to_branch_name: string;
  requester_name: string;
  approver_name?: string;
  receiver_name?: string;
  carrier?: string;
  tracking_reference?: string;
  dispatch_date?: string;
  received_date?: string;
  status: string;
  notes?: string;
  discrepancy_notes?: string;
  items: Array<{
    item_id: number;
    item_name: string;
    sku: string;
    requested_quantity: number;
    dispatched_quantity: number;
    received_quantity: number;
    discrepancy_quantity: number;
    serial_numbers?: string;
  }>;
}

export interface ExpansionProject {
  id: number;
  project_code: string;
  name: string;
  target_cluster_id: number;
  cluster_name: string;
  site_id?: string;
  project_type: string;
  priority: string;
  status: string;
  budget: number;
  manager_name?: string;
  created_at: string;
  bom_items: Array<{
    item_id: number;
    item_name: string;
    sku: string;
    manufacturer: string;
    tracking_mode: string;
    required_quantity: number;
    allocated_quantity: number;
    dispatched_quantity: number;
    installed_quantity: number;
  }>;
}

export interface Branch {
  id: number;
  cluster_id: number;
  code: string;
  name: string;
  address?: string;
  manager_name?: string;
  manager_email?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  cluster_name?: string;
}

export interface Warehouse {
  id: number;
  branch_id: number;
  code: string;
  name: string;
  warehouse_type: string;
  address?: string;
  is_active: boolean;
  branch_name?: string;
}

export interface Cluster {
  id: number;
  region_id: number;
  code: string;
  name: string;
  cluster_owner_name?: string;
  region_name?: string;
}

export interface MaintenanceTicket {
  id: number;
  ticket_number: string;
  item_name: string;
  sku: string;
  serial_number?: string;
  warehouse_name: string;
  fault_type: string;
  severity: string;
  description: string;
  status: string;
  repair_vendor?: string;
  repair_cost: number;
  reported_by_name: string;
  created_at: string;
}

export interface StockCount {
  id: number;
  count_number: string;
  warehouse_id: number;
  warehouse_name: string;
  count_type: string;
  status: string;
  initiated_by_name: string;
  approver_name?: string;
  started_at: string;
  items: Array<{
    item_id: number;
    item_name: string;
    sku: string;
    system_quantity: number;
    counted_quantity: number;
    variance: number;
    is_reconciled: boolean;
    discrepancy_reason?: string;
  }>;
}

export interface ApprovalRequest {
  id: number;
  request_type: string;
  reference_id: string;
  title: string;
  details?: string;
  requester_name: string;
  approver_name?: string;
  status: string;
  rejection_reason?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  username: string;
  action: string;
  entity_name: string;
  entity_id?: string;
  previous_state?: string;
  new_state?: string;
  ip_address?: string;
  created_at: string;
}
