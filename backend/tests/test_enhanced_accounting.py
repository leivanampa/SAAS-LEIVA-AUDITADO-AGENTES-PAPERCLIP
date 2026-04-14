"""
Test suite for Enhanced Accounting Module (Qonto-like)
Testing:
- Transaction IVA auto-calculation
- Accounting reports (summary, monthly, category, iva)
- Transaction filters
- File upload/download/delete
- Supplier payments with auto-expense creation
- Invoice-to-transaction auto-link
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
    "file_ids": [],
    "supplier_payment_ids": [],
    "invoice_id": None,
    "linked_transaction_id": None,
}


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token by logging in with test credentials"""
    response = requests.post(f"{API_URL}/auth/login", json={
        "email": "test@leiva.com",
        "password": "newpass123"
    })
    
    if response.status_code == 200:
        token = response.json().get("token")
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


# ============ IVA AUTO-CALCULATION TESTS ============

class TestIVAAutoCalculation:
    """Test IVA auto-calculation in POST /api/accounting/transactions"""
    
    def test_create_transaction_with_iva_auto_calculation(self, api_headers):
        """Test that sending base_amount and iva_rate auto-calculates iva_amount and total"""
        payload = {
            "type": "expense",
            "base_amount": 1000,
            "iva_rate": 21,
            "description": "TEST_Merchandise purchase with IVA auto-calc",
            "category": "mercancia",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "status": "paid"
        }
        response = requests.post(f"{API_URL}/accounting/transactions", json=payload, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["base_amount"] == 1000, f"Base amount should be 1000, got {data.get('base_amount')}"
        assert data["iva_rate"] == 21, f"IVA rate should be 21, got {data.get('iva_rate')}"
        assert data["iva_amount"] == 210, f"IVA amount should be 210 (1000 * 21%), got {data.get('iva_amount')}"
        assert data["amount"] == 1210, f"Total amount should be 1210 (1000 + 210), got {data.get('amount')}"
        
        test_data["transaction_ids"].append(data["id"])
        print(f"✅ IVA auto-calculation works: base=1000, iva_rate=21% -> iva_amount=210, total=1210")
    
    def test_create_transaction_with_different_iva_rates(self, api_headers):
        """Test IVA calculation with different rates (0%, 4%, 10%, 21%)"""
        iva_rates = [
            (0, 0, 1000),      # 0% IVA
            (4, 40, 1040),     # 4% reduced IVA
            (10, 100, 1100),   # 10% reduced IVA
            (21, 210, 1210),   # 21% standard IVA
        ]
        
        for rate, expected_iva, expected_total in iva_rates:
            payload = {
                "type": "income",
                "base_amount": 1000,
                "iva_rate": rate,
                "description": f"TEST_Transaction with {rate}% IVA",
                "category": "ventas",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "status": "paid"
            }
            response = requests.post(f"{API_URL}/accounting/transactions", json=payload, headers=api_headers)
            assert response.status_code == 200
            
            data = response.json()
            assert data["iva_amount"] == expected_iva, f"IVA {rate}%: expected {expected_iva}, got {data['iva_amount']}"
            assert data["amount"] == expected_total, f"Total for {rate}%: expected {expected_total}, got {data['amount']}"
            
            test_data["transaction_ids"].append(data["id"])
        
        print(f"✅ IVA calculation verified for rates: 0%, 4%, 10%, 21%")


# ============ ACCOUNTING REPORTS TESTS ============

class TestAccountingReports:
    """Test accounting report endpoints"""
    
    def test_get_summary_with_period_year(self, api_headers):
        """Test GET /api/accounting/summary?period=year"""
        response = requests.get(f"{API_URL}/accounting/summary", params={"period": "year"}, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        required_fields = ["total_income", "total_expenses", "net_profit", "income_base", "income_iva", 
                         "expense_base", "expense_iva", "iva_balance", "pending_amount"]
        for field in required_fields:
            assert field in data, f"Summary should contain {field}"
        
        # Verify iva_balance calculation
        expected_iva_balance = data["income_iva"] - data["expense_iva"]
        assert abs(data["iva_balance"] - expected_iva_balance) < 0.01, "IVA balance should be income_iva - expense_iva"
        
        print(f"✅ Summary: Income={data['total_income']}, Expenses={data['total_expenses']}, "
              f"Net={data['net_profit']}, IVA Balance={data['iva_balance']}")
    
    def test_get_monthly_report(self, api_headers):
        """Test GET /api/accounting/monthly-report"""
        year = datetime.now().year
        response = requests.get(f"{API_URL}/accounting/monthly-report", params={"year": year}, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Monthly report should be a list"
        
        # If there's data, verify structure
        if len(data) > 0:
            month = data[0]
            required_fields = ["month", "income", "expenses", "income_iva", "expense_iva", "net", "iva_balance"]
            for field in required_fields:
                assert field in month, f"Monthly data should contain {field}"
        
        print(f"✅ Monthly report returned {len(data)} months of data for {year}")
    
    def test_get_category_report(self, api_headers):
        """Test GET /api/accounting/category-report"""
        response = requests.get(f"{API_URL}/accounting/category-report", params={"period": "year"}, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Category report should be a list"
        
        # Verify structure
        if len(data) > 0:
            category = data[0]
            assert "type" in category, "Category data should contain type"
            assert "category" in category, "Category data should contain category"
            assert "total" in category, "Category data should contain total"
            assert "count" in category, "Category data should contain count"
        
        print(f"✅ Category report returned {len(data)} categories")
    
    def test_get_iva_report(self, api_headers):
        """Test GET /api/accounting/iva-report - quarterly IVA breakdown"""
        year = datetime.now().year
        response = requests.get(f"{API_URL}/accounting/iva-report", params={"year": year}, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "IVA report should be a list"
        assert len(data) == 4, "IVA report should have 4 quarters"
        
        for quarter in data:
            assert "quarter" in quarter, "Quarter data should contain quarter"
            assert "iva_repercutido" in quarter, "Quarter data should contain iva_repercutido"
            assert "iva_soportado" in quarter, "Quarter data should contain iva_soportado"
            assert "iva_result" in quarter, "Quarter data should contain iva_result"
            assert "base_income" in quarter, "Quarter data should contain base_income"
            assert "base_expense" in quarter, "Quarter data should contain base_expense"
            
            # Verify iva_result calculation
            expected = quarter["iva_repercutido"] - quarter["iva_soportado"]
            assert abs(quarter["iva_result"] - expected) < 0.01
        
        print(f"✅ IVA report returned 4 quarters: {[q['quarter'] for q in data]}")


# ============ TRANSACTION FILTERS TESTS ============

class TestTransactionFilters:
    """Test transaction filtering capabilities"""
    
    def test_filter_by_type_income(self, api_headers):
        """Test GET /api/accounting/transactions?type=income"""
        response = requests.get(f"{API_URL}/accounting/transactions", params={"type": "income"}, headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        for tx in data:
            assert tx["type"] == "income", f"All should be income, got {tx['type']}"
        
        print(f"✅ Filtered by type=income: {len(data)} transactions")
    
    def test_filter_by_type_expense(self, api_headers):
        """Test GET /api/accounting/transactions?type=expense"""
        response = requests.get(f"{API_URL}/accounting/transactions", params={"type": "expense"}, headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        for tx in data:
            assert tx["type"] == "expense", f"All should be expense, got {tx['type']}"
        
        print(f"✅ Filtered by type=expense: {len(data)} transactions")
    
    def test_filter_by_status_paid(self, api_headers):
        """Test GET /api/accounting/transactions?status=paid"""
        response = requests.get(f"{API_URL}/accounting/transactions", params={"status": "paid"}, headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        for tx in data:
            assert tx["status"] == "paid", f"All should be paid, got {tx['status']}"
        
        print(f"✅ Filtered by status=paid: {len(data)} transactions")
    
    def test_filter_by_category(self, api_headers):
        """Test GET /api/accounting/transactions?category=ventas"""
        response = requests.get(f"{API_URL}/accounting/transactions", params={"category": "ventas"}, headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        for tx in data:
            assert tx["category"] == "ventas", f"All should be ventas, got {tx['category']}"
        
        print(f"✅ Filtered by category=ventas: {len(data)} transactions")
    
    def test_filter_by_search_text(self, api_headers):
        """Test GET /api/accounting/transactions?search=TEST_"""
        response = requests.get(f"{API_URL}/accounting/transactions", params={"search": "TEST_"}, headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        for tx in data:
            matches = ("TEST_" in (tx.get("description") or "") or 
                       "TEST_" in (tx.get("reference") or "") or 
                       "TEST_" in (tx.get("contact_name") or ""))
            assert matches, f"Search should match TEST_, got description={tx.get('description')}"
        
        print(f"✅ Search filter works: {len(data)} transactions match 'TEST_'")
    
    def test_combined_filters(self, api_headers):
        """Test combining multiple filters"""
        response = requests.get(f"{API_URL}/accounting/transactions", 
                               params={"type": "income", "status": "paid", "category": "ventas"}, 
                               headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        for tx in data:
            assert tx["type"] == "income"
            assert tx["status"] == "paid"
            assert tx["category"] == "ventas"
        
        print(f"✅ Combined filters work: {len(data)} transactions match all criteria")


# ============ TRANSACTION UPDATE TESTS ============

class TestTransactionUpdate:
    """Test PUT /api/accounting/transactions/{id}"""
    
    def test_partial_update_transaction(self, api_headers):
        """Test PUT with partial data"""
        # First create a transaction
        create_payload = {
            "type": "expense",
            "base_amount": 500,
            "iva_rate": 21,
            "description": "TEST_Transaction to update",
            "category": "flete",
            "status": "pending"
        }
        create_response = requests.post(f"{API_URL}/accounting/transactions", json=create_payload, headers=api_headers)
        assert create_response.status_code == 200
        
        tx_id = create_response.json()["id"]
        test_data["transaction_ids"].append(tx_id)
        
        # Now update partially
        update_payload = {
            "status": "paid",
            "notes": "Updated via partial update test"
        }
        update_response = requests.put(f"{API_URL}/accounting/transactions/{tx_id}", json=update_payload, headers=api_headers)
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        data = update_response.json()
        assert data["status"] == "paid", f"Status should be updated to paid"
        assert data["notes"] == "Updated via partial update test"
        assert data["description"] == "TEST_Transaction to update", "Non-updated fields should remain"
        assert data["base_amount"] == 500, "Base amount should remain unchanged"
        
        print(f"✅ Partial update works: status=paid, notes added, other fields unchanged")


# ============ FILE UPLOAD TESTS ============

class TestFileUpload:
    """Test file upload, download, and delete"""
    
    def test_upload_file(self, auth_token):
        """Test POST /api/files/upload (multipart)"""
        # Create a simple test file
        test_content = b"This is a test file content for upload testing"
        files = {"file": ("test_document.txt", test_content, "text/plain")}
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(f"{API_URL}/files/upload", files=files, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain file id"
        assert "filename" in data, "Response should contain filename"
        assert "url" in data, "Response should contain download url"
        assert data["filename"] == "test_document.txt"
        
        test_data["file_ids"].append(data["id"])
        print(f"✅ File uploaded: id={data['id']}, filename={data['filename']}")
    
    def test_download_file(self, auth_token):
        """Test GET /api/files/{id} (download)"""
        if not test_data["file_ids"]:
            pytest.skip("No file to download")
        
        file_id = test_data["file_ids"][0]
        response = requests.get(f"{API_URL}/files/{file_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Check content-disposition header
        assert "content-disposition" in response.headers or len(response.content) > 0
        print(f"✅ File downloaded: {len(response.content)} bytes")
    
    def test_download_nonexistent_file(self):
        """Test GET /api/files/{id} with non-existent file"""
        response = requests.get(f"{API_URL}/files/nonexistent-id-12345")
        assert response.status_code == 404, f"Expected 404 for non-existent file, got {response.status_code}"
        print(f"✅ Non-existent file returns 404")
    
    def test_delete_file(self, api_headers):
        """Test DELETE /api/files/{id}"""
        if not test_data["file_ids"]:
            pytest.skip("No file to delete")
        
        file_id = test_data["file_ids"][0]
        response = requests.delete(f"{API_URL}/files/{file_id}", headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Archivo eliminado"
        
        # Verify it's deleted
        get_response = requests.get(f"{API_URL}/files/{file_id}")
        assert get_response.status_code == 404, "Deleted file should return 404"
        
        test_data["file_ids"].remove(file_id)
        print(f"✅ File deleted: {file_id}")


# ============ SUPPLIER PAYMENTS TESTS ============

class TestSupplierPayments:
    """Test supplier payments CRUD and auto-expense creation"""
    
    def test_create_supplier_payment(self, api_headers):
        """Test POST /api/supplier-payments"""
        payload = {
            "supplier_name": "TEST_Proveedor China",
            "amount": 5000,
            "currency": "EUR",
            "status": "scheduled",
            "payment_method": "transfer",
            "due_date": "2026-02-15",
            "reference": "PO-TEST-001",
            "notes": "Test payment for merchandise"
        }
        response = requests.post(f"{API_URL}/supplier-payments", json=payload, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["supplier_name"] == "TEST_Proveedor China"
        assert data["amount"] == 5000
        assert data["status"] == "scheduled"
        
        test_data["supplier_payment_ids"].append(data["id"])
        print(f"✅ Supplier payment created: id={data['id']}")
    
    def test_get_supplier_payments(self, api_headers):
        """Test GET /api/supplier-payments"""
        response = requests.get(f"{API_URL}/supplier-payments", headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Got {len(data)} supplier payments")
    
    def test_get_supplier_payments_by_status(self, api_headers):
        """Test GET /api/supplier-payments?status=scheduled"""
        response = requests.get(f"{API_URL}/supplier-payments", params={"status": "scheduled"}, headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        for pay in data:
            assert pay["status"] == "scheduled"
        
        print(f"✅ Filtered by status=scheduled: {len(data)} payments")
    
    def test_mark_payment_as_paid_creates_expense(self, api_headers):
        """Test PUT /api/supplier-payments/{id} with status=paid auto-creates expense transaction"""
        if not test_data["supplier_payment_ids"]:
            pytest.skip("No supplier payment to update")
        
        pay_id = test_data["supplier_payment_ids"][0]
        
        # First get initial transaction count
        tx_response = requests.get(f"{API_URL}/accounting/transactions", params={"type": "expense"}, headers=api_headers)
        initial_count = len(tx_response.json())
        
        # Mark payment as paid
        update_payload = {"status": "paid"}
        response = requests.put(f"{API_URL}/supplier-payments/{pay_id}", json=update_payload, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "paid", "Status should be updated to paid"
        assert "paid_date" in data and data["paid_date"], "Should have paid_date set"
        assert "transaction_id" in data and data["transaction_id"], "Should have linked transaction_id"
        
        # Verify expense transaction was auto-created
        tx_response = requests.get(f"{API_URL}/accounting/transactions", params={"type": "expense"}, headers=api_headers)
        new_count = len(tx_response.json())
        
        assert new_count > initial_count, f"New expense transaction should be created. Before: {initial_count}, After: {new_count}"
        
        # Find the auto-created transaction
        transactions = tx_response.json()
        auto_tx = None
        for tx in transactions:
            if tx["id"] == data["transaction_id"]:
                auto_tx = tx
                break
        
        assert auto_tx is not None, "Auto-created transaction should exist"
        assert auto_tx["type"] == "expense", "Auto-created transaction should be expense"
        assert auto_tx["amount"] == 5000, "Amount should match payment"
        assert "Pago a" in auto_tx["description"], "Description should mention payment"
        assert auto_tx["category"] == "mercancia", "Category should be mercancia"
        
        test_data["transaction_ids"].append(data["transaction_id"])
        print(f"✅ Mark as paid creates expense transaction: tx_id={data['transaction_id']}")
    
    def test_delete_supplier_payment(self, api_headers):
        """Test DELETE /api/supplier-payments/{id}"""
        if not test_data["supplier_payment_ids"]:
            pytest.skip("No supplier payment to delete")
        
        pay_id = test_data["supplier_payment_ids"][0]
        response = requests.delete(f"{API_URL}/supplier-payments/{pay_id}", headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Pago eliminado"
        
        test_data["supplier_payment_ids"].remove(pay_id)
        print(f"✅ Supplier payment deleted: {pay_id}")


# ============ INVOICE AUTO-LINK TESTS ============

class TestInvoiceAutoLink:
    """Test invoice-to-transaction auto-link when marking invoice as paid"""
    
    def test_create_sale_invoice(self, api_headers):
        """Create a sale invoice for testing"""
        payload = {
            "invoice_number": "TEST-INV-001",
            "type": "sale",
            "contact_name": "TEST_Cliente Espanol",
            "subtotal": 1000,
            "tax_rate": 21,
            "tax_amount": 210,
            "total": 1210,
            "status": "sent",
            "payment_method": "transfer"
        }
        response = requests.post(f"{API_URL}/invoices", json=payload, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["invoice_number"] == "TEST-INV-001"
        assert data["type"] == "sale"
        assert data["status"] == "sent"
        
        test_data["invoice_id"] = data["id"]
        print(f"✅ Sale invoice created: id={data['id']}")
    
    def test_mark_invoice_paid_creates_transaction(self, api_headers):
        """Test PUT /api/invoices/{id} with status=paid auto-creates income transaction"""
        if not test_data["invoice_id"]:
            pytest.skip("No invoice to mark as paid")
        
        inv_id = test_data["invoice_id"]
        
        # Get initial income transaction count
        tx_response = requests.get(f"{API_URL}/accounting/transactions", params={"type": "income"}, headers=api_headers)
        initial_count = len(tx_response.json())
        
        # Mark invoice as paid
        update_payload = {"status": "paid"}
        response = requests.put(f"{API_URL}/invoices/{inv_id}", json=update_payload, headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "paid", "Invoice status should be paid"
        
        # Verify income transaction was auto-created
        tx_response = requests.get(f"{API_URL}/accounting/transactions", params={"type": "income"}, headers=api_headers)
        new_count = len(tx_response.json())
        
        assert new_count > initial_count, f"New income transaction should be created. Before: {initial_count}, After: {new_count}"
        
        # Find the auto-created transaction (linked to this invoice)
        transactions = tx_response.json()
        auto_tx = None
        for tx in transactions:
            if tx.get("invoice_id") == inv_id:
                auto_tx = tx
                break
        
        assert auto_tx is not None, "Auto-created transaction should be linked to invoice"
        assert auto_tx["type"] == "income", "Should be income for sale invoice"
        assert auto_tx["base_amount"] == 1000, "Base amount should match invoice subtotal"
        assert auto_tx["iva_rate"] == 21, "IVA rate should match invoice tax_rate"
        assert auto_tx["iva_amount"] == 210, "IVA amount should match invoice tax_amount"
        assert auto_tx["amount"] == 1210, "Total should match invoice total"
        assert auto_tx["status"] == "paid"
        assert "auto-factura" in auto_tx.get("labels", []), "Should have auto-factura label"
        
        test_data["linked_transaction_id"] = auto_tx["id"]
        test_data["transaction_ids"].append(auto_tx["id"])
        print(f"✅ Invoice marked as paid auto-creates income transaction: tx_id={auto_tx['id']}")
    
    def test_delete_test_invoice(self, api_headers):
        """Clean up test invoice"""
        if not test_data["invoice_id"]:
            pytest.skip("No invoice to delete")
        
        inv_id = test_data["invoice_id"]
        response = requests.delete(f"{API_URL}/invoices/{inv_id}", headers=api_headers)
        assert response.status_code == 200
        
        test_data["invoice_id"] = None
        print(f"✅ Test invoice deleted")


# ============ ACCOUNTING CATEGORIES TEST ============

class TestAccountingCategories:
    """Test categories endpoint"""
    
    def test_get_accounting_categories(self, api_headers):
        """Test GET /api/accounting/categories"""
        response = requests.get(f"{API_URL}/accounting/categories", headers=api_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "income" in data, "Should have income categories"
        assert "expense" in data, "Should have expense categories"
        
        # Verify expected categories exist
        income_cats = data["income"]
        expense_cats = data["expense"]
        
        assert "ventas" in income_cats, "Income should have 'ventas'"
        assert "servicios" in income_cats, "Income should have 'servicios'"
        assert "mercancia" in expense_cats, "Expense should have 'mercancia'"
        assert "flete" in expense_cats, "Expense should have 'flete'"
        assert "aduanas" in expense_cats, "Expense should have 'aduanas'"
        
        print(f"✅ Categories endpoint works: {len(income_cats)} income, {len(expense_cats)} expense categories")


# ============ CLEANUP ============

class TestCleanup:
    """Cleanup test data after all tests"""
    
    def test_cleanup_transactions(self, api_headers):
        """Delete test transactions"""
        cleaned = 0
        for tx_id in test_data.get("transaction_ids", []):
            try:
                requests.delete(f"{API_URL}/accounting/transactions/{tx_id}", headers=api_headers)
                cleaned += 1
            except:
                pass
        
        test_data["transaction_ids"] = []
        print(f"✅ Cleaned up {cleaned} test transactions")
    
    def test_cleanup_files(self, api_headers):
        """Delete test files"""
        cleaned = 0
        for file_id in test_data.get("file_ids", []):
            try:
                requests.delete(f"{API_URL}/files/{file_id}", headers=api_headers)
                cleaned += 1
            except:
                pass
        
        test_data["file_ids"] = []
        print(f"✅ Cleaned up {cleaned} test files")
    
    def test_cleanup_supplier_payments(self, api_headers):
        """Delete test supplier payments"""
        cleaned = 0
        for pay_id in test_data.get("supplier_payment_ids", []):
            try:
                requests.delete(f"{API_URL}/supplier-payments/{pay_id}", headers=api_headers)
                cleaned += 1
            except:
                pass
        
        test_data["supplier_payment_ids"] = []
        print(f"✅ Cleaned up {cleaned} test supplier payments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
