"""
Iteration 8 Tests: Inventory Item Editing (PUT endpoint)
Tests the new PUT /api/warehouses/{wh_id}/inventory/{item_id} endpoint
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInventoryEdit:
    """Test inventory item editing functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token, create test warehouse and item"""
        # Login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@leiva.com",
            "password": "newpass123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create test warehouse
        wh_name = f"TEST_WH_EDIT_{uuid.uuid4().hex[:6]}"
        wh_resp = requests.post(f"{BASE_URL}/api/warehouses", 
            json={"name": wh_name, "city": "Madrid"},
            headers=self.headers
        )
        assert wh_resp.status_code == 200, f"Warehouse creation failed: {wh_resp.text}"
        self.warehouse = wh_resp.json()
        self.warehouse_id = self.warehouse["id"]
        
        # Create test inventory item
        item_resp = requests.post(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory",
            json={
                "product_name": "TEST_PRODUCT_ORIGINAL",
                "sku": "TEST-SKU-001",
                "quantity": 10,
                "location": "A1-01",
                "supplier": "Original Supplier",
                "batch": "BATCH-001",
                "weight_kg": 5.5,
                "dimensions": "30x20x10 cm",
                "entry_date": "2024-01-15",
                "notes": "Original notes"
            },
            headers=self.headers
        )
        assert item_resp.status_code == 200, f"Inventory item creation failed: {item_resp.text}"
        self.item = item_resp.json()
        self.item_id = self.item["id"]
        
        yield
        
        # Teardown: Delete test data
        requests.delete(f"{BASE_URL}/api/warehouses/{self.warehouse_id}", headers=self.headers)
    
    def test_edit_product_name(self):
        """Test editing product_name field"""
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={"product_name": "UPDATED_PRODUCT_NAME"},
            headers=self.headers
        )
        assert resp.status_code == 200, f"Edit failed: {resp.text}"
        data = resp.json()
        assert data["product_name"] == "UPDATED_PRODUCT_NAME"
        print("SUCCESS: product_name updated correctly")
    
    def test_edit_sku(self):
        """Test editing sku field"""
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={"sku": "UPDATED-SKU-999"},
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["sku"] == "UPDATED-SKU-999"
        print("SUCCESS: sku updated correctly")
    
    def test_edit_quantity(self):
        """Test editing quantity field"""
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={"quantity": 50},
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["quantity"] == 50
        print("SUCCESS: quantity updated correctly")
    
    def test_edit_supplier(self):
        """Test editing supplier field"""
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={"supplier": "New Supplier Co."},
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["supplier"] == "New Supplier Co."
        print("SUCCESS: supplier updated correctly")
    
    def test_edit_location(self):
        """Test editing location field"""
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={"location": "B2-05"},
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["location"] == "B2-05"
        print("SUCCESS: location updated correctly")
    
    def test_edit_batch(self):
        """Test editing batch field"""
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={"batch": "BATCH-NEW-002"},
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["batch"] == "BATCH-NEW-002"
        print("SUCCESS: batch updated correctly")
    
    def test_edit_weight_kg(self):
        """Test editing weight_kg field"""
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={"weight_kg": 12.75},
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["weight_kg"] == 12.75
        print("SUCCESS: weight_kg updated correctly")
    
    def test_edit_dimensions(self):
        """Test editing dimensions field"""
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={"dimensions": "50x40x30 cm"},
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["dimensions"] == "50x40x30 cm"
        print("SUCCESS: dimensions updated correctly")
    
    def test_edit_entry_date(self):
        """Test editing entry_date field"""
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={"entry_date": "2025-01-20"},
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["entry_date"] == "2025-01-20"
        print("SUCCESS: entry_date updated correctly")
    
    def test_edit_notes(self):
        """Test editing notes field"""
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={"notes": "Updated notes with new information"},
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["notes"] == "Updated notes with new information"
        print("SUCCESS: notes updated correctly")
    
    def test_edit_import_reference(self):
        """Test editing import_reference field"""
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={"import_reference": "IMP-2025-001"},
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["import_reference"] == "IMP-2025-001"
        print("SUCCESS: import_reference updated correctly")
    
    def test_edit_multiple_fields(self):
        """Test editing multiple fields at once"""
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={
                "product_name": "MULTI_FIELD_UPDATE",
                "sku": "MULTI-SKU-999",
                "quantity": 100,
                "supplier": "Multi Supplier",
                "location": "C3-07",
                "weight_kg": 25.5,
                "notes": "Multiple fields updated"
            },
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["product_name"] == "MULTI_FIELD_UPDATE"
        assert data["sku"] == "MULTI-SKU-999"
        assert data["quantity"] == 100
        assert data["supplier"] == "Multi Supplier"
        assert data["location"] == "C3-07"
        assert data["weight_kg"] == 25.5
        assert data["notes"] == "Multiple fields updated"
        print("SUCCESS: Multiple fields updated correctly")
    
    def test_edit_persists_to_database(self):
        """Test that edits persist - edit then GET to verify"""
        # Edit
        put_resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={"product_name": "PERSIST_TEST_NAME", "quantity": 77},
            headers=self.headers
        )
        assert put_resp.status_code == 200
        
        # GET to verify persistence
        get_resp = requests.get(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory",
            headers=self.headers
        )
        assert get_resp.status_code == 200
        items = get_resp.json()
        
        # Find our item
        our_item = next((i for i in items if i["id"] == self.item_id), None)
        assert our_item is not None, "Item not found in inventory list"
        assert our_item["product_name"] == "PERSIST_TEST_NAME"
        assert our_item["quantity"] == 77
        print("SUCCESS: Edit persisted to database and verified via GET")
    
    def test_edit_returns_updated_at_timestamp(self):
        """Test that edit response includes updated_at field"""
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={"product_name": "TIMESTAMP_TEST"},
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "updated_at" in data, "Response should include updated_at timestamp"
        print(f"SUCCESS: updated_at timestamp present: {data['updated_at']}")
    
    def test_edit_nonexistent_item_returns_404(self):
        """Test that editing non-existent item returns 404"""
        fake_id = str(uuid.uuid4())
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{fake_id}",
            json={"product_name": "Should fail"},
            headers=self.headers
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("SUCCESS: Non-existent item returns 404")
    
    def test_edit_wrong_warehouse_returns_404(self):
        """Test that editing item in wrong warehouse returns 404"""
        fake_warehouse_id = str(uuid.uuid4())
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{fake_warehouse_id}/inventory/{self.item_id}",
            json={"product_name": "Should fail"},
            headers=self.headers
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("SUCCESS: Wrong warehouse ID returns 404")
    
    def test_edit_requires_authentication(self):
        """Test that PUT endpoint requires authentication"""
        resp = requests.put(
            f"{BASE_URL}/api/warehouses/{self.warehouse_id}/inventory/{self.item_id}",
            json={"product_name": "No auth"},
            # No headers = no auth
        )
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("SUCCESS: Edit requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
