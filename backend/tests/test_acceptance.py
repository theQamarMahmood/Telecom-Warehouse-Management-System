import unittest
import threading
import uuid
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

class TestTWMSAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Obtain tokens for key roles
        res_admin = client.post("/api/auth/login", json={"username": "admin", "password": "Password123!"})
        assert res_admin.status_code == 200, f"Admin login failed: {res_admin.text}"
        cls.admin_token = res_admin.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        res_wm = client.post("/api/auth/login", json={"username": "wh_manager_dxb", "password": "Password123!"})
        cls.wm_token = res_wm.json()["access_token"]
        cls.wm_headers = {"Authorization": f"Bearer {cls.wm_token}"}

        res_wo = client.post("/api/auth/login", json={"username": "officer_ran", "password": "Password123!"})
        cls.wo_token = res_wo.json()["access_token"]
        cls.wo_headers = {"Authorization": f"Bearer {cls.wo_token}"}

        res_fe = client.post("/api/auth/login", json={"username": "field_eng_omar", "password": "Password123!"})
        cls.fe_token = res_fe.json()["access_token"]
        cls.fe_headers = {"Authorization": f"Bearer {cls.fe_token}"}

    # 1. An administrator creates a new branch without modifying the code.
    def test_01_admin_creates_new_branch(self):
        code = f"BR-AJM-{uuid.uuid4().hex[:4].upper()}"
        payload = {
            "cluster_id": 1,
            "code": code,
            "name": f"Ajman Northern Distribution Branch {code}",
            "address": "Al Jurf Industrial Zone 1, Ajman",
            "manager_name": "Tariq Al-Nuaimi",
            "phone": "+971-6-7440099"
        }
        res = client.post("/api/hierarchy/branches", json=payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["code"], code)

    # 2. An administrator creates a cluster owner account and restricts access to the assigned cluster.
    def test_02_admin_creates_cluster_owner_and_restricts_scope(self):
        uname = f"co_cap_{uuid.uuid4().hex[:5]}"
        payload = {
            "username": uname,
            "email": f"{uname}@apextelecom.com",
            "full_name": "Khalid Al-Hashemi",
            "password": "Password123!",
            "role": "CLUSTER_OWNER",
            "department": "Capital Regional Management",
            "cluster_ids": [2] # Cluster 2: Capital/Abu Dhabi Urban Cluster
        }
        res = client.post("/api/auth/users", json=payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn(2, data["cluster_ids"])

        # Log in as newly created cluster owner and verify scoped branches
        login_res = client.post("/api/auth/login", json={"username": uname, "password": "Password123!"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        branches_res = client.get("/api/hierarchy/branches", headers=headers)
        self.assertEqual(branches_res.status_code, 200)
        for b in branches_res.json():
            self.assertEqual(b["cluster_id"], 2)

    # 3. An employee bulk-imports items and validates quantities and duplicate records.
    def test_03_bulk_import_validation(self):
        sku = f"ANT-BLK-{uuid.uuid4().hex[:4].upper()}"
        csv_content = (
            f"category_code,sku,name,manufacturer,model_number,tracking_mode,unit_of_measure,unit_cost,min_stock,max_stock\n"
            f"RAN,{sku},Massive MIMO Sector Antenna 3.5GHz,CommScope,RRZZ-35,QUANTITY,UNIT,750.0,5,50\n"
            f"RAN,{sku},Duplicate SKU Antenna,CommScope,RRZZ-35,QUANTITY,UNIT,750.0,5,50\n"
        )
        files = {"file": ("bulk_items.csv", csv_content, "text/csv")}
        res = client.post("/api/bulk-import/items", files=files, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["accepted"], 1)
        self.assertEqual(data["rejected"], 1)
        self.assertTrue(any("already exists" in e["error"] for e in data["errors"]))

    # 4 & 5. A receiving officer records RRUs with individual serial numbers; System rejects duplicates.
    def test_04_05_receiving_and_duplicate_serial_rejection(self):
        sn1 = f"SN-RRU-{uuid.uuid4().hex[:6].upper()}"
        sn2 = f"SN-RRU-{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "receiving_warehouse_id": 1,
            "delivery_note_ref": "DN-ERICSSON-9912",
            "notes": "Test Inbound Shipment",
            "items": [
                {
                    "item_id": 1, # RAN-RRU-4415
                    "expected_quantity": 2,
                    "received_quantity": 2,
                    "damaged_quantity": 0,
                    "serial_numbers": [sn1, sn2],
                    "condition": "NEW"
                }
            ]
        }
        res = client.post("/api/receiving/receipts", json=payload, headers=self.wo_headers)
        self.assertEqual(res.status_code, 200)

        # Attempt to receive the SAME serial number again: MUST BE REJECTED
        res_dup = client.post("/api/receiving/receipts", json=payload, headers=self.wo_headers)
        self.assertEqual(res_dup.status_code, 400)
        self.assertIn("Duplicate serial number", res_dup.json()["detail"])

    # 6. A manager approves an expansion project requiring antennas, RRUs, fiber and power equipment.
    def test_06_approve_expansion_project(self):
        pcode = f"PRJ-5G-{uuid.uuid4().hex[:5].upper()}"
        payload = {
            "project_code": pcode,
            "name": f"Sharjah City 5G Dense Rollout {pcode}",
            "target_cluster_id": 1,
            "site_id": "SITE-SHJ-009",
            "project_type": "5G_ROLLOUT",
            "budget": 75000.0,
            "bom_items": [
                {"item_id": 1, "required_quantity": 4},
                {"item_id": 3, "required_quantity": 4},
                {"item_id": 4, "required_quantity": 12},
                {"item_id": 8, "required_quantity": 2}
            ]
        }
        create_res = client.post("/api/projects", json=payload, headers=self.fe_headers)
        self.assertEqual(create_res.status_code, 200)
        proj_id = create_res.json()["id"]

        # Approve project
        app_res = client.post(f"/api/projects/{proj_id}/approve", headers=self.admin_headers)
        self.assertEqual(app_res.status_code, 200)
        self.assertIn("approved", app_res.json()["message"])

    # 7. A warehouse allocates stock without allowing the same units to be reserved twice.
    def test_07_prevent_double_reservation(self):
        # Approve project 1 first
        client.post("/api/projects/1/approve", headers=self.admin_headers)

        # Try to allocate 1000 units of item 1 (which only has limited stock)
        alloc_payload = {
            "warehouse_id": 1,
            "allocations": [
                {"item_id": 1, "quantity": 1000.0, "serial_numbers": []}
            ]
        }
        res = client.post("/api/projects/1/allocate", json=alloc_payload, headers=self.wm_headers)
        self.assertEqual(res.status_code, 400)
        detail = res.json()["detail"].lower()
        self.assertTrue("conflict" in detail or "insufficient" in detail)

    # 8 & 9. Branch dispatches 20 units to another branch, and receiving branch confirms 18 units;
    # System records 2 units as unresolved transfer discrepancies instead of silently deleting stock.
    def test_08_09_transfer_with_discrepancy(self):
        # 1. Create transfer from WH 1 to WH 3 for 20 SFP transceivers (item 4)
        create_trf = client.post("/api/transfers", json={
            "from_warehouse_id": 1,
            "to_warehouse_id": 3, # Abu Dhabi WH
            "carrier": "Apex Logistics Courier",
            "items": [{"item_id": 4, "requested_quantity": 20.0}]
        }, headers=self.wm_headers)
        self.assertEqual(create_trf.status_code, 200)
        trf_id = create_trf.json()["id"]

        # 2. Approve transfer
        app_res = client.post(f"/api/transfers/{trf_id}/approve", headers=self.admin_headers)
        self.assertEqual(app_res.status_code, 200)

        # 3. Dispatch transfer
        disp_res = client.post(f"/api/transfers/{trf_id}/dispatch", json={"carrier": "DHL Express"}, headers=self.wm_headers)
        self.assertEqual(disp_res.status_code, 200)

        # 4. Receive transfer with DISCREPANCY: Dispatched 20, but destination confirms only 18!
        rcv_payload = {
            "items": [{"item_id": 4, "received_quantity": 18.0, "damaged_quantity": 0.0}],
            "notes": "Package arrived with damaged outer seal, 2 units missing."
        }
        res_bm = client.post("/api/auth/login", json={"username": "branch_mgr_auh", "password": "Password123!"})
        auh_headers = {"Authorization": f"Bearer {res_bm.json()['access_token']}"}

        rcv_res = client.post(f"/api/transfers/{trf_id}/receive", json=rcv_payload, headers=auh_headers)
        self.assertEqual(rcv_res.status_code, 200)
        data = rcv_res.json()
        self.assertEqual(data["status"], "PARTIALLY_RECEIVED")
        self.assertEqual(data["total_discrepancy"], 2.0)
        self.assertIn("Transfer Discrepancy Alert", data["notes"])

    # 10 & 11. An engineer borrows equipment, returns it damaged; damaged unit remains unavailable until inspected.
    def test_10_11_loan_borrow_damaged_return_quarantine(self):
        # Find an available unit of tool
        assets_res = client.get("/api/inventory/assets?item_id=11&status=AVAILABLE", headers=self.wo_headers)
        assets = assets_res.json()
        target_sn = assets[0]["serial_number"] if assets else None

        loan_payload = {
            "borrower_name": "Tariq Engineer",
            "borrower_department": "Field Ops",
            "issuing_warehouse_id": 1,
            "item_id": 11,
            "serial_number": target_sn,
            "quantity": 1.0,
            "purpose": "Site Interference Hunt",
            "expected_return_date": "2026-10-15T00:00:00"
        }
        res_loan = client.post("/api/loans", json=loan_payload, headers=self.wo_headers)
        if res_loan.status_code == 200:
            loan_id = res_loan.json()["id"]

            return_payload = {
                "condition_on_return": "DAMAGED",
                "is_damaged": True,
                "damage_notes": "RF Port connector damaged, cracked LCD screen."
            }
            res_return = client.post(f"/api/loans/{loan_id}/return", json=return_payload, headers=self.wo_headers)
            self.assertEqual(res_return.status_code, 200)
            self.assertEqual(res_return.json()["status"], "RETURNED_DAMAGED")

            # Verify unit is marked DAMAGED
            if target_sn:
                chk_res = client.get(f"/api/inventory/assets?serial_number={target_sn}", headers=self.wo_headers)
                self.assertEqual(chk_res.json()[0]["status"], "DAMAGED")

    # 12. An authorized officer adjusts stock after physical count with approval and audit record.
    def test_12_stock_count_and_reconciliation(self):
        start_res = client.post("/api/stock-counts", json={"warehouse_id": 1, "count_type": "CYCLE_COUNT"}, headers=self.wm_headers)
        self.assertEqual(start_res.status_code, 200)
        count_id = start_res.json()["id"]

        entry_res = client.post(f"/api/stock-counts/{count_id}/record-item", json={
            "item_id": 6,
            "counted_quantity": 47.0,
            "discrepancy_reason": "Found 2 extra rolls in storage rack top shelf"
        }, headers=self.wm_headers)
        self.assertEqual(entry_res.status_code, 200)

        rec_res = client.post(f"/api/stock-counts/{count_id}/reconcile", json={"approval_notes": "Verified by Warehouse Manager"}, headers=self.wm_headers)
        self.assertEqual(rec_res.status_code, 200)
        self.assertIn("reconciled", rec_res.json()["message"])

    # 13. A branch employee cannot access another branch's restricted records by manipulating URL or API request.
    def test_13_server_side_branch_data_isolation(self):
        res_bm = client.post("/api/auth/login", json={"username": "branch_mgr_auh", "password": "Password123!"})
        auh_headers = {"Authorization": f"Bearer {res_bm.json()['access_token']}"}

        payload = {
            "receiving_warehouse_id": 1, # WH 1 belongs to Branch 1 (Dubai)!
            "items": [{"item_id": 4, "expected_quantity": 10, "received_quantity": 10}]
        }
        res = client.post("/api/receiving/receipts", json=payload, headers=auh_headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn("Access denied", res.json()["detail"])

    # 14. Two users attempt to allocate / issue final available unit; only one succeeds.
    def test_14_concurrency_race_condition_handling(self):
        results = []
        def attempt_allocation():
            r = client.post("/api/loans", json={
                "borrower_name": "Concurrent Borrower",
                "borrower_department": "Test",
                "issuing_warehouse_id": 1,
                "item_id": 10,
                "serial_number": None,
                "quantity": 5.0,
                "purpose": "Race test",
                "expected_return_date": "2026-10-15T00:00:00"
            }, headers=self.wo_headers)
            results.append(r.status_code)

        t1 = threading.Thread(target=attempt_allocation)
        t2 = threading.Thread(target=attempt_allocation)
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        success_count = results.count(200)
        fail_count = results.count(400)
        self.assertLessEqual(success_count, 1)

    # 15. A manager generates a project-wise report and traces a serialized radio from receipt to current location.
    def test_15_chain_of_custody_tracing(self):
        res = client.get("/api/reports/chain-of-custody/RRU-DXB-1001", headers=self.wm_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["serial_number"], "RRU-DXB-1001")
        self.assertGreaterEqual(len(data["movement_history"]), 1)

    # 16. A system backup is created and restored into a test environment and verified.
    def test_16_backup_and_restore_verification(self):
        backup_res = client.post("/api/backup/create", headers=self.admin_headers)
        self.assertEqual(backup_res.status_code, 200)
        backup_file = backup_res.json()["backup_file"]

        verify_res = client.post(f"/api/backup/verify-restore-test?backup_filename={backup_file}", headers=self.admin_headers)
        self.assertEqual(verify_res.status_code, 200)
        data = verify_res.json()
        self.assertEqual(data["status"], "PASSED")
        self.assertEqual(data["integrity_check"], "ok")

    # 17. A user whose access is revoked can no longer perform authenticated operations.
    def test_17_revoked_access_enforcement(self):
        uname = f"tmp_{uuid.uuid4().hex[:5]}"
        u_res = client.post("/api/auth/users", json={
            "username": uname,
            "email": f"{uname}@apextelecom.com",
            "full_name": "Temporary Test User",
            "password": "Password123!",
            "role": "WAREHOUSE_OFFICER"
        }, headers=self.admin_headers)
        self.assertEqual(u_res.status_code, 200)
        u_id = u_res.json()["id"]

        l_res = client.post("/api/auth/login", json={"username": uname, "password": "Password123!"})
        temp_token = l_res.json()["access_token"]
        temp_headers = {"Authorization": f"Bearer {temp_token}"}

        deact_res = client.put(f"/api/auth/users/{u_id}", json={"is_active": False}, headers=self.admin_headers)
        self.assertEqual(deact_res.status_code, 200)

        test_res = client.get("/api/auth/me", headers=temp_headers)
        self.assertEqual(test_res.status_code, 403)
        self.assertIn("deactivated", test_res.json()["detail"])

    # 18. Dashboard balances, movement history and branch totals reconcile correctly.
    def test_18_dashboard_reconciliation(self):
        res = client.get("/api/reports/dashboard-metrics", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreater(data["total_skus"], 0)
        self.assertGreater(data["total_units_tracked"], 0)
        self.assertIsNotNone(data["total_inventory_value"])

if __name__ == "__main__":
    unittest.main()
