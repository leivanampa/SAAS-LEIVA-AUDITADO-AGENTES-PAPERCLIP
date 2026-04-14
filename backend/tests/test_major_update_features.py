"""
Test Suite for Major Update Features (Iteration 5):
- Landing Page (unauthenticated access)
- PDF Export for imports
- Automations CRUD (rules engine)
- User management and roles
- Client portal (assigned imports)
- Role-based access control
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "test@leiva.com"
ADMIN_PASSWORD = "newpass123"
CLIENT_EMAIL = "clientedemo@test.com"
CLIENT_PASSWORD = "demo123"

@pytest.fixture(scope="module")
def admin_token():
    """Get admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    return response.json()["token"]

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture(scope="module")
def admin_user_data():
    """Get admin user data from login"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("user", {})
    return {}

# ===== PUBLIC ENDPOINTS (NO AUTH) =====

class TestPublicEndpoints:
    """Test endpoints that don't require authentication"""
    
    def test_health_endpoint(self):
        """Health check should be public"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("PASS: Health endpoint accessible")
    
    def test_landing_page_accessible(self):
        """Root should be accessible without auth"""
        response = requests.get(f"{BASE_URL}/")
        # Should return 200 with HTML content
        assert response.status_code == 200, f"Root failed: {response.status_code}"
        print("PASS: Landing page accessible at /")
    
    def test_login_endpoint_public(self):
        """Login should be public"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpass"
        })
        # Should return 401 (unauthorized), not 403 (forbidden) - meaning endpoint is public
        assert response.status_code == 401, f"Login endpoint returned: {response.status_code}"
        print("PASS: Login endpoint is public (returns 401 for bad credentials)")

# ===== PDF EXPORT =====

class TestPDFExport:
    """Test PDF export functionality for imports"""
    
    def test_pdf_export_requires_auth(self):
        """PDF export should require authentication"""
        # First we need an import ID, but let's test with a fake one
        response = requests.get(f"{BASE_URL}/api/imports/fake-id/pdf")
        assert response.status_code in [401, 403], f"PDF should require auth: {response.status_code}"
        print("PASS: PDF export requires authentication")
    
    def test_pdf_export_with_valid_import(self, admin_headers):
        """PDF export should return PDF for valid import"""
        # First create a test import
        create_response = requests.post(f"{BASE_URL}/api/imports", 
            json={"reference": "TEST-PDF-001", "name": "Test PDF Export"},
            headers=admin_headers
        )
        assert create_response.status_code == 200, f"Create import failed: {create_response.text}"
        import_id = create_response.json()["id"]
        
        # Now test PDF export
        pdf_response = requests.get(f"{BASE_URL}/api/imports/{import_id}/pdf", headers=admin_headers)
        assert pdf_response.status_code == 200, f"PDF export failed: {pdf_response.status_code}"
        assert "application/pdf" in pdf_response.headers.get("content-type", ""), \
            f"Content-Type should be application/pdf, got: {pdf_response.headers.get('content-type')}"
        assert len(pdf_response.content) > 0, "PDF content should not be empty"
        print(f"PASS: PDF export returned {len(pdf_response.content)} bytes")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/imports/{import_id}", headers=admin_headers)
    
    def test_pdf_export_nonexistent_import(self, admin_headers):
        """PDF export should return 404 for non-existent import"""
        response = requests.get(f"{BASE_URL}/api/imports/nonexistent-id/pdf", headers=admin_headers)
        assert response.status_code == 404, f"Should return 404: {response.status_code}"
        print("PASS: PDF export returns 404 for non-existent import")

# ===== AUTOMATIONS CRUD =====

class TestAutomationsCRUD:
    """Test automations (rules engine) CRUD operations"""
    
    def test_automations_requires_auth(self):
        """Automations should require authentication"""
        response = requests.get(f"{BASE_URL}/api/automations")
        assert response.status_code in [401, 403], f"Automations should require auth: {response.status_code}"
        print("PASS: Automations requires authentication")
    
    def test_create_automation_rule(self, admin_headers):
        """Create an automation rule"""
        rule_data = {
            "name": "TEST Notify on Aduana",
            "trigger_stage": 8,
            "action_type": "notification",
            "notification_message": "La importacion ha llegado a Aduana",
            "active": True
        }
        response = requests.post(f"{BASE_URL}/api/automations", json=rule_data, headers=admin_headers)
        assert response.status_code == 200, f"Create automation failed: {response.text}"
        data = response.json()
        assert data["name"] == rule_data["name"]
        assert data["trigger_stage"] == 8
        assert data["action_type"] == "notification"
        assert "id" in data
        print(f"PASS: Created automation rule: {data['id']}")
        return data["id"]
    
    def test_get_automations_list(self, admin_headers):
        """Get list of automations"""
        response = requests.get(f"{BASE_URL}/api/automations", headers=admin_headers)
        assert response.status_code == 200, f"Get automations failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} automation rules")
    
    def test_update_automation_rule(self, admin_headers):
        """Update an automation rule (toggle active)"""
        # Create a rule first
        create_response = requests.post(f"{BASE_URL}/api/automations", json={
            "name": "TEST Update Rule",
            "trigger_stage": 5,
            "action_type": "email",
            "email_to": "test@test.com",
            "active": True
        }, headers=admin_headers)
        assert create_response.status_code == 200
        rule_id = create_response.json()["id"]
        
        # Update to toggle active off
        update_response = requests.put(f"{BASE_URL}/api/automations/{rule_id}", 
            json={"active": False}, headers=admin_headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        assert update_response.json()["active"] == False
        print(f"PASS: Updated automation rule {rule_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/automations/{rule_id}", headers=admin_headers)
    
    def test_delete_automation_rule(self, admin_headers):
        """Delete an automation rule"""
        # Create a rule first
        create_response = requests.post(f"{BASE_URL}/api/automations", json={
            "name": "TEST Delete Rule",
            "trigger_stage": 3,
            "action_type": "notification",
            "active": True
        }, headers=admin_headers)
        assert create_response.status_code == 200
        rule_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/automations/{rule_id}", headers=admin_headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.status_code}"
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/automations", headers=admin_headers)
        rules = get_response.json()
        assert not any(r["id"] == rule_id for r in rules), "Rule should be deleted"
        print(f"PASS: Deleted automation rule {rule_id}")

# ===== USER MANAGEMENT =====

class TestUserManagement:
    """Test user management and roles (admin only)"""
    
    def test_get_users_requires_auth(self):
        """GET /api/users should require authentication"""
        response = requests.get(f"{BASE_URL}/api/users")
        assert response.status_code in [401, 403], f"Users should require auth: {response.status_code}"
        print("PASS: GET /api/users requires authentication")
    
    def test_get_users_admin_access(self, admin_headers):
        """Admin should be able to get users list"""
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        assert response.status_code == 200, f"Admin get users failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # Verify password is not exposed
        if len(data) > 0:
            assert "password" not in data[0], "Password should not be exposed"
        print(f"PASS: Admin retrieved {len(data)} users")
    
    def test_get_users_non_admin_forbidden(self, admin_headers):
        """Non-admin should NOT be able to get users list"""
        # Try to create a regular user and test
        # First register a new user with role 'user'
        test_email = "test_regular_user@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": test_email,
            "password": "testpass123",
            "role": "user"
        })
        
        if reg_response.status_code == 200:
            user_token = reg_response.json()["token"]
            user_headers = {"Authorization": f"Bearer {user_token}"}
            
            # Try to access users endpoint
            response = requests.get(f"{BASE_URL}/api/users", headers=user_headers)
            assert response.status_code == 403, f"Non-admin should get 403, got: {response.status_code}"
            print("PASS: Non-admin gets 403 on /api/users")
            
            # Cleanup - delete the test user if admin
            users_response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
            if users_response.status_code == 200:
                for user in users_response.json():
                    if user.get("email") == test_email:
                        # No delete endpoint exists, so we skip cleanup
                        pass
        else:
            # User might already exist, try login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": "testpass123"
            })
            if login_response.status_code == 200:
                user_token = login_response.json()["token"]
                user_headers = {"Authorization": f"Bearer {user_token}"}
                response = requests.get(f"{BASE_URL}/api/users", headers=user_headers)
                assert response.status_code == 403, f"Non-admin should get 403, got: {response.status_code}"
                print("PASS: Non-admin gets 403 on /api/users")
            else:
                pytest.skip("Could not create or login as regular user for test")
    
    def test_update_user_role_admin_only(self, admin_headers):
        """Only admin can update user roles"""
        # Get users list
        users_response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        assert users_response.status_code == 200
        users = users_response.json()
        
        # Find a non-admin user to test with (or create one)
        test_user_id = None
        for user in users:
            if user.get("role") != "admin" and user.get("email") != ADMIN_EMAIL:
                test_user_id = user["id"]
                original_role = user.get("role", "user")
                break
        
        if test_user_id:
            # Try to change role
            new_role = "manager" if original_role != "manager" else "user"
            response = requests.put(f"{BASE_URL}/api/users/{test_user_id}/role", 
                json={"role": new_role}, headers=admin_headers)
            assert response.status_code == 200, f"Role update failed: {response.text}"
            assert response.json()["role"] == new_role
            print(f"PASS: Admin updated user role to {new_role}")
            
            # Revert
            requests.put(f"{BASE_URL}/api/users/{test_user_id}/role", 
                json={"role": original_role}, headers=admin_headers)
        else:
            print("SKIP: No non-admin user found to test role update")
    
    def test_create_client_user(self, admin_headers):
        """Admin can create a client user with assigned imports"""
        client_data = {
            "name": "TEST Cliente",
            "email": f"test_client_{os.urandom(4).hex()}@test.com",
            "password": "testclient123",
            "company": "Test Company",
            "import_ids": []
        }
        response = requests.post(f"{BASE_URL}/api/users/create-client", 
            json=client_data, headers=admin_headers)
        assert response.status_code == 200, f"Create client failed: {response.text}"
        data = response.json()
        assert data["role"] == "client"
        assert data["email"] == client_data["email"]
        print(f"PASS: Created client user: {data['email']}")
        return data["id"]

# ===== CLIENT PORTAL =====

class TestClientPortal:
    """Test client portal functionality"""
    
    def test_client_portal_requires_auth(self):
        """Client portal endpoints should require authentication"""
        response = requests.get(f"{BASE_URL}/api/client/imports")
        assert response.status_code in [401, 403], f"Client portal should require auth: {response.status_code}"
        print("PASS: Client portal requires authentication")
    
    def test_client_can_access_portal(self, admin_headers):
        """Client can access their assigned imports"""
        # First create an import
        import_response = requests.post(f"{BASE_URL}/api/imports", 
            json={"reference": "TEST-CLIENT-001", "name": "Test Client Import"},
            headers=admin_headers)
        assert import_response.status_code == 200
        import_id = import_response.json()["id"]
        
        # Create a client and assign the import
        client_email = f"test_portal_client_{os.urandom(4).hex()}@test.com"
        client_password = "portaltest123"
        client_response = requests.post(f"{BASE_URL}/api/users/create-client", json={
            "name": "Portal Test Client",
            "email": client_email,
            "password": client_password,
            "company": "Portal Test Co",
            "import_ids": [import_id]
        }, headers=admin_headers)
        assert client_response.status_code == 200, f"Create client failed: {client_response.text}"
        
        # Login as client
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": client_email,
            "password": client_password
        })
        assert login_response.status_code == 200, f"Client login failed: {login_response.text}"
        client_token = login_response.json()["token"]
        client_headers = {"Authorization": f"Bearer {client_token}"}
        
        # Access client portal
        portal_response = requests.get(f"{BASE_URL}/api/client/imports", headers=client_headers)
        assert portal_response.status_code == 200, f"Client portal access failed: {portal_response.text}"
        imports = portal_response.json()
        assert isinstance(imports, list)
        assert len(imports) > 0, "Client should see assigned import"
        assert imports[0]["id"] == import_id
        print(f"PASS: Client can see {len(imports)} assigned import(s)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/imports/{import_id}", headers=admin_headers)
    
    def test_client_import_detail(self, admin_headers):
        """Client can get detail of assigned import"""
        # Create import
        import_response = requests.post(f"{BASE_URL}/api/imports", 
            json={"reference": "TEST-DETAIL-001", "name": "Test Detail Import"},
            headers=admin_headers)
        assert import_response.status_code == 200
        import_id = import_response.json()["id"]
        
        # Create client with import assigned
        client_email = f"test_detail_client_{os.urandom(4).hex()}@test.com"
        client_password = "detailtest123"
        requests.post(f"{BASE_URL}/api/users/create-client", json={
            "name": "Detail Test Client",
            "email": client_email,
            "password": client_password,
            "import_ids": [import_id]
        }, headers=admin_headers)
        
        # Login as client
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": client_email,
            "password": client_password
        })
        client_token = login_response.json()["token"]
        client_headers = {"Authorization": f"Bearer {client_token}"}
        
        # Get import detail
        detail_response = requests.get(f"{BASE_URL}/api/client/imports/{import_id}", headers=client_headers)
        assert detail_response.status_code == 200, f"Client detail access failed: {detail_response.text}"
        detail = detail_response.json()
        assert detail["id"] == import_id
        print(f"PASS: Client can access import detail")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/imports/{import_id}", headers=admin_headers)
    
    def test_client_cannot_access_unassigned_import(self, admin_headers):
        """Client cannot access imports not assigned to them"""
        # Create import NOT assigned to any client
        import_response = requests.post(f"{BASE_URL}/api/imports", 
            json={"reference": "TEST-UNASSIGNED-001", "name": "Unassigned Import"},
            headers=admin_headers)
        assert import_response.status_code == 200
        import_id = import_response.json()["id"]
        
        # Create client WITHOUT this import assigned
        client_email = f"test_no_access_{os.urandom(4).hex()}@test.com"
        client_password = "noaccess123"
        requests.post(f"{BASE_URL}/api/users/create-client", json={
            "name": "No Access Client",
            "email": client_email,
            "password": client_password,
            "import_ids": []  # No imports assigned
        }, headers=admin_headers)
        
        # Login as client
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": client_email,
            "password": client_password
        })
        client_token = login_response.json()["token"]
        client_headers = {"Authorization": f"Bearer {client_token}"}
        
        # Try to access unassigned import
        detail_response = requests.get(f"{BASE_URL}/api/client/imports/{import_id}", headers=client_headers)
        assert detail_response.status_code in [403, 404], \
            f"Client should NOT access unassigned import, got: {detail_response.status_code}"
        print("PASS: Client cannot access unassigned import")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/imports/{import_id}", headers=admin_headers)

# ===== ADMIN LOGIN ROUTING =====

class TestLoginRouting:
    """Test login routing based on role"""
    
    def test_admin_login_returns_role(self):
        """Admin login should return role in response"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert "role" in data["user"]
        assert data["user"]["role"] == "admin"
        print(f"PASS: Admin login returns role: {data['user']['role']}")

# ===== FILE UPLOAD IN PIPELINE =====

class TestFileUploadInPipeline:
    """Test file upload functionality in import pipeline"""
    
    def test_file_upload_endpoint(self, admin_headers):
        """File upload should work"""
        # Create a test file in memory
        files = {
            'file': ('test_document.pdf', b'%PDF-1.4 test content', 'application/pdf')
        }
        # Remove Content-Type from headers for multipart
        headers = {k: v for k, v in admin_headers.items() if k.lower() != 'content-type'}
        
        response = requests.post(f"{BASE_URL}/api/files/upload", files=files, headers=headers)
        assert response.status_code == 200, f"File upload failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "filename" in data
        assert "url" in data
        print(f"PASS: File uploaded successfully: {data['filename']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/files/{data['id']}", headers=admin_headers)

# ===== CLEANUP =====

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_automations(self, admin_headers):
        """Cleanup any TEST automation rules"""
        response = requests.get(f"{BASE_URL}/api/automations", headers=admin_headers)
        if response.status_code == 200:
            for rule in response.json():
                if rule.get("name", "").startswith("TEST"):
                    requests.delete(f"{BASE_URL}/api/automations/{rule['id']}", headers=admin_headers)
                    print(f"Cleaned up automation: {rule['name']}")
        print("PASS: Cleanup completed")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
