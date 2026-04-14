"""
Test suite for new features: Accounting, Warehouses, Password Recovery
Testing CRUD operations for:
- Accounting transactions (income, expense, tax)
- Warehouse management with inventory
- Password recovery flow
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://leiva-saas.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"

# Test data tracking
test_data = {
    "token": None,
    "transaction_ids": [],
    "warehouse_id": None,
    "inventory_item_id": None,
    "reset_token": None,
    "test_user_email": f"TEST_user_{uuid.uuid4().hex[:8]}@test.com"
}


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token by logging in with test credentials"""
    # First try existing test user
    response = requests.post(f"{API_URL}/auth/login", json={
        "email": "test@leiva.com",
        "password": "newpass123"
    })
    
    if response.status_code == 200:
        token = response.json().get("token")
        test_data["token"] = token
        return token
    
    # Try registering a new test user
    register_response = requests.post(f"{API_URL}/auth/register", json={
        "name": "Test User",
        "email": test_data["test_user_email"],
        "password": "testpass123"
    })
    
    if register_response.status_code == 200:
        token = register_response.json().get("token")
        test_data["token"] = token
        return token
    
    pytest.skip("Cannot authenticate - skipping authenticated tests")


@pytest.fixture
def api_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }


# ============ ACCOUNTING TRANSACTIONS TESTS ============

class TestAccountingTransactions:
    """Test accounting transaction CRUD operations"""
    
    def test_get_transactions_empty_or_existing(self, api_headers):
        """Test GET /api/accounting/transactions - should return list"""
        response = requests.get(f"{API_URL}/accounting/transactions", headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of transactions"
        print(f"✅ GET /api/accounting/transactions returned {len(data)} transactions")
    
    def test_create_income_transaction(self, api_headers):
        """Test POST /api/accounting/transactions - create income type"""
        payload = {
            "type": "income",
            "amount": 1500.50,
            "description": "TEST_Sale payment received",
            "category": "product",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "reference": "INV-TEST-001"
        }
        response = requests.post(f"{API_URL}/accounting/transactions", json=payload, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["type"] == "income", f"Type should be income, got {data.get('type')}"
        assert data["amount"] == 1500.50, f"Amount should be 1500.50, got {data.get('amount')}"
        assert data["description"] == "TEST_Sale payment received"
        
        test_data["transaction_ids"].append(data["id"])
        print(f"✅ Created income transaction with ID: {data['id']}")
    
    def test_create_expense_transaction(self, api_headers):
        """Test POST /api/accounting/transactions - create expense type"""
        payload = {
            "type": "expense",
            "amount": 500.00,
            "description": "TEST_Freight costs",
            "category": "freight",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "reference": "FREIGHT-001"
        }
        response = requests.post(f"{API_URL}/accounting/transactions", json=payload, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["type"] == "expense"
        assert data["amount"] == 500.00
        
        test_data["transaction_ids"].append(data["id"])
        print(f"✅ Created expense transaction with ID: {data['id']}")
    
    def test_create_tax_transaction(self, api_headers):
        """Test POST /api/accounting/transactions - create tax type"""
        payload = {
            "type": "tax",
            "amount": 315.11,
            "description": "TEST_IVA Q4 2025",
            "category": "tax",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "reference": "TAX-Q4-2025"
        }
        response = requests.post(f"{API_URL}/accounting/transactions", json=payload, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["type"] == "tax"
        assert data["amount"] == 315.11
        
        test_data["transaction_ids"].append(data["id"])
        print(f"✅ Created tax transaction with ID: {data['id']}")
    
    def test_get_transactions_with_type_filter(self, api_headers):
        """Test GET /api/accounting/transactions?type=income - filter by type"""
        response = requests.get(f"{API_URL}/accounting/transactions", 
                                params={"type": "income"}, headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        for tx in data:
            assert tx["type"] == "income", f"All transactions should be income, got {tx['type']}"
        print(f"✅ Filtered transactions by type=income, got {len(data)} results")
    
    def test_get_accounting_summary(self, api_headers):
        """Test GET /api/accounting/summary - returns income, expenses, taxes, net profit"""
        response = requests.get(f"{API_URL}/accounting/summary", headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_income" in data, "Summary should have total_income"
        assert "total_expenses" in data, "Summary should have total_expenses"
        assert "total_taxes" in data, "Summary should have total_taxes"
        assert "net_profit" in data, "Summary should have net_profit"
        
        # Verify net_profit calculation
        expected_net = data["total_income"] - data["total_expenses"] - data["total_taxes"]
        assert abs(data["net_profit"] - expected_net) < 0.01, "Net profit calculation should be correct"
        
        print(f"✅ Accounting summary: Income={data['total_income']}, Expenses={data['total_expenses']}, "
              f"Taxes={data['total_taxes']}, Net={data['net_profit']}")
    
    def test_delete_transaction(self, api_headers):
        """Test DELETE /api/accounting/transactions/{id}"""
        if not test_data["transaction_ids"]:
            pytest.skip("No transaction to delete")
        
        tx_id = test_data["transaction_ids"][0]
        response = requests.delete(f"{API_URL}/accounting/transactions/{tx_id}", headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Transaccion eliminada"
        test_data["transaction_ids"].remove(tx_id)
        print(f"✅ Deleted transaction {tx_id}")


# ============ WAREHOUSES TESTS ============

class TestWarehouses:
    """Test warehouse CRUD operations"""
    
    def test_get_warehouses_empty_or_existing(self, api_headers):
        """Test GET /api/warehouses - should return list"""
        response = requests.get(f"{API_URL}/warehouses", headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of warehouses"
        print(f"✅ GET /api/warehouses returned {len(data)} warehouses")
    
    def test_create_warehouse(self, api_headers):
        """Test POST /api/warehouses - create new warehouse"""
        payload = {
            "name": "TEST_Almacen Barcelona",
            "address": "Calle Test 123",
            "city": "Barcelona",
            "province": "Barcelona",
            "postal_code": "08001",
            "country": "Spain",
            "capacity": "500 m2",
            "contact_name": "Juan Test",
            "contact_phone": "+34600123456",
            "notes": "Test warehouse for API testing"
        }
        response = requests.post(f"{API_URL}/warehouses", json=payload, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["name"] == "TEST_Almacen Barcelona"
        assert data["city"] == "Barcelona"
        assert data["capacity"] == "500 m2"
        
        test_data["warehouse_id"] = data["id"]
        print(f"✅ Created warehouse with ID: {data['id']}")
    
    def test_update_warehouse(self, api_headers):
        """Test PUT /api/warehouses/{id} - update warehouse details"""
        if not test_data["warehouse_id"]:
            pytest.skip("No warehouse to update")
        
        wh_id = test_data["warehouse_id"]
        payload = {
            "capacity": "750 m2",
            "notes": "Updated warehouse capacity"
        }
        response = requests.put(f"{API_URL}/warehouses/{wh_id}", json=payload, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["capacity"] == "750 m2"
        assert data["notes"] == "Updated warehouse capacity"
        print(f"✅ Updated warehouse {wh_id}")
    
    def test_get_warehouse_inventory_empty(self, api_headers):
        """Test GET /api/warehouses/{id}/inventory - should return empty list initially"""
        if not test_data["warehouse_id"]:
            pytest.skip("No warehouse to check inventory")
        
        wh_id = test_data["warehouse_id"]
        response = requests.get(f"{API_URL}/warehouses/{wh_id}/inventory", headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of inventory items"
        print(f"✅ GET /api/warehouses/{wh_id}/inventory returned {len(data)} items")
    
    def test_add_inventory_item(self, api_headers):
        """Test POST /api/warehouses/{id}/inventory - add inventory item"""
        if not test_data["warehouse_id"]:
            pytest.skip("No warehouse to add inventory")
        
        wh_id = test_data["warehouse_id"]
        payload = {
            "product_name": "TEST_Electronic Components",
            "quantity": 100,
            "location": "Estante A1",
            "import_reference": "IMP-TEST-001",
            "notes": "Test inventory item"
        }
        response = requests.post(f"{API_URL}/warehouses/{wh_id}/inventory", json=payload, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["product_name"] == "TEST_Electronic Components"
        assert data["quantity"] == 100
        assert data["location"] == "Estante A1"
        assert data["warehouse_id"] == wh_id
        
        test_data["inventory_item_id"] = data["id"]
        print(f"✅ Added inventory item with ID: {data['id']}")
    
    def test_get_warehouse_inventory_with_items(self, api_headers):
        """Test GET /api/warehouses/{id}/inventory - verify item exists"""
        if not test_data["warehouse_id"]:
            pytest.skip("No warehouse to check inventory")
        
        wh_id = test_data["warehouse_id"]
        response = requests.get(f"{API_URL}/warehouses/{wh_id}/inventory", headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1, "Should have at least 1 inventory item"
        
        # Verify our test item exists
        test_items = [item for item in data if item.get("product_name") == "TEST_Electronic Components"]
        assert len(test_items) >= 1, "Our test item should exist"
        print(f"✅ Inventory has {len(data)} items, including our test item")
    
    def test_delete_inventory_item(self, api_headers):
        """Test DELETE /api/warehouses/{id}/inventory/{item_id}"""
        if not test_data["warehouse_id"] or not test_data["inventory_item_id"]:
            pytest.skip("No inventory item to delete")
        
        wh_id = test_data["warehouse_id"]
        item_id = test_data["inventory_item_id"]
        
        response = requests.delete(f"{API_URL}/warehouses/{wh_id}/inventory/{item_id}", headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Item eliminado"
        test_data["inventory_item_id"] = None
        print(f"✅ Deleted inventory item {item_id}")
    
    def test_delete_warehouse(self, api_headers):
        """Test DELETE /api/warehouses/{id}"""
        if not test_data["warehouse_id"]:
            pytest.skip("No warehouse to delete")
        
        wh_id = test_data["warehouse_id"]
        response = requests.delete(f"{API_URL}/warehouses/{wh_id}", headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Almacen eliminado"
        test_data["warehouse_id"] = None
        print(f"✅ Deleted warehouse {wh_id}")


# ============ PASSWORD RECOVERY TESTS ============

class TestPasswordRecovery:
    """Test password recovery flow"""
    
    def test_forgot_password_nonexistent_email(self):
        """Test POST /api/auth/forgot-password with non-existent email"""
        payload = {
            "email": "nonexistent@test.com"
        }
        response = requests.post(f"{API_URL}/auth/forgot-password", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should return generic message (security: don't reveal if email exists)
        assert "message" in data
        print(f"✅ Forgot password with non-existent email returns generic message")
    
    def test_forgot_password_existing_email(self):
        """Test POST /api/auth/forgot-password with existing email - returns reset_token"""
        payload = {
            "email": "test@leiva.com"
        }
        response = requests.post(f"{API_URL}/auth/forgot-password", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reset_token" in data, "Response should contain reset_token for existing user"
        assert len(data["reset_token"]) > 0, "Reset token should not be empty"
        
        test_data["reset_token"] = data["reset_token"]
        print(f"✅ Got reset token: {data['reset_token'][:8]}...")
    
    def test_reset_password_invalid_token(self):
        """Test POST /api/auth/reset-password with invalid token"""
        payload = {
            "token": "invalid-token-12345",
            "new_password": "newpassword123"
        }
        response = requests.post(f"{API_URL}/auth/reset-password", json=payload)
        assert response.status_code == 400, f"Expected 400 for invalid token, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print(f"✅ Reset password with invalid token returns 400")
    
    def test_reset_password_valid_token(self):
        """Test POST /api/auth/reset-password with valid token"""
        if not test_data.get("reset_token"):
            pytest.skip("No reset token available")
        
        payload = {
            "token": test_data["reset_token"],
            "new_password": "newpass123"
        }
        response = requests.post(f"{API_URL}/auth/reset-password", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Contrasena actualizada correctamente"
        print(f"✅ Password reset successfully")
    
    def test_login_with_new_password(self):
        """Test login with newly reset password"""
        payload = {
            "email": "test@leiva.com",
            "password": "newpass123"
        }
        response = requests.post(f"{API_URL}/auth/login", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Should return JWT token"
        assert "user" in data, "Should return user data"
        print(f"✅ Login with new password successful")


# ============ CLEANUP ============

class TestCleanup:
    """Cleanup test data after all tests"""
    
    def test_cleanup_remaining_transactions(self, api_headers):
        """Delete any remaining test transactions"""
        for tx_id in test_data.get("transaction_ids", []):
            try:
                requests.delete(f"{API_URL}/accounting/transactions/{tx_id}", headers=api_headers)
                print(f"  Cleaned up transaction {tx_id}")
            except:
                pass
        test_data["transaction_ids"] = []
        print("✅ Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
