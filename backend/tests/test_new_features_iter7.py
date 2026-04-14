"""
Test suite for iteration 7 - New features:
1. Profitability Analysis module
2. Settings profile save (name, phone, company)
3. Settings integrations (M365 and AEAT config)
4. Enhanced warehouse inventory with traceability fields
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@leiva.com",
            "password": "newpass123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestProfitabilityAnalysis(TestAuth):
    """Test profitability analysis endpoint"""
    
    def test_profitability_analysis_returns_200(self, auth_headers):
        """GET /api/profitability-analysis returns 200"""
        response = requests.get(f"{BASE_URL}/api/profitability-analysis", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_profitability_analysis_has_summary(self, auth_headers):
        """Response contains summary object with KPI fields"""
        response = requests.get(f"{BASE_URL}/api/profitability-analysis", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data, "Missing 'summary' in response"
        summary = data["summary"]
        
        # Verify summary fields
        assert "total_revenue" in summary, "Missing 'total_revenue' in summary"
        assert "total_costs" in summary, "Missing 'total_costs' in summary"
        assert "total_margin" in summary, "Missing 'total_margin' in summary"
        assert "avg_margin_pct" in summary, "Missing 'avg_margin_pct' in summary"
        assert "total_imports" in summary, "Missing 'total_imports' in summary"
        assert "profitable_imports" in summary, "Missing 'profitable_imports' in summary"
    
    def test_profitability_analysis_has_imports(self, auth_headers):
        """Response contains imports array"""
        response = requests.get(f"{BASE_URL}/api/profitability-analysis", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "imports" in data, "Missing 'imports' in response"
        assert isinstance(data["imports"], list), "'imports' should be a list"
    
    def test_profitability_analysis_has_monthly_trend(self, auth_headers):
        """Response contains monthly_trend array"""
        response = requests.get(f"{BASE_URL}/api/profitability-analysis", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "monthly_trend" in data, "Missing 'monthly_trend' in response"
        assert isinstance(data["monthly_trend"], list), "'monthly_trend' should be a list"
    
    def test_profitability_analysis_has_cost_breakdown(self, auth_headers):
        """Response contains cost_breakdown array"""
        response = requests.get(f"{BASE_URL}/api/profitability-analysis", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "cost_breakdown" in data, "Missing 'cost_breakdown' in response"
        assert isinstance(data["cost_breakdown"], list), "'cost_breakdown' should be a list"
    
    def test_profitability_requires_auth(self):
        """Endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/profitability-analysis")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestSettingsProfile(TestAuth):
    """Test settings profile save endpoint"""
    
    def test_update_profile_name(self, auth_headers):
        """PUT /api/settings/profile saves name field"""
        test_name = f"TEST_Admin_{datetime.now().timestamp()}"
        response = requests.put(f"{BASE_URL}/api/settings/profile", 
            json={"name": test_name}, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("name") == test_name, f"Name not saved correctly: {data.get('name')}"
    
    def test_update_profile_phone(self, auth_headers):
        """PUT /api/settings/profile saves phone field"""
        test_phone = "+34 600 123 456"
        response = requests.put(f"{BASE_URL}/api/settings/profile", 
            json={"phone": test_phone}, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("phone") == test_phone, f"Phone not saved correctly: {data.get('phone')}"
    
    def test_update_profile_company(self, auth_headers):
        """PUT /api/settings/profile saves company field"""
        test_company = "TEST_Company S.L."
        response = requests.put(f"{BASE_URL}/api/settings/profile", 
            json={"company": test_company}, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("company") == test_company, f"Company not saved correctly: {data.get('company')}"
    
    def test_update_profile_all_fields(self, auth_headers):
        """PUT /api/settings/profile saves all fields at once"""
        profile_data = {
            "name": "Admin User Restored",
            "phone": "+34 600 000 000",
            "company": "Leiva Import S.L."
        }
        response = requests.put(f"{BASE_URL}/api/settings/profile", 
            json=profile_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("name") == profile_data["name"]
        assert data.get("phone") == profile_data["phone"]
        assert data.get("company") == profile_data["company"]
    
    def test_update_profile_requires_auth(self):
        """Profile update requires authentication"""
        response = requests.put(f"{BASE_URL}/api/settings/profile", json={"name": "Test"})
        assert response.status_code in [401, 403]


class TestSettingsIntegrations(TestAuth):
    """Test settings integrations endpoints"""
    
    def test_get_integrations_returns_200(self, auth_headers):
        """GET /api/settings/integrations returns 200"""
        response = requests.get(f"{BASE_URL}/api/settings/integrations", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_integrations_has_m365_object(self, auth_headers):
        """Response contains m365 object"""
        response = requests.get(f"{BASE_URL}/api/settings/integrations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "m365" in data, "Missing 'm365' in response"
        assert isinstance(data["m365"], dict), "'m365' should be an object"
    
    def test_get_integrations_has_aeat_object(self, auth_headers):
        """Response contains aeat object"""
        response = requests.get(f"{BASE_URL}/api/settings/integrations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "aeat" in data, "Missing 'aeat' in response"
        assert isinstance(data["aeat"], dict), "'aeat' should be an object"
    
    def test_save_m365_config(self, auth_headers):
        """PUT /api/settings/integrations saves M365 config"""
        m365_config = {
            "m365": {
                "tenant_id": "test-tenant-12345",
                "client_id": "test-client-67890",
                "client_secret": "test-secret",
                "sender_email": "test@example.com"
            },
            "aeat": {}
        }
        response = requests.put(f"{BASE_URL}/api/settings/integrations", 
            json=m365_config, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("m365", {}).get("tenant_id") == "test-tenant-12345"
        assert data.get("m365", {}).get("client_id") == "test-client-67890"
    
    def test_save_aeat_config(self, auth_headers):
        """PUT /api/settings/integrations saves AEAT config"""
        aeat_config = {
            "m365": {},
            "aeat": {
                "nif": "B12345678",
                "certificate_serial": "ABC123456",
                "environment": "test"
            }
        }
        response = requests.put(f"{BASE_URL}/api/settings/integrations", 
            json=aeat_config, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("aeat", {}).get("nif") == "B12345678"
        assert data.get("aeat", {}).get("environment") == "test"
    
    def test_integrations_persists_after_get(self, auth_headers):
        """Verify saved integrations persist after GET"""
        # First save
        config = {
            "m365": {"tenant_id": "persist-test-tenant"},
            "aeat": {"nif": "PERSIST123"}
        }
        save_response = requests.put(f"{BASE_URL}/api/settings/integrations", 
            json=config, headers=auth_headers)
        assert save_response.status_code == 200
        
        # Then GET to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/settings/integrations", headers=auth_headers)
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data.get("m365", {}).get("tenant_id") == "persist-test-tenant"
        assert data.get("aeat", {}).get("nif") == "PERSIST123"
    
    def test_integrations_requires_auth(self):
        """Integrations endpoints require authentication"""
        get_response = requests.get(f"{BASE_URL}/api/settings/integrations")
        assert get_response.status_code in [401, 403]
        
        put_response = requests.put(f"{BASE_URL}/api/settings/integrations", json={"m365": {}})
        assert put_response.status_code in [401, 403]


class TestEnhancedWarehouseInventory(TestAuth):
    """Test enhanced warehouse inventory with new fields"""
    
    @pytest.fixture(scope="class")
    def test_warehouse(self, auth_headers):
        """Create a test warehouse for inventory tests"""
        warehouse_data = {
            "name": f"TEST_Warehouse_{datetime.now().timestamp()}",
            "address": "Calle Test 123",
            "city": "Madrid",
            "province": "Madrid",
            "postal_code": "28001",
            "country": "Spain"
        }
        response = requests.post(f"{BASE_URL}/api/warehouses", 
            json=warehouse_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create warehouse: {response.text}"
        return response.json()
    
    def test_create_inventory_with_sku(self, auth_headers, test_warehouse):
        """POST inventory with SKU field"""
        item_data = {
            "product_name": "TEST_Product_SKU",
            "sku": "SKU-TEST-001",
            "quantity": 10
        }
        response = requests.post(f"{BASE_URL}/api/warehouses/{test_warehouse['id']}/inventory", 
            json=item_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("sku") == "SKU-TEST-001", f"SKU not saved: {data.get('sku')}"
    
    def test_create_inventory_with_supplier(self, auth_headers, test_warehouse):
        """POST inventory with supplier field"""
        item_data = {
            "product_name": "TEST_Product_Supplier",
            "supplier": "China Supplier Co.",
            "quantity": 5
        }
        response = requests.post(f"{BASE_URL}/api/warehouses/{test_warehouse['id']}/inventory", 
            json=item_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("supplier") == "China Supplier Co."
    
    def test_create_inventory_with_batch(self, auth_headers, test_warehouse):
        """POST inventory with batch field"""
        item_data = {
            "product_name": "TEST_Product_Batch",
            "batch": "BATCH-2026-001",
            "quantity": 20
        }
        response = requests.post(f"{BASE_URL}/api/warehouses/{test_warehouse['id']}/inventory", 
            json=item_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("batch") == "BATCH-2026-001"
    
    def test_create_inventory_with_weight_kg(self, auth_headers, test_warehouse):
        """POST inventory with weight_kg field"""
        item_data = {
            "product_name": "TEST_Product_Weight",
            "weight_kg": 25.5,
            "quantity": 3
        }
        response = requests.post(f"{BASE_URL}/api/warehouses/{test_warehouse['id']}/inventory", 
            json=item_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("weight_kg") == 25.5
    
    def test_create_inventory_with_dimensions(self, auth_headers, test_warehouse):
        """POST inventory with dimensions field"""
        item_data = {
            "product_name": "TEST_Product_Dimensions",
            "dimensions": "30x20x15 cm",
            "quantity": 8
        }
        response = requests.post(f"{BASE_URL}/api/warehouses/{test_warehouse['id']}/inventory", 
            json=item_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("dimensions") == "30x20x15 cm"
    
    def test_create_inventory_with_entry_date(self, auth_headers, test_warehouse):
        """POST inventory with entry_date field"""
        item_data = {
            "product_name": "TEST_Product_EntryDate",
            "entry_date": "2026-01-15",
            "quantity": 12
        }
        response = requests.post(f"{BASE_URL}/api/warehouses/{test_warehouse['id']}/inventory", 
            json=item_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("entry_date") == "2026-01-15"
    
    def test_create_inventory_all_new_fields(self, auth_headers, test_warehouse):
        """POST inventory with ALL new traceability fields"""
        item_data = {
            "product_name": "TEST_Product_Full",
            "sku": "SKU-FULL-001",
            "supplier": "Full Supplier Ltd",
            "batch": "BATCH-FULL-2026",
            "weight_kg": 50.75,
            "dimensions": "100x50x30 cm",
            "entry_date": "2026-01-20",
            "quantity": 100,
            "location": "A1-01-03",
            "import_reference": "IMP-2026-001",
            "notes": "Full test item with all fields"
        }
        response = requests.post(f"{BASE_URL}/api/warehouses/{test_warehouse['id']}/inventory", 
            json=item_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("sku") == "SKU-FULL-001"
        assert data.get("supplier") == "Full Supplier Ltd"
        assert data.get("batch") == "BATCH-FULL-2026"
        assert data.get("weight_kg") == 50.75
        assert data.get("dimensions") == "100x50x30 cm"
        assert data.get("entry_date") == "2026-01-20"
        assert data.get("location") == "A1-01-03"
        assert data.get("import_reference") == "IMP-2026-001"
    
    def test_get_inventory_returns_new_fields(self, auth_headers, test_warehouse):
        """GET inventory returns items with new fields"""
        response = requests.get(f"{BASE_URL}/api/warehouses/{test_warehouse['id']}/inventory", 
            headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Check that at least one item has the new fields
        if len(data) > 0:
            item = data[0]
            # These fields should exist (may be empty)
            expected_fields = ["sku", "supplier", "batch", "weight_kg", "dimensions", "entry_date"]
            for field in expected_fields:
                assert field in item, f"Missing field '{field}' in inventory item"
    
    def test_cleanup_test_warehouse(self, auth_headers, test_warehouse):
        """Cleanup: Delete test warehouse"""
        response = requests.delete(f"{BASE_URL}/api/warehouses/{test_warehouse['id']}", 
            headers=auth_headers)
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
