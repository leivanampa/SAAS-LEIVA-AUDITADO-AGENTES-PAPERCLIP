"""
Test: CRM Fiscal Fields, Invoice Fiscal Data, Treasury Module
This iteration focuses on:
1. CRM fiscal fields (NIF/CIF, addresses, bank details) in tabbed form
2. Invoices with sender/receiver fiscal data
3. Treasury module with cash flow forecasting, liquidity alerts
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSetup:
    """Setup and authentication"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for admin user"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@leiva.com",
            "password": "newpass123"
        })
        assert res.status_code == 200, f"Login failed: {res.text}"
        return res.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestCRMFiscalFields(TestSetup):
    """Test CRM contacts with full fiscal fields"""
    
    def test_create_contact_with_fiscal_fields(self, headers):
        """POST /api/contacts with all fiscal fields"""
        contact_data = {
            "name": "TEST_Proveedor Fiscal",
            "company": "TEST Importaciones S.L.",
            "email": "fiscal@test.com",
            "phone": "+34612345678",
            "type": "supplier",
            "country": "Spain",
            "fiscal_id": "B12345678",
            "fiscal_id_type": "CIF",
            "tax_regime": "general",
            "address": "Calle Mayor 15, 2B",
            "city": "Madrid",
            "province": "Madrid",
            "postal_code": "28001",
            "bank_iban": "ES1234567890123456789012",
            "bank_swift": "BBVAESMMXXX",
            "bank_name": "BBVA"
        }
        res = requests.post(f"{BASE_URL}/api/contacts", json=contact_data, headers=headers)
        assert res.status_code == 200, f"Create contact failed: {res.text}"
        
        data = res.json()
        assert data["id"], "No ID returned"
        assert data["fiscal_id"] == "B12345678"
        assert data["fiscal_id_type"] == "CIF"
        assert data["tax_regime"] == "general"
        assert data["address"] == "Calle Mayor 15, 2B"
        assert data["city"] == "Madrid"
        assert data["province"] == "Madrid"
        assert data["postal_code"] == "28001"
        assert data["bank_iban"] == "ES1234567890123456789012"
        assert data["bank_swift"] == "BBVAESMMXXX"
        assert data["bank_name"] == "BBVA"
        print(f"PASS: Created contact with fiscal fields: {data['id']}")
        return data["id"]
    
    def test_update_contact_fiscal_fields(self, headers):
        """PUT /api/contacts/{id} to update fiscal fields"""
        # Create contact first
        create_res = requests.post(f"{BASE_URL}/api/contacts", json={
            "name": "TEST_Contact Update Fiscal",
            "type": "client",
            "fiscal_id": "12345678A",
            "fiscal_id_type": "NIF"
        }, headers=headers)
        assert create_res.status_code == 200
        contact_id = create_res.json()["id"]
        
        # Update fiscal fields
        update_data = {
            "fiscal_id": "B87654321",
            "fiscal_id_type": "CIF",
            "tax_regime": "intracom",
            "address": "Av. de la Constitucion 10",
            "city": "Barcelona",
            "province": "Barcelona",
            "postal_code": "08001",
            "bank_iban": "ES9876543210987654321098",
            "bank_swift": "CAIXESBBXXX",
            "bank_name": "CaixaBank"
        }
        res = requests.put(f"{BASE_URL}/api/contacts/{contact_id}", json=update_data, headers=headers)
        assert res.status_code == 200, f"Update failed: {res.text}"
        
        data = res.json()
        assert data["fiscal_id"] == "B87654321"
        assert data["fiscal_id_type"] == "CIF"
        assert data["tax_regime"] == "intracom"
        assert data["city"] == "Barcelona"
        assert data["bank_iban"] == "ES9876543210987654321098"
        print(f"PASS: Updated contact fiscal fields: {contact_id}")
    
    def test_get_contacts_list(self, headers):
        """GET /api/contacts - verify fiscal fields are returned"""
        res = requests.get(f"{BASE_URL}/api/contacts", headers=headers)
        assert res.status_code == 200
        contacts = res.json()
        assert isinstance(contacts, list)
        
        # Find our test contact
        test_contacts = [c for c in contacts if c.get("name", "").startswith("TEST_")]
        if test_contacts:
            c = test_contacts[0]
            # Verify fiscal fields exist in response
            assert "fiscal_id" in c
            assert "fiscal_id_type" in c
            assert "city" in c
            print(f"PASS: Contacts list contains fiscal fields")
    
    def test_contact_types(self, headers):
        """Test different contact types: supplier, client, agent"""
        for ctype in ["supplier", "client", "agent"]:
            res = requests.post(f"{BASE_URL}/api/contacts", json={
                "name": f"TEST_{ctype.upper()}_Contact",
                "type": ctype,
                "fiscal_id_type": "NIF"
            }, headers=headers)
            assert res.status_code == 200, f"Failed to create {ctype}: {res.text}"
            assert res.json()["type"] == ctype
        print("PASS: All contact types (supplier, client, agent) work")
    
    def test_fiscal_id_types(self, headers):
        """Test different fiscal ID types: NIF, CIF, NIE, VAT, PASSPORT, OTHER"""
        for id_type in ["NIF", "CIF", "NIE", "VAT", "PASSPORT", "OTHER"]:
            res = requests.post(f"{BASE_URL}/api/contacts", json={
                "name": f"TEST_FiscalType_{id_type}",
                "type": "client",
                "fiscal_id_type": id_type,
                "fiscal_id": f"ID_{id_type}_123"
            }, headers=headers)
            assert res.status_code == 200, f"Failed for {id_type}: {res.text}"
            assert res.json()["fiscal_id_type"] == id_type
        print("PASS: All fiscal ID types work (NIF, CIF, NIE, VAT, PASSPORT, OTHER)")


class TestInvoiceFiscalData(TestSetup):
    """Test invoices with sender/receiver fiscal data"""
    
    def test_create_invoice_with_sender_receiver_fiscal(self, headers):
        """POST /api/invoices with sender and receiver fiscal data"""
        invoice_data = {
            "invoice_number": f"TEST-INV-{uuid.uuid4().hex[:6]}",
            "contact_name": "Test Company",
            "type": "sale",
            "items": [{"description": "Product A", "quantity": 2, "unit_price": 100}],
            "subtotal": 200,
            "tax_rate": 21,
            "tax_amount": 42,
            "total": 242,
            "currency": "EUR",
            "status": "draft",
            "due_date": "2026-02-15",
            # Sender fiscal data
            "sender_name": "Leiva's Import S.L.",
            "sender_fiscal_id": "B12345678",
            "sender_address": "Calle Principal 123",
            "sender_city": "Madrid",
            "sender_postal_code": "28001",
            "sender_country": "Spain",
            # Receiver fiscal data
            "receiver_name": "Cliente Ejemplo S.A.",
            "receiver_fiscal_id": "A87654321",
            "receiver_address": "Av. Diagonal 456",
            "receiver_city": "Barcelona",
            "receiver_postal_code": "08001",
            "receiver_country": "Spain"
        }
        res = requests.post(f"{BASE_URL}/api/invoices", json=invoice_data, headers=headers)
        assert res.status_code == 200, f"Create invoice failed: {res.text}"
        
        data = res.json()
        assert data["id"]
        assert data["sender_name"] == "Leiva's Import S.L."
        assert data["sender_fiscal_id"] == "B12345678"
        assert data["sender_city"] == "Madrid"
        assert data["receiver_name"] == "Cliente Ejemplo S.A."
        assert data["receiver_fiscal_id"] == "A87654321"
        assert data["receiver_city"] == "Barcelona"
        print(f"PASS: Created invoice with sender/receiver fiscal data: {data['id']}")
        return data["id"]
    
    def test_update_invoice_fiscal_data(self, headers):
        """PUT /api/invoices/{id} to update fiscal data"""
        # Create invoice first
        create_res = requests.post(f"{BASE_URL}/api/invoices", json={
            "invoice_number": f"TEST-UPD-{uuid.uuid4().hex[:6]}",
            "type": "purchase",
            "status": "draft"
        }, headers=headers)
        assert create_res.status_code == 200
        invoice_id = create_res.json()["id"]
        
        # Update with fiscal data
        update_data = {
            "sender_name": "Proveedor Chino Ltd.",
            "sender_fiscal_id": "CN123456789",
            "sender_address": "Shanghai Industrial Park",
            "sender_city": "Shanghai",
            "sender_country": "China",
            "receiver_name": "Mi Empresa S.L.",
            "receiver_fiscal_id": "B99887766",
            "receiver_address": "Poligono Industrial 45",
            "receiver_city": "Valencia",
            "receiver_postal_code": "46001",
            "receiver_country": "Spain"
        }
        res = requests.put(f"{BASE_URL}/api/invoices/{invoice_id}", json=update_data, headers=headers)
        assert res.status_code == 200, f"Update failed: {res.text}"
        
        data = res.json()
        assert data["sender_name"] == "Proveedor Chino Ltd."
        assert data["sender_city"] == "Shanghai"
        assert data["receiver_name"] == "Mi Empresa S.L."
        assert data["receiver_city"] == "Valencia"
        print(f"PASS: Updated invoice fiscal data: {invoice_id}")
    
    def test_invoice_types(self, headers):
        """Test different invoice types: purchase, sale, expense"""
        for inv_type in ["purchase", "sale", "expense"]:
            res = requests.post(f"{BASE_URL}/api/invoices", json={
                "invoice_number": f"TEST-{inv_type.upper()}-{uuid.uuid4().hex[:4]}",
                "type": inv_type,
                "status": "draft"
            }, headers=headers)
            assert res.status_code == 200, f"Failed for {inv_type}: {res.text}"
            assert res.json()["type"] == inv_type
        print("PASS: All invoice types (purchase, sale, expense) work")
    
    def test_get_invoice_detail(self, headers):
        """GET /api/invoices/{id} returns full fiscal data"""
        # Create with full data
        invoice_data = {
            "invoice_number": f"TEST-DET-{uuid.uuid4().hex[:6]}",
            "type": "sale",
            "sender_name": "Emisor Test",
            "sender_fiscal_id": "B11111111",
            "receiver_name": "Receptor Test",
            "receiver_fiscal_id": "A22222222"
        }
        create_res = requests.post(f"{BASE_URL}/api/invoices", json=invoice_data, headers=headers)
        assert create_res.status_code == 200
        invoice_id = create_res.json()["id"]
        
        # Get detail
        res = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["sender_name"] == "Emisor Test"
        assert data["sender_fiscal_id"] == "B11111111"
        assert data["receiver_name"] == "Receptor Test"
        assert data["receiver_fiscal_id"] == "A22222222"
        print(f"PASS: Invoice detail returns fiscal data")


class TestTreasuryModule(TestSetup):
    """Test Treasury module with cash flow forecasting"""
    
    def test_treasury_forecast_endpoint(self, headers):
        """GET /api/treasury/forecast returns forecast data structure"""
        res = requests.get(f"{BASE_URL}/api/treasury/forecast", headers=headers)
        assert res.status_code == 200, f"Treasury forecast failed: {res.text}"
        
        data = res.json()
        # Check required fields
        assert "current_balance" in data, "Missing current_balance"
        assert "total_receivable" in data, "Missing total_receivable"
        assert "total_payable" in data, "Missing total_payable"
        assert "projected_balance" in data, "Missing projected_balance"
        assert "forecast" in data, "Missing forecast array"
        assert isinstance(data["forecast"], list), "forecast should be a list"
        
        print(f"PASS: Treasury forecast returns: current_balance={data['current_balance']}, "
              f"total_receivable={data['total_receivable']}, total_payable={data['total_payable']}")
        return data
    
    def test_treasury_forecast_3_months(self, headers):
        """GET /api/treasury/forecast?months_ahead=3"""
        res = requests.get(f"{BASE_URL}/api/treasury/forecast?months_ahead=3", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data["forecast"]) == 3, f"Expected 3 months, got {len(data['forecast'])}"
        print(f"PASS: Treasury forecast with 3 months")
    
    def test_treasury_forecast_6_months(self, headers):
        """GET /api/treasury/forecast?months_ahead=6"""
        res = requests.get(f"{BASE_URL}/api/treasury/forecast?months_ahead=6", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data["forecast"]) == 6, f"Expected 6 months, got {len(data['forecast'])}"
        print(f"PASS: Treasury forecast with 6 months")
    
    def test_treasury_forecast_12_months(self, headers):
        """GET /api/treasury/forecast?months_ahead=12"""
        res = requests.get(f"{BASE_URL}/api/treasury/forecast?months_ahead=12", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data["forecast"]) == 12, f"Expected 12 months, got {len(data['forecast'])}"
        print(f"PASS: Treasury forecast with 12 months")
    
    def test_treasury_forecast_structure(self, headers):
        """Verify forecast array structure with monthly projections"""
        res = requests.get(f"{BASE_URL}/api/treasury/forecast?months_ahead=3", headers=headers)
        assert res.status_code == 200
        data = res.json()
        
        for month_data in data["forecast"]:
            assert "month" in month_data, "Missing month label"
            assert "month_num" in month_data, "Missing month_num"
            assert "receivable" in month_data, "Missing receivable"
            assert "payable" in month_data, "Missing payable"
            assert "net" in month_data, "Missing net"
            assert "projected_balance" in month_data, "Missing projected_balance"
        
        print(f"PASS: Forecast structure verified with all required fields")
    
    def test_treasury_receivable_detail(self, headers):
        """Verify receivable_detail is returned"""
        res = requests.get(f"{BASE_URL}/api/treasury/forecast", headers=headers)
        assert res.status_code == 200
        data = res.json()
        
        assert "receivable_detail" in data, "Missing receivable_detail"
        assert isinstance(data["receivable_detail"], list), "receivable_detail should be list"
        
        # Check structure if there are items
        if data["receivable_detail"]:
            item = data["receivable_detail"][0]
            assert "id" in item
            assert "invoice_number" in item
            assert "total" in item
        
        print(f"PASS: Receivable detail structure verified")
    
    def test_treasury_payable_detail(self, headers):
        """Verify payable_detail is returned"""
        res = requests.get(f"{BASE_URL}/api/treasury/forecast", headers=headers)
        assert res.status_code == 200
        data = res.json()
        
        assert "payable_detail" in data, "Missing payable_detail"
        assert isinstance(data["payable_detail"], list), "payable_detail should be list"
        
        print(f"PASS: Payable detail structure verified")
    
    def test_treasury_payments_detail(self, headers):
        """Verify payments_detail (scheduled supplier payments) is returned"""
        res = requests.get(f"{BASE_URL}/api/treasury/forecast", headers=headers)
        assert res.status_code == 200
        data = res.json()
        
        assert "payments_detail" in data, "Missing payments_detail"
        assert isinstance(data["payments_detail"], list), "payments_detail should be list"
        
        print(f"PASS: Payments detail (scheduled) structure verified")
    
    def test_treasury_requires_auth(self):
        """GET /api/treasury/forecast requires authentication"""
        res = requests.get(f"{BASE_URL}/api/treasury/forecast")
        assert res.status_code in [401, 403], f"Expected 401/403, got {res.status_code}"
        print("PASS: Treasury endpoint requires authentication")


class TestCleanup(TestSetup):
    """Cleanup test data"""
    
    def test_cleanup_test_contacts(self, headers):
        """Delete TEST_ prefixed contacts"""
        res = requests.get(f"{BASE_URL}/api/contacts", headers=headers)
        if res.status_code == 200:
            contacts = res.json()
            deleted = 0
            for c in contacts:
                if c.get("name", "").startswith("TEST_"):
                    del_res = requests.delete(f"{BASE_URL}/api/contacts/{c['id']}", headers=headers)
                    if del_res.status_code == 200:
                        deleted += 1
            print(f"PASS: Cleaned up {deleted} test contacts")
    
    def test_cleanup_test_invoices(self, headers):
        """Delete TEST prefixed invoices"""
        res = requests.get(f"{BASE_URL}/api/invoices", headers=headers)
        if res.status_code == 200:
            invoices = res.json()
            deleted = 0
            for inv in invoices:
                if inv.get("invoice_number", "").startswith("TEST"):
                    del_res = requests.delete(f"{BASE_URL}/api/invoices/{inv['id']}", headers=headers)
                    if del_res.status_code == 200:
                        deleted += 1
            print(f"PASS: Cleaned up {deleted} test invoices")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
