import requests
import sys
import json
from datetime import datetime

class LeivasSaasAPITester:
    def __init__(self, base_url="https://leiva-saas.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        self.test_user_password = "TestPass123!"
        self.test_contact_id = None
        self.test_shipment_id = None
        self.test_document_id = None
        self.test_invoice_id = None
        self.test_import_id = None

    def log_result(self, test_name, success, response_data=None, error=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2)}")
        else:
            self.failed_tests.append({
                "test": test_name,
                "error": str(error),
                "response": response_data
            })
            print(f"❌ {test_name} - FAILED")
            print(f"   Error: {error}")
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2)}")

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            if success:
                self.log_result(name, True, response_data)
                return True, response_data
            else:
                self.log_result(name, False, response_data, f"Expected {expected_status}, got {response.status_code}")
                return False, response_data

        except Exception as e:
            self.log_result(name, False, error=str(e))
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_register_user(self):
        """Test user registration"""
        data = {
            "name": "Test User",
            "email": self.test_user_email,
            "password": self.test_user_password,
            "role": "user"
        }
        success, response = self.run_test("Register New User", "POST", "auth/register", 200, data)
        if success and 'token' in response:
            self.token = response['token']
            print(f"   ✅ Obtained token: {self.token[:20]}...")
        return success

    def test_login_existing_user(self):
        """Test login with existing admin user"""
        data = {
            "email": "admin@leiva.com",
            "password": "admin123"
        }
        success, response = self.run_test("Login Existing Admin", "POST", "auth/login", 200, data)
        if success and 'token' in response:
            self.token = response['token']
            print(f"   ✅ Obtained admin token: {self.token[:20]}...")
        return success

    def test_get_user_profile(self):
        """Test getting current user profile"""
        return self.run_test("Get User Profile", "GET", "auth/me", 200)

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        return self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)

    def test_recent_activity(self):
        """Test recent activity endpoint"""
        return self.run_test("Recent Activity", "GET", "dashboard/recent-activity", 200)

    def test_create_contact(self):
        """Test creating a contact"""
        data = {
            "name": "Test Supplier",
            "company": "Test Company Ltd",
            "email": "supplier@test.com",
            "phone": "+34123456789",
            "type": "supplier",
            "country": "China",
            "notes": "Test supplier for testing purposes",
            "tags": ["electronics", "testing"]
        }
        success, response = self.run_test("Create Contact", "POST", "contacts", 200, data)
        if success and 'id' in response:
            self.test_contact_id = response['id']
            print(f"   ✅ Created contact with ID: {self.test_contact_id}")
        return success

    def test_get_contacts(self):
        """Test getting all contacts"""
        return self.run_test("Get All Contacts", "GET", "contacts", 200)

    def test_get_contact_by_id(self):
        """Test getting specific contact by ID"""
        if not self.test_contact_id:
            print("⚠️  Skipping contact by ID test - no contact ID available")
            return False
        return self.run_test("Get Contact by ID", "GET", f"contacts/{self.test_contact_id}", 200)

    def test_update_contact(self):
        """Test updating a contact"""
        if not self.test_contact_id:
            print("⚠️  Skipping contact update test - no contact ID available")
            return False
        data = {"notes": "Updated notes for testing"}
        return self.run_test("Update Contact", "PUT", f"contacts/{self.test_contact_id}", 200, data)

    def test_create_shipment(self):
        """Test creating a shipment"""
        data = {
            "reference": "IMP-2024-001",
            "origin": "Shenzhen, China",
            "destination": "Barcelona, Spain",
            "supplier_name": "Test Supplier",
            "product_description": "Electronic components for testing",
            "quantity": 100,
            "weight_kg": 50.5,
            "volume_cbm": 2.3,
            "shipping_method": "sea",
            "status": "pending",
            "estimated_departure": "2024-03-01",
            "estimated_arrival": "2024-04-15",
            "tracking_number": "TRAK123456",
            "container_number": "CONT789012",
            "incoterm": "FOB",
            "notes": "Test shipment for API testing",
            "cost_eur": 2500.00
        }
        success, response = self.run_test("Create Shipment", "POST", "shipments", 200, data)
        if success and 'id' in response:
            self.test_shipment_id = response['id']
            print(f"   ✅ Created shipment with ID: {self.test_shipment_id}")
        return success

    def test_get_shipments(self):
        """Test getting all shipments"""
        return self.run_test("Get All Shipments", "GET", "shipments", 200)

    def test_get_shipment_by_id(self):
        """Test getting specific shipment by ID"""
        if not self.test_shipment_id:
            print("⚠️  Skipping shipment by ID test - no shipment ID available")
            return False
        return self.run_test("Get Shipment by ID", "GET", f"shipments/{self.test_shipment_id}", 200)

    def test_update_shipment(self):
        """Test updating a shipment"""
        if not self.test_shipment_id:
            print("⚠️  Skipping shipment update test - no shipment ID available")
            return False
        data = {"status": "in_transit", "notes": "Updated shipment status"}
        return self.run_test("Update Shipment", "PUT", f"shipments/{self.test_shipment_id}", 200, data)

    def test_create_document(self):
        """Test creating a document"""
        data = {
            "name": "Test Invoice Document",
            "category": "invoice",
            "shipment_id": self.test_shipment_id or "",
            "description": "Test document for API testing",
            "file_url": "https://example.com/test-document.pdf",
            "file_type": "application/pdf"
        }
        success, response = self.run_test("Create Document", "POST", "documents", 200, data)
        if success and 'id' in response:
            self.test_document_id = response['id']
            print(f"   ✅ Created document with ID: {self.test_document_id}")
        return success

    def test_get_documents(self):
        """Test getting all documents"""
        return self.run_test("Get All Documents", "GET", "documents", 200)

    def test_get_document_by_id(self):
        """Test getting specific document by ID"""
        if not self.test_document_id:
            print("⚠️  Skipping document by ID test - no document ID available")
            return False
        return self.run_test("Get Document by ID", "GET", f"documents/{self.test_document_id}", 200)

    def test_create_invoice(self):
        """Test creating an invoice with line items"""
        data = {
            "invoice_number": "INV-2024-001",
            "contact_name": "Test Client",
            "type": "sale",
            "items": [
                {"description": "Product A", "quantity": 10, "unit_price": 25.50},
                {"description": "Product B", "quantity": 5, "unit_price": 15.00}
            ],
            "subtotal": 330.00,
            "tax_rate": 21,
            "tax_amount": 69.30,
            "total": 399.30,
            "currency": "EUR",
            "status": "draft",
            "due_date": "2024-04-01",
            "notes": "Test invoice for API testing"
        }
        success, response = self.run_test("Create Invoice", "POST", "invoices", 200, data)
        if success and 'id' in response:
            self.test_invoice_id = response['id']
            print(f"   ✅ Created invoice with ID: {self.test_invoice_id}")
        return success

    def test_get_invoices(self):
        """Test getting all invoices"""
        return self.run_test("Get All Invoices", "GET", "invoices", 200)

    def test_get_invoice_by_id(self):
        """Test getting specific invoice by ID"""
        if not self.test_invoice_id:
            print("⚠️  Skipping invoice by ID test - no invoice ID available")
            return False
        return self.run_test("Get Invoice by ID", "GET", f"invoices/{self.test_invoice_id}", 200)

    def test_update_invoice(self):
        """Test updating an invoice"""
        if not self.test_invoice_id:
            print("⚠️  Skipping invoice update test - no invoice ID available")
            return False
        data = {"status": "sent", "notes": "Invoice sent to client"}
        return self.run_test("Update Invoice", "PUT", f"invoices/{self.test_invoice_id}", 200, data)

    def test_get_notifications(self):
        """Test getting notifications"""
        return self.run_test("Get Notifications", "GET", "notifications", 200)

    def test_create_import(self):
        """Test creating an import"""
        data = {
            "reference": "IMP-TEST-002",
            "name": "Test Import Pipeline"
        }
        success, response = self.run_test("Create Import", "POST", "imports", 200, data)
        if success and 'id' in response:
            self.test_import_id = response['id']
            print(f"   ✅ Created import with ID: {self.test_import_id}")
        return success

    def test_get_imports(self):
        """Test getting all imports"""
        return self.run_test("Get All Imports", "GET", "imports", 200)

    def test_get_import_by_id(self):
        """Test getting specific import by ID"""
        if not hasattr(self, 'test_import_id') or not self.test_import_id:
            print("⚠️  Skipping import by ID test - no import ID available")
            return False
        return self.run_test("Get Import by ID", "GET", f"imports/{self.test_import_id}", 200)

    def test_update_import_stage(self):
        """Test updating import stage data"""
        if not hasattr(self, 'test_import_id') or not self.test_import_id:
            print("⚠️  Skipping import stage update test - no import ID available")
            return False
        
        # Test Stage 1 (Proveedor) update
        stage1_data = {
            "company_name": "Test Supplier Co.",
            "contact_name": "John Chen",
            "email": "john@testsupplier.com",
            "phone": "+86123456789",
            "city": "Shenzhen",
            "country": "China",
            "notes": "Test supplier for API testing"
        }
        return self.run_test("Update Import Stage 1", "PUT", f"imports/{self.test_import_id}/stage/1", 200, stage1_data)

    def test_advance_import_stage(self):
        """Test advancing import to next stage"""
        if not hasattr(self, 'test_import_id') or not self.test_import_id:
            print("⚠️  Skipping import advance test - no import ID available")
            return False
        return self.run_test("Advance Import Stage", "PUT", f"imports/{self.test_import_id}/advance", 200)

    def test_lock_unlock_import(self):
        """Test locking and unlocking import"""
        if not hasattr(self, 'test_import_id') or not self.test_import_id:
            print("⚠️  Skipping import lock test - no import ID available")
            return False
        
        # Test lock/unlock toggle
        success1 = self.run_test("Toggle Import Lock", "PUT", f"imports/{self.test_import_id}/lock", 200)
        success2 = self.run_test("Toggle Import Lock Again", "PUT", f"imports/{self.test_import_id}/lock", 200)
        return success1 and success2

    def test_cost_estimator(self):
        """Test cost estimator calculation"""
        data = {
            "product_value": 10000.0,
            "freight_cost": 800.0,
            "insurance_cost": 150.0,
            "tariff_rate": 12.0,
            "vat_rate": 21.0,
            "other_costs": 200.0,
            "margin_percent": 25.0
        }
        return self.run_test("Cost Estimator Calculation", "POST", "cost-estimator", 200, data)

    def test_send_import_email(self):
        """Test sending import email (mocked)"""
        if not hasattr(self, 'test_import_id') or not self.test_import_id:
            print("⚠️  Skipping import email test - no import ID available")
            return False
        
        data = {
            "to": "client@example.com",
            "subject": "Import Status Update",
            "body": "Your import IMP-TEST-002 has been updated."
        }
        return self.run_test("Send Import Email (Mocked)", "POST", f"imports/{self.test_import_id}/send-email", 200, data)

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created test data
        if self.test_contact_id:
            self.run_test("Delete Test Contact", "DELETE", f"contacts/{self.test_contact_id}", 200)
        
        if self.test_shipment_id:
            self.run_test("Delete Test Shipment", "DELETE", f"shipments/{self.test_shipment_id}", 200)
        
        if self.test_document_id:
            self.run_test("Delete Test Document", "DELETE", f"documents/{self.test_document_id}", 200)
        
        if self.test_invoice_id:
            self.run_test("Delete Test Invoice", "DELETE", f"invoices/{self.test_invoice_id}", 200)
        
        if hasattr(self, 'test_import_id') and self.test_import_id:
            self.run_test("Delete Test Import", "DELETE", f"imports/{self.test_import_id}", 200)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Leiva's Import SAAS API Tests")
        print("=" * 60)

        # Basic tests
        self.test_health()
        
        # Auth tests - try existing user first, then register new one
        if not self.test_login_existing_user():
            self.test_register_user()
        
        self.test_get_user_profile()

        # Dashboard tests
        self.test_dashboard_stats()
        self.test_recent_activity()

        # CRM/Contacts tests
        self.test_get_contacts()
        self.test_create_contact()
        self.test_get_contact_by_id()
        self.test_update_contact()

        # Shipments tests
        self.test_get_shipments()
        self.test_create_shipment()
        self.test_get_shipment_by_id()
        self.test_update_shipment()

        # Documents tests
        self.test_get_documents()
        self.test_create_document()
        self.test_get_document_by_id()

        # Invoices tests
        self.test_get_invoices()
        self.test_create_invoice()
        self.test_get_invoice_by_id()
        self.test_update_invoice()

        # Notifications tests
        self.test_get_notifications()

        # Import Pipeline tests (NEW FEATURES)
        self.test_get_imports()
        self.test_create_import()
        self.test_get_import_by_id()
        self.test_update_import_stage()
        self.test_advance_import_stage()
        self.test_lock_unlock_import()
        self.test_send_import_email()

        # Cost Estimator tests (NEW FEATURES)
        self.test_cost_estimator()

        # Cleanup
        self.cleanup_test_data()

        # Final results
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for fail in self.failed_tests:
                print(f"  - {fail['test']}: {fail['error']}")

        return self.tests_passed == self.tests_run

def main():
    tester = LeivasSaasAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())