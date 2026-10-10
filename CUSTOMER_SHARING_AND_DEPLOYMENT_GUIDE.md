# ENTERPRISE TELECOM WAREHOUSE MANAGEMENT SYSTEM (TWMS)
## Customer Deployment, Operation & Evaluation Guide

Welcome to the **Enterprise Telecom Warehouse Management System (TWMS)**. This platform is an enterprise-grade inventory, asset tracking, logistics, and network expansion management system engineered specifically for telecommunications operators.

---

## 1. Quick Start: Launching the Application

### Option A: Windows (One-Click Launch)
1. Extract the `.zip` archive to any directory.
2. Double-click `run_twms.bat`.
3. The launcher will automatically verify dependencies, start the services, and open your default browser to:
   - **Frontend Application**: `http://localhost:3000` (or `http://127.0.0.1:8000`)
   - **Backend API & Swagger Docs**: `http://127.0.0.1:8000/docs`

### Option B: Linux / macOS
1. Extract the `.zip` archive and open a terminal in the project directory.
2. Make the launcher executable and run it:
   ```bash
   chmod +x run_twms.sh
   ./run_twms.sh
   ```
3. Open `http://localhost:3000` (or `http://127.0.0.1:8000`) in your browser.

---

## 2. Pre-Configured Personas & Login Credentials

The system comes pre-seeded with realistic telecom personnel across all operational tiers.
> **Universal Password for all accounts**: `Password123!`

| Role Persona | Username | Scoped Branch / Cluster | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Super Administrator** | `admin` | Enterprise-wide (Global) | System settings, user provisioning, global approvals, backups |
| **Warehouse Manager** | `wh_manager_dxb` | Dubai Logistics Hub (`BR-DXB-01`) | Inbound receiving, physical bin allocation, dispatch, counts |
| **Cluster Owner** | `cluster_owner_north` | Dubai Metro Cluster (`CL-DXB-METRO`) | Multi-branch overview, cross-branch transfers, cluster BOMs |
| **Branch Manager** | `branch_mgr_auh` | Abu Dhabi Branch (`BR-AUH-01`) | Local dispatch approval, local loans, variance approvals |
| **Field Engineer** | `field_eng_omar` | Network Rollout | Tool borrowing, site returns, viewing project BOM reservations |
| **Procurement Officer** | `proc_officer` | Supply Chain | Vendor purchase orders, receiving inspection sign-offs |
| **Internal Auditor** | `auditor_jane` | Enterprise-wide (Read-only) | Compliance review, immutable audit trail, stock reconciliation |

*Tip: In the top navigation bar of the web interface, use the **Persona Switcher Pill** to switch identities on the fly without repeatedly typing passwords!*

---

## 3. Core Enterprise Features & Customer Demo Scenarios

### 1. Equipment Catalogue with High-Resolution Photos & Specs
- Navigate to **Catalogue** in the sidebar.
- Switch between **Rich Picture Cards View** and **Dense Data Table View**.
- Inspect hardware details for Ericsson RRUs, Baseband units, CommScope massive MIMO antennas, Cisco routers, Vertiv rectifiers, and Anritsu analyzers.
- View operating frequencies, power consumption (Watts), physical dimensions, weights, and warranty periods.
- Click **"Inspect Details"** on any card to view multi-warehouse stock distribution and bin location coordinates.

### 2. Serialized Asset Tracking & Visual Chain of Custody
- Navigate to **Serialized Assets** in the sidebar.
- Click **"Chain of Custody"** on any unit (e.g. `SN-RRU4415-001` or `SN-OTDR-001`).
- Explore the interactive chronological audit timeline tracking every touchpoint from manufacturer receiving to field deployment and quarantine.

### 3. Laser Optical Barcode Scanner Simulation
- Click **"Scan Barcode"** in the top navigation bar.
- Test barcode scanning with one-click presets or custom scanner inputs.

### 4. Network Expansion Projects & Bill of Materials (BOM)
- Navigate to **Projects (BOM)**.
- Review the *5G Greenfield Macro Rollout* project.
- Demonstrate double-reservation prevention: stock committed to an approved project BOM is quarantined from general available inventory.

### 5. Inter-Branch Transfers & Discrepancy Resolution
- Navigate to **Transfers**.
- Dispatches decrement origin available stock and place units into `quantity_in_transit`.
- Destination receiving tracks discrepancies (e.g., 20 dispatched vs. 18 received) with mandatory supervisor alerts.

### 6. Borrowing, Field Deployment & Damaged Quarantine
- Navigate to **Borrowing (Loans)**.
- Issue high-value testing tools (e.g. Anritsu Site Master) to field engineers.
- When an item is returned with condition `DAMAGED`, the unit is automatically isolated into `QUARANTINED` status and triggers a maintenance ticket.

### 7. Physical Stock Counts & Supervisor Adjustment
- Navigate to **Stock Counts**.
- Conduct blind or guided physical stock takes. Discrepancies require supervisor sign-off before posting double-entry inventory ledger adjustments.

### 8. Automated Database Backup & Sandbox Restore
- Navigate to **Database Backup**.
- Create timestamped database snapshots with SHA-256 cryptographic verification.
- Test sandbox restore to verify backup integrity without impacting live operations.

---

## 4. System Architecture & Standards

- **Backend**: FastAPI (Python 3.10+) with SQLAlchemy 2.0 and Pydantic v2.
- **Database**: SQLite configured in **WAL mode** with foreign key constraints, synchronous NORMAL, and atomic row-level concurrency locking. Compatible with PostgreSQL.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons.
- **Security**: PBKDF2-HMAC-SHA256 password hashing, stateless Bearer JWT authentication, server-side branch and cluster query scoping.
- **Audit**: Immutable double-entry stock movement ledger preserving before/after state snapshots.
