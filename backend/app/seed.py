from datetime import datetime, timedelta
from app.database import SessionLocal, Base, engine
from app.auth import hash_password
from app.models import (
    User, UserBranchScope, UserClusterScope, Region, Cluster, Branch, Warehouse,
    StorageLocation, EquipmentCategory, EquipmentItem, SerializedAsset,
    InventoryBalance, StockMovementLedger, Supplier, PurchaseOrder, PurchaseOrderItem,
    GoodsReceipt, GoodsReceiptItem, EquipmentLoan, InterBranchTransfer, TransferItem,
    ExpansionProject, ProjectBOMItem, MaintenanceTicket, SystemSetting
)

def run_seed():
    db = SessionLocal()
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # Check if already seeded
    if db.query(User).filter(User.username == "admin").first():
        print("Database already seeded. Skipping initial seed.")
        db.close()
        return

    print("Seeding Enterprise Telecom Warehouse Management System...")

    # --- 1. SYSTEM SETTINGS ---
    default_settings = [
        ("COMPANY_NAME", "Apex Telecom Global Operations"),
        ("BASE_CURRENCY", "USD"),
        ("DEFAULT_LOAN_DURATION_DAYS", "14"),
        ("SEGREGATION_OF_DUTIES_ENFORCED", "true"),
        ("DISCREPANCY_TOLERANCE_PERCENT", "0.0"),
        ("AUTO_QUARANTINE_DAMAGED_RETURNS", "true"),
    ]
    for k, v in default_settings:
        db.add(SystemSetting(key=k, value=v))

    # --- 2. HIERARCHY ---
    # Regions
    r_north = Region(code="REG-NORTH", name="Northern Emirates Region", description="Northern telecom infrastructure zone")
    r_capital = Region(code="REG-CAPITAL", name="Capital Metropolitan Region", description="Capital area telecom & 5G coverage")
    db.add_all([r_north, r_capital])
    db.flush()

    # Clusters
    cl_metro = Cluster(region_id=r_north.id, code="CL-DXB-METRO", name="Dubai Metro Cluster", cluster_owner_name="Tariq Mansoor")
    cl_auh = Cluster(region_id=r_capital.id, code="CL-AUH-URBAN", name="Abu Dhabi Urban Cluster", cluster_owner_name="Khalid Al-Hashemi")
    db.add_all([cl_metro, cl_auh])
    db.flush()

    # Branches
    br_dxb = Branch(cluster_id=cl_metro.id, code="BR-DXB-CENTRAL", name="Dubai Central Logistics Hub", address="Plot 42, Logistics City, Dubai", manager_name="Zayed Al-Suwaidi", phone="+971-4-8801122")
    br_auh = Branch(cluster_id=cl_auh.id, code="BR-AUH-MAIN", name="Abu Dhabi Main Depot", address="Sector M-12, Mussafah, Abu Dhabi", manager_name="Salem Al-Ketbi", phone="+971-2-5503344")
    br_shj = Branch(cluster_id=cl_metro.id, code="BR-SHJ-REGIONAL", name="Sharjah Staging Branch", address="Industrial Area 10, Sharjah", manager_name="Rashid Lootah", phone="+971-6-5342211")
    db.add_all([br_dxb, br_auh, br_shj])
    db.flush()

    # Warehouses
    wh_dxb_main = Warehouse(branch_id=br_dxb.id, code="WH-DXB-01", name="Dubai Central RAN & Core Depot", warehouse_type="MAIN", address="Dubai Logistics City")
    wh_dxb_staging = Warehouse(branch_id=br_dxb.id, code="WH-DXB-02", name="Dubai 5G Project Staging Area", warehouse_type="STAGING", address="Dubai Logistics City Gate 4")
    wh_auh_main = Warehouse(branch_id=br_auh.id, code="WH-AUH-01", name="Abu Dhabi Primary Depot", warehouse_type="MAIN", address="Mussafah Logistics Complex")
    wh_shj_depot = Warehouse(branch_id=br_shj.id, code="WH-SHJ-01", name="Sharjah Regional Warehouse", warehouse_type="REGIONAL_DISTRIBUTION", address="Sharjah Ind 10")
    db.add_all([wh_dxb_main, wh_dxb_staging, wh_auh_main, wh_shj_depot])
    db.flush()

    # Storage Locations (Zones, Racks, Shelves, Bins)
    locations = [
        StorageLocation(warehouse_id=wh_dxb_main.id, zone="Zone A (RAN)", rack="R01", shelf="S01", bin="B01", location_code="WH-DXB-01-ZA-R01-S01-B01", description="5G Active Radios"),
        StorageLocation(warehouse_id=wh_dxb_main.id, zone="Zone A (RAN)", rack="R01", shelf="S02", bin="B02", location_code="WH-DXB-01-ZA-R01-S02-B02", description="Baseband & BBU Units"),
        StorageLocation(warehouse_id=wh_dxb_main.id, zone="Zone B (Fiber & Passive)", rack="R02", shelf="S01", bin="B01", location_code="WH-DXB-01-ZB-R02-S01-B01", description="Optical SFP & Cables"),
        StorageLocation(warehouse_id=wh_dxb_main.id, zone="Zone C (Power & Rectifiers)", rack="R03", shelf="S01", bin="B01", location_code="WH-DXB-01-ZC-R03-S01-B01", description="DC Rectifiers & Breakers"),
        StorageLocation(warehouse_id=wh_auh_main.id, zone="Zone A (RAN)", rack="R01", shelf="S01", bin="B01", location_code="WH-AUH-01-ZA-R01-S01-B01", description="Capital Regional Stock"),
        StorageLocation(warehouse_id=wh_auh_main.id, zone="Zone B (Tools & Test)", rack="R02", shelf="S01", bin="B01", location_code="WH-AUH-01-ZB-R02-S01-B01", description="Site Meters & OTDRs"),
    ]
    db.add_all(locations)
    db.flush()

    # --- 3. USERS ACROSS ROLES WITH DATA SCOPES ---
    pwd = hash_password("Password123!")

    # Super Admin
    u_admin = User(username="admin", email="admin@apextelecom.com", full_name="Sarah Jenkins (Super Admin)", password_hash=pwd, role="SUPER_ADMIN", department="Executive Operations")
    # Warehouse Manager
    u_wm = User(username="wh_manager_dxb", email="wm.dxb@apextelecom.com", full_name="Mansoor Farooq (WH Manager)", password_hash=pwd, role="WAREHOUSE_MANAGER", department="Warehousing")
    # Cluster Owner (North Cluster Scoped)
    u_co = User(username="cluster_owner_north", email="cluster.north@apextelecom.com", full_name="Tariq Mansoor (Cluster Owner)", password_hash=pwd, role="CLUSTER_OWNER", department="Regional Engineering")
    # Branch Manager (Abu Dhabi Scoped)
    u_bm = User(username="branch_mgr_auh", email="bm.auh@apextelecom.com", full_name="Salem Al-Ketbi (Branch Manager)", password_hash=pwd, role="BRANCH_MANAGER", department="Branch Operations")
    # Warehouse Officer
    u_wo = User(username="officer_ran", email="wo.ran@apextelecom.com", full_name="Hamad Bilal (Warehouse Officer)", password_hash=pwd, role="WAREHOUSE_OFFICER", department="Warehousing")
    # Field Engineer
    u_fe = User(username="field_eng_omar", email="fe.omar@apextelecom.com", full_name="Omar Al-Rashed (Field Engineer)", password_hash=pwd, role="FIELD_ENGINEER", department="Network Rollout")
    # Procurement Officer
    u_po = User(username="proc_officer", email="proc@apextelecom.com", full_name="Elena Rostova (Procurement Officer)", password_hash=pwd, role="PROCUREMENT_OFFICER", department="Supply Chain")
    # Finance Controller
    u_fin = User(username="fin_controller", email="fin@apextelecom.com", full_name="David Chen (Inventory Controller)", password_hash=pwd, role="FINANCE_CONTROLLER", department="Finance")
    # Auditor
    u_aud = User(username="auditor_jane", email="auditor@apextelecom.com", full_name="Jane Doe (Internal Auditor)", password_hash=pwd, role="AUDITOR", department="Compliance & Audit")

    db.add_all([u_admin, u_wm, u_co, u_bm, u_wo, u_fe, u_po, u_fin, u_aud])
    db.flush()

    # Assign Cluster Scopes
    db.add(UserClusterScope(user_id=u_co.id, cluster_id=cl_metro.id)) # Tariq owns North/DXB Metro
    # Assign Branch Scopes
    db.add(UserBranchScope(user_id=u_wm.id, branch_id=br_dxb.id))
    db.add(UserBranchScope(user_id=u_bm.id, branch_id=br_auh.id))
    db.add(UserBranchScope(user_id=u_wo.id, branch_id=br_dxb.id))
    db.flush()

    # --- 4. EQUIPMENT CATALOGUE (CATEGORIES A TO F) ---
    cat_ran = EquipmentCategory(code="RAN", name="Radio Access Network", description="Sector antennas, RRUs, massive MIMO, BBU, NodeB")
    cat_tx = EquipmentCategory(code="TX", name="Transmission & Backhaul", description="Microwave radios, DWDM, optical SFP transceivers, ODFs")
    cat_passive = EquipmentCategory(code="PASSIVE", name="Passive Infrastructure", description="RF feeder cables, jumpers, connectors, cabinets, grounding")
    cat_pwr = EquipmentCategory(code="POWER", name="Power & Electrical", description="DC rectifiers, battery banks, circuit breakers, solar spares")
    cat_core = EquipmentCategory(code="CORE", name="Core Network & IP", description="Routers, core switches, firewalls, GPS synchronization")
    cat_tools = EquipmentCategory(code="TOOLS", name="Tools, Test & Safety", description="OTDRs, Site Master analyzers, harnesses, test kits")
    db.add_all([cat_ran, cat_tx, cat_passive, cat_pwr, cat_core, cat_tools])
    db.flush()

    # Equipment Items
    items = [
        # RAN
        EquipmentItem(
            category_id=cat_ran.id, sku="RAN-RRU-4415", name="Ericsson Radio 4415 B1/B3 Remote Radio Unit",
            subcategory="Remote Radio Units", manufacturer="Ericsson", model_number="Radio 4415",
            part_number="KRC161623/1", description="4T4R multi-standard high-power RRU for 1800/2100MHz macro cell rollout",
            tracking_mode="SERIALIZED", unit_of_measure="UNIT", barcode="BC-RAN-4415",
            unit_cost=3450.0, min_stock_level=10, max_stock_level=60, reorder_threshold=15,
            image_url="https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80",
            equipment_type="Remote Radio Unit (RRU)", frequency_band="1800/2100 MHz (B1/B3)",
            power_consumption_w=460.0, weight_kg=17.0, dimensions="380 x 335 x 135 mm", warranty_months=36
        ),
        EquipmentItem(
            category_id=cat_ran.id, sku="RAN-BBU-6630", name="Ericsson Baseband 6630 Digital Processing Unit",
            subcategory="Baseband Units", manufacturer="Ericsson", model_number="BB 6630",
            part_number="KDU137925/1", description="High capacity digital baseband processing unit supporting GSM, WCDMA, LTE and 5G NR",
            tracking_mode="SERIALIZED", unit_of_measure="UNIT", barcode="BC-RAN-6630",
            unit_cost=4800.0, min_stock_level=5, max_stock_level=30, reorder_threshold=8,
            image_url="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
            equipment_type="Baseband Processing Unit (BBU)", frequency_band="Multi-Standard LTE / 5G NR",
            power_consumption_w=250.0, weight_kg=9.5, dimensions="483 x 350 x 44 mm (1U)", warranty_months=36
        ),
        EquipmentItem(
            category_id=cat_ran.id, sku="RAN-ANT-MIMO-65", name="CommScope 65° Multiband Massive MIMO Antenna",
            subcategory="Antennas", manufacturer="CommScope", model_number="RRZZ-65B-R4",
            part_number="7770100", description="12-port multiband sector antenna with integrated precision electrical tilt (RET)",
            tracking_mode="QUANTITY", unit_of_measure="UNIT", barcode="BC-RAN-ANT65",
            unit_cost=820.0, min_stock_level=20, max_stock_level=150, reorder_threshold=30,
            image_url="https://images.unsplash.com/photo-1520869562399-e772f142f422?auto=format&fit=crop&w=600&q=80",
            equipment_type="Massive MIMO Sector Antenna (AAU)", frequency_band="698-960 / 1695-2690 MHz",
            power_consumption_w=0.0, weight_kg=34.0, dimensions="2080 x 380 x 170 mm", warranty_months=60
        ),
        # Transmission
        EquipmentItem(
            category_id=cat_tx.id, sku="TX-SFP-10G-LR", name="Finisar 10GBASE-LR SFP+ Optical Transceiver (10km 1310nm)",
            subcategory="Optical Modules", manufacturer="Finisar", model_number="FTLX1471D3BCL",
            part_number="10G-SFP-LR", description="Single-mode optical transceiver for CPRI fronthaul and 10GE backhaul transport",
            tracking_mode="QUANTITY", unit_of_measure="UNIT", barcode="BC-TX-SFP10",
            unit_cost=45.0, min_stock_level=50, max_stock_level=500, reorder_threshold=100,
            image_url="https://images.unsplash.com/photo-1551703599-6b3e8379aa8b?auto=format&fit=crop&w=600&q=80",
            equipment_type="Optical SFP+ Transceiver", frequency_band="1310 nm Singlemode (10km)",
            power_consumption_w=1.5, weight_kg=0.03, dimensions="56.5 x 13.4 x 8.5 mm", warranty_months=24
        ),
        EquipmentItem(
            category_id=cat_tx.id, sku="TX-MW-IDU-VR4", name="NEC iPASOLINK VR4 Microwave Indoor Unit",
            subcategory="Microwave Radios", manufacturer="NEC", model_number="iPASOLINK VR4",
            part_number="MDP-1200MB", description="Modular high-capacity packet microwave indoor unit with XPIC and 10GE interfaces",
            tracking_mode="SERIALIZED", unit_of_measure="UNIT", barcode="BC-TX-NECVR4",
            unit_cost=2900.0, min_stock_level=6, max_stock_level=40, reorder_threshold=10,
            image_url="https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=600&q=80",
            equipment_type="Microwave Indoor Unit (IDU)", frequency_band="6 - 42 GHz Carrier Backhaul",
            power_consumption_w=110.0, weight_kg=6.2, dimensions="440 x 240 x 44 mm (1U)", warranty_months=36
        ),
        # Passive
        EquipmentItem(
            category_id=cat_passive.id, sku="PAS-CBL-78-100M", name="Andrew 7/8 inch Coaxial Low-Loss Feeder Cable (100m Roll)",
            subcategory="Cables & Feeders", manufacturer="Andrew / CommScope", model_number="AVA5-50",
            part_number="AVA5-50-100", description="50 Ohm corrugated copper outer conductor coaxial cable for low attenuation RF feeder runs",
            tracking_mode="QUANTITY", unit_of_measure="ROLL", barcode="BC-PAS-AVA5",
            unit_cost=220.0, min_stock_level=15, max_stock_level=120, reorder_threshold=25,
            image_url="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
            equipment_type="Coaxial RF Feeder Cable", frequency_band="DC to 5.0 GHz",
            power_consumption_w=0.0, weight_kg=48.0, dimensions="100m Spool (Outer Dia: 28mm)", warranty_months=120
        ),
        EquipmentItem(
            category_id=cat_passive.id, sku="PAS-JMP-DIN-3M", name="Huber+Suhner 1/2 inch Superflexible RF Jumper DIN-to-4.3-10 (3m)",
            subcategory="RF Jumpers", manufacturer="Huber+Suhner", model_number="SUCOFEED 1/2 HF",
            part_number="SF12-3M-DIN", description="Low PIM (-160 dBc) weather-sealed RF jumper cable with factory-molded boots",
            tracking_mode="QUANTITY", unit_of_measure="UNIT", barcode="BC-PAS-JMP3M",
            unit_cost=55.0, min_stock_level=40, max_stock_level=300, reorder_threshold=60,
            image_url="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
            equipment_type="Superflexible RF Jumper Cable", frequency_band="DC to 3.8 GHz",
            power_consumption_w=0.0, weight_kg=0.8, dimensions="3.0m Length (1/2 inch Dia)", warranty_months=60
        ),
        # Power
        EquipmentItem(
            category_id=cat_pwr.id, sku="PWR-RECT-48V-3KW", name="Vertiv NetSure eSure 48V 3000W High Efficiency Rectifier Module",
            subcategory="Rectifiers & DC Power", manufacturer="Vertiv", model_number="R48-3000e3",
            part_number="1R483000E3", description="96.5% peak efficiency hot-swappable DC power rectifier module with CAN communication",
            tracking_mode="SERIALIZED", unit_of_measure="UNIT", barcode="BC-PWR-R483000",
            unit_cost=750.0, min_stock_level=8, max_stock_level=50, reorder_threshold=12,
            image_url="https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80",
            equipment_type="DC Power Rectifier Module", frequency_band="48V DC / 96.5% High Efficiency",
            power_consumption_w=3000.0, weight_kg=2.8, dimensions="132 x 85 x 287 mm", warranty_months=36
        ),
        EquipmentItem(
            category_id=cat_pwr.id, sku="PWR-BAT-48V-100AH", name="EnerSys PowerSafe 48V 100Ah VRLA Front Terminal Battery Bank",
            subcategory="Batteries", manufacturer="EnerSys", model_number="12V100FC",
            part_number="ES-12V100FC", description="Telecom backup battery string engineered for standard 19/23 inch outdoor cabinets",
            tracking_mode="SERIALIZED", unit_of_measure="SET", barcode="BC-PWR-BAT100",
            unit_cost=1250.0, min_stock_level=4, max_stock_level=25, reorder_threshold=6,
            image_url="https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80",
            equipment_type="VRLA Front Terminal Battery Bank", frequency_band="48V DC (100Ah String)",
            power_consumption_w=0.0, weight_kg=145.0, dimensions="395 x 108 x 287 mm per Block", warranty_months=48
        ),
        # Core IP
        EquipmentItem(
            category_id=cat_core.id, sku="CORE-RTR-ASR903", name="Cisco ASR 903 Aggregation Services Router Chassis",
            subcategory="Routers & Core IP", manufacturer="Cisco", model_number="ASR-903",
            part_number="ASR-903=", description="Carrier-grade cell-site aggregation Ethernet router with redundant power and RSP modules",
            tracking_mode="SERIALIZED", unit_of_measure="UNIT", barcode="BC-CORE-ASR903",
            unit_cost=6200.0, min_stock_level=3, max_stock_level=15, reorder_threshold=5,
            image_url="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
            equipment_type="Aggregation Services Router", frequency_band="100G Carrier Ethernet / MPLS",
            power_consumption_w=650.0, weight_kg=18.5, dimensions="440 x 460 x 133 mm (3U)", warranty_months=36
        ),
        # Tools & Safety
        EquipmentItem(
            category_id=cat_tools.id, sku="TOOL-ANRITSU-S331E", name="Anritsu Site Master S331E Cable & Antenna Analyzer",
            subcategory="Test Instruments", manufacturer="Anritsu", model_number="S331E",
            part_number="S331E-001", description="Handheld RF cable and antenna analyzer with return loss, VSWR, and distance-to-fault measurements",
            tracking_mode="SERIALIZED", unit_of_measure="UNIT", barcode="BC-TOOL-S331E",
            unit_cost=4200.0, min_stock_level=2, max_stock_level=10, reorder_threshold=3,
            image_url="https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=600&q=80",
            equipment_type="Handheld Cable & Antenna Analyzer", frequency_band="2 MHz to 4.0 GHz Sweep",
            power_consumption_w=15.0, weight_kg=2.7, dimensions="273 x 199 x 91 mm", warranty_months=24
        ),
    ]
    db.add_all(items)
    db.flush()

    # Map items by SKU
    item_map = {it.sku: it for it in items}

    # --- 5. INITIAL BALANCES & SERIALIZED ASSETS ---
    # Setup Dubai Central balances
    bals = [
        # Dubai Main Depot
        InventoryBalance(item_id=item_map["RAN-RRU-4415"].id, warehouse_id=wh_dxb_main.id, location_id=locations[0].id, quantity_on_hand=18.0, quantity_available=16.0, quantity_reserved=2.0, quantity_borrowed=0.0, quantity_in_transit=0.0, quantity_damaged=0.0, quantity_quarantined=0.0),
        InventoryBalance(item_id=item_map["RAN-BBU-6630"].id, warehouse_id=wh_dxb_main.id, location_id=locations[1].id, quantity_on_hand=8.0, quantity_available=8.0, quantity_reserved=0.0, quantity_borrowed=0.0, quantity_in_transit=0.0, quantity_damaged=0.0, quantity_quarantined=0.0),
        InventoryBalance(item_id=item_map["RAN-ANT-MIMO-65"].id, warehouse_id=wh_dxb_main.id, location_id=locations[0].id, quantity_on_hand=64.0, quantity_available=64.0, quantity_reserved=0.0, quantity_borrowed=0.0, quantity_in_transit=0.0, quantity_damaged=0.0, quantity_quarantined=0.0),
        InventoryBalance(item_id=item_map["TX-SFP-10G-LR"].id, warehouse_id=wh_dxb_main.id, location_id=locations[2].id, quantity_on_hand=240.0, quantity_available=240.0, quantity_reserved=0.0, quantity_borrowed=0.0, quantity_in_transit=0.0, quantity_damaged=0.0, quantity_quarantined=0.0),
        InventoryBalance(item_id=item_map["PAS-CBL-78-100M"].id, warehouse_id=wh_dxb_main.id, location_id=locations[2].id, quantity_on_hand=45.0, quantity_available=45.0, quantity_reserved=0.0, quantity_borrowed=0.0, quantity_in_transit=0.0, quantity_damaged=0.0, quantity_quarantined=0.0),
        InventoryBalance(item_id=item_map["PAS-JMP-DIN-3M"].id, warehouse_id=wh_dxb_main.id, location_id=locations[2].id, quantity_on_hand=120.0, quantity_available=120.0, quantity_reserved=0.0, quantity_borrowed=0.0, quantity_in_transit=0.0, quantity_damaged=0.0, quantity_quarantined=0.0),
        InventoryBalance(item_id=item_map["PWR-RECT-48V-3KW"].id, warehouse_id=wh_dxb_main.id, location_id=locations[3].id, quantity_on_hand=14.0, quantity_available=14.0, quantity_reserved=0.0, quantity_borrowed=0.0, quantity_in_transit=0.0, quantity_damaged=0.0, quantity_quarantined=0.0),
        InventoryBalance(item_id=item_map["CORE-RTR-ASR903"].id, warehouse_id=wh_dxb_main.id, location_id=locations[1].id, quantity_on_hand=5.0, quantity_available=5.0, quantity_reserved=0.0, quantity_borrowed=0.0, quantity_in_transit=0.0, quantity_damaged=0.0, quantity_quarantined=0.0),
        InventoryBalance(item_id=item_map["TOOL-ANRITSU-S331E"].id, warehouse_id=wh_dxb_main.id, location_id=locations[1].id, quantity_on_hand=4.0, quantity_available=3.0, quantity_reserved=0.0, quantity_borrowed=1.0, quantity_in_transit=0.0, quantity_damaged=0.0, quantity_quarantined=0.0),

        # Abu Dhabi Main Depot
        InventoryBalance(item_id=item_map["RAN-RRU-4415"].id, warehouse_id=wh_auh_main.id, location_id=locations[4].id, quantity_on_hand=6.0, quantity_available=6.0, quantity_reserved=0.0, quantity_borrowed=0.0, quantity_in_transit=0.0, quantity_damaged=0.0, quantity_quarantined=0.0),
        InventoryBalance(item_id=item_map["RAN-ANT-MIMO-65"].id, warehouse_id=wh_auh_main.id, location_id=locations[4].id, quantity_on_hand=18.0, quantity_available=18.0, quantity_reserved=0.0, quantity_borrowed=0.0, quantity_in_transit=0.0, quantity_damaged=0.0, quantity_quarantined=0.0),
        InventoryBalance(item_id=item_map["TX-SFP-10G-LR"].id, warehouse_id=wh_auh_main.id, location_id=locations[4].id, quantity_on_hand=80.0, quantity_available=80.0, quantity_reserved=0.0, quantity_borrowed=0.0, quantity_in_transit=0.0, quantity_damaged=0.0, quantity_quarantined=0.0),
        InventoryBalance(item_id=item_map["PWR-BAT-48V-100AH"].id, warehouse_id=wh_auh_main.id, location_id=locations[4].id, quantity_on_hand=6.0, quantity_available=6.0, quantity_reserved=0.0, quantity_borrowed=0.0, quantity_in_transit=0.0, quantity_damaged=0.0, quantity_quarantined=0.0),
        InventoryBalance(item_id=item_map["TOOL-ANRITSU-S331E"].id, warehouse_id=wh_auh_main.id, location_id=locations[5].id, quantity_on_hand=2.0, quantity_available=2.0, quantity_reserved=0.0, quantity_borrowed=0.0, quantity_in_transit=0.0, quantity_damaged=0.0, quantity_quarantined=0.0),
    ]
    db.add_all(bals)
    db.flush()

    # Create Real Serialized Assets for RRUs, BBUs, Routers, Meters
    serials_to_create = []
    # 18 RRUs in Dubai Main
    for i in range(1, 19):
        status_val = "AVAILABLE"
        if i in [17, 18]:
            status_val = "RESERVED"
        serials_to_create.append(SerializedAsset(
            item_id=item_map["RAN-RRU-4415"].id,
            serial_number=f"RRU-DXB-{1000 + i}",
            barcode=f"BC-RRU-DXB-{1000 + i}",
            current_warehouse_id=wh_dxb_main.id,
            current_location_id=locations[0].id,
            status=status_val,
            ownership="COMPANY",
            condition="NEW"
        ))

    # 6 RRUs in AUH Main
    for i in range(1, 7):
        serials_to_create.append(SerializedAsset(
            item_id=item_map["RAN-RRU-4415"].id,
            serial_number=f"RRU-AUH-{2000 + i}",
            barcode=f"BC-RRU-AUH-{2000 + i}",
            current_warehouse_id=wh_auh_main.id,
            current_location_id=locations[4].id,
            status="AVAILABLE",
            ownership="COMPANY",
            condition="NEW"
        ))

    # 4 Anritsu Analyzers
    serials_to_create.append(SerializedAsset(
        item_id=item_map["TOOL-ANRITSU-S331E"].id,
        serial_number="ANR-DXB-9001",
        barcode="BC-ANR-9001",
        current_warehouse_id=wh_dxb_main.id,
        current_location_id=locations[1].id,
        status="AVAILABLE",
        ownership="COMPANY",
        condition="GOOD"
    ))
    serials_to_create.append(SerializedAsset(
        item_id=item_map["TOOL-ANRITSU-S331E"].id,
        serial_number="ANR-DXB-9002",
        barcode="BC-ANR-9002",
        current_warehouse_id=wh_dxb_main.id,
        current_location_id=locations[1].id,
        status="BORROWED",
        ownership="COMPANY",
        condition="GOOD"
    ))
    serials_to_create.append(SerializedAsset(
        item_id=item_map["TOOL-ANRITSU-S331E"].id,
        serial_number="ANR-DXB-9003",
        barcode="BC-ANR-9003",
        current_warehouse_id=wh_dxb_main.id,
        current_location_id=locations[1].id,
        status="AVAILABLE",
        ownership="COMPANY",
        condition="GOOD"
    ))
    serials_to_create.append(SerializedAsset(
        item_id=item_map["TOOL-ANRITSU-S331E"].id,
        serial_number="ANR-AUH-9004",
        barcode="BC-ANR-9004",
        current_warehouse_id=wh_auh_main.id,
        current_location_id=locations[5].id,
        status="AVAILABLE",
        ownership="COMPANY",
        condition="GOOD"
    ))

    db.add_all(serials_to_create)
    db.flush()

    # --- 6. INITIAL STOCK MOVEMENT LEDGER ENTRIES ---
    m1 = StockMovementLedger(
        movement_type="RECEIVE",
        reference_type="GOODS_RECEIPT",
        reference_id="GRN-20261001-INIT01",
        item_id=item_map["RAN-RRU-4415"].id,
        serial_number="RRU-DXB-1001 to RRU-DXB-1018",
        from_warehouse_id=None,
        to_warehouse_id=wh_dxb_main.id,
        quantity=18.0,
        balance_before=0.0,
        balance_after=18.0,
        performed_by_id=u_admin.id,
        reason="Initial Commissioning Inbound Receipt"
    )
    m2 = StockMovementLedger(
        movement_type="RECEIVE",
        reference_type="GOODS_RECEIPT",
        reference_id="GRN-20261001-INIT02",
        item_id=item_map["RAN-ANT-MIMO-65"].id,
        serial_number=None,
        from_warehouse_id=None,
        to_warehouse_id=wh_dxb_main.id,
        quantity=64.0,
        balance_before=0.0,
        balance_after=64.0,
        performed_by_id=u_admin.id,
        reason="Bulk Antenna Receipt from CommScope"
    )
    db.add_all([m1, m2])
    db.flush()

    # --- 7. SUPPLIERS & PURCHASE ORDERS ---
    sup1 = Supplier(code="SUP-ERICSSON", name="Ericsson Middle East & Africa FZ-LLC", contact_person="Lars Lindqvist", email="supply.mea@ericsson.com", phone="+971-4-3901111", address="Dubai Media City Building 4")
    sup2 = Supplier(code="SUP-COMMSCOPE", name="CommScope Connectivity MENA", contact_person="Ahmad Radwan", email="mena.sales@commscope.com", phone="+971-4-3602222", address="JAFZA South Zone")
    sup3 = Supplier(code="SUP-VERTIV", name="Vertiv Energy Systems UAE", contact_person="Marco Rossi", email="gulf@vertiv.com", phone="+971-4-8833333", address="Dubai Silicon Oasis")
    db.add_all([sup1, sup2, sup3])
    db.flush()

    po1 = PurchaseOrder(
        po_number="PO-202610-001",
        supplier_id=sup1.id,
        target_warehouse_id=wh_dxb_main.id,
        order_date=datetime.utcnow() - timedelta(days=10),
        expected_delivery_date=datetime.utcnow() + timedelta(days=5),
        total_amount=34500.0,
        status="APPROVED",
        notes="Q4 5G Expansion Radio Units"
    )
    db.add(po1)
    db.flush()

    po1_item = PurchaseOrderItem(
        po_id=po1.id,
        item_id=item_map["RAN-RRU-4415"].id,
        ordered_quantity=10.0,
        received_quantity=0.0,
        unit_price=3450.0
    )
    db.add(po1_item)

    # --- 8. EXPANSION PROJECT WITH BILL OF MATERIALS ---
    proj1 = ExpansionProject(
        project_code="PRJ-5G-DXB-ROLLOUT",
        name="Dubai Metro Phase 4 - 5G NR Carrier Rollout",
        target_cluster_id=cl_metro.id,
        site_id="SITE-DXB-MARINA-501",
        project_type="5G_ROLLOUT",
        priority="HIGH",
        manager_id=u_fe.id,
        status="PLANNING",
        target_start_date=datetime.utcnow() + timedelta(days=2),
        target_completion_date=datetime.utcnow() + timedelta(days=45),
        budget=125000.0,
        notes="High-density urban capacity rollout with massive MIMO antennas and 4T4R RRUs"
    )
    db.add(proj1)
    db.flush()

    bom1 = ProjectBOMItem(project_id=proj1.id, item_id=item_map["RAN-RRU-4415"].id, required_quantity=6.0, allocated_quantity=2.0)
    bom2 = ProjectBOMItem(project_id=proj1.id, item_id=item_map["RAN-ANT-MIMO-65"].id, required_quantity=6.0, allocated_quantity=0.0)
    bom3 = ProjectBOMItem(project_id=proj1.id, item_id=item_map["TX-SFP-10G-LR"].id, required_quantity=24.0, allocated_quantity=0.0)
    bom4 = ProjectBOMItem(project_id=proj1.id, item_id=item_map["PWR-RECT-48V-3KW"].id, required_quantity=2.0, allocated_quantity=0.0)
    db.add_all([bom1, bom2, bom3, bom4])

    # --- 9. ACTIVE EQUIPMENT LOAN ---
    loan1 = EquipmentLoan(
        loan_number="LN-202610-001",
        borrower_name="Omar Al-Rashed",
        borrower_department="RF Optimization Team",
        borrower_email="omar.opt@apextelecom.com",
        borrower_phone="+971-50-1234567",
        issuing_warehouse_id=wh_dxb_main.id,
        item_id=item_map["TOOL-ANRITSU-S331E"].id,
        serial_number="ANR-DXB-9002",
        quantity=1.0,
        purpose="Marina Site 501 RF Sweep & VSWR Measurement",
        issue_date=datetime.utcnow() - timedelta(days=2),
        expected_return_date=datetime.utcnow() + timedelta(days=3),
        status="ISSUED",
        condition_on_issue="GOOD",
        issued_by_id=u_wo.id
    )
    db.add(loan1)

    db.commit()
    db.close()
    print("Seed complete: Realistic telecom enterprise database initialized successfully!")

if __name__ == "__main__":
    run_seed()
