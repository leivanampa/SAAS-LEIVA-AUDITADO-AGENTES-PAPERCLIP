"""
Iteration 10: Testing InboxPage, Contact Forms CRUD, Language Toggle, and Landing Page features
- POST /api/contact-form (public endpoint)
- GET /api/contact-forms (auth required, with filters)
- PUT /api/contact-forms/:id (auth required, status update)
- Login with admin@leiva.com / admin123
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """Health check should return ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("SUCCESS: Health endpoint returns ok")
    
    def test_login_admin_user(self):
        """Login with admin@leiva.com / admin123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@leiva.com",
            "password": "admin123"
        })
        # If user doesn't exist, we need to register first
        if response.status_code == 401:
            # Try to register the admin user
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "name": "Admin User",
                "email": "admin@leiva.com",
                "password": "admin123",
                "role": "admin"
            })
            if reg_response.status_code in [200, 201]:
                print("INFO: Admin user created")
                # Now try login again
                response = requests.post(f"{BASE_URL}/api/auth/login", json={
                    "email": "admin@leiva.com",
                    "password": "admin123"
                })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@leiva.com"
        print(f"SUCCESS: Login successful for admin@leiva.com, role: {data['user'].get('role')}")
        return data["token"]


class TestContactFormPublic:
    """Test public contact form submission (POST /api/contact-form)"""
    
    def test_submit_contact_form_full(self):
        """Submit contact form with all fields"""
        test_id = str(uuid.uuid4())[:8]
        form_data = {
            "name": f"TEST_User_{test_id}",
            "email": f"test_{test_id}@example.com",
            "phone": "+34 600 123 456",
            "service": "logistica",
            "message": f"Test message from iteration 10 - {test_id}",
            "source": "landing"
        }
        response = requests.post(f"{BASE_URL}/api/contact-form", json=form_data)
        assert response.status_code == 200, f"Contact form submission failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "message" in data
        print(f"SUCCESS: Contact form submitted, id: {data['id']}")
        return data["id"]
    
    def test_submit_contact_form_minimal(self):
        """Submit contact form with minimal fields"""
        test_id = str(uuid.uuid4())[:8]
        form_data = {
            "name": f"TEST_Minimal_{test_id}",
            "email": f"minimal_{test_id}@example.com",
            "message": "Minimal test message"
        }
        response = requests.post(f"{BASE_URL}/api/contact-form", json=form_data)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"SUCCESS: Minimal contact form submitted, id: {data['id']}")
    
    def test_submit_contact_form_marketing_source(self):
        """Submit contact form with marketing-digital source"""
        test_id = str(uuid.uuid4())[:8]
        form_data = {
            "name": f"TEST_Marketing_{test_id}",
            "email": f"marketing_{test_id}@example.com",
            "message": "Marketing digital inquiry",
            "source": "marketing-digital"
        }
        response = requests.post(f"{BASE_URL}/api/contact-form", json=form_data)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"SUCCESS: Marketing source contact form submitted, id: {data['id']}")


class TestContactFormsAuth:
    """Test authenticated contact forms endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin user"""
        # First try login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@leiva.com",
            "password": "admin123"
        })
        if response.status_code == 401:
            # Register if not exists
            requests.post(f"{BASE_URL}/api/auth/register", json={
                "name": "Admin User",
                "email": "admin@leiva.com",
                "password": "admin123",
                "role": "admin"
            })
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@leiva.com",
                "password": "admin123"
            })
        
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not authenticate")
    
    def test_get_contact_forms_requires_auth(self):
        """GET /api/contact-forms requires authentication"""
        response = requests.get(f"{BASE_URL}/api/contact-forms")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: GET /api/contact-forms requires auth")
    
    def test_get_contact_forms_with_auth(self, auth_token):
        """GET /api/contact-forms returns list with auth"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/contact-forms", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/contact-forms returned {len(data)} forms")
        return data
    
    def test_filter_by_status_new(self, auth_token):
        """Filter contact forms by status=new"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/contact-forms?status=new", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # All returned forms should have status=new
        for form in data:
            assert form.get("status") == "new", f"Expected status=new, got {form.get('status')}"
        print(f"SUCCESS: Filter by status=new returned {len(data)} forms")
    
    def test_filter_by_status_in_progress(self, auth_token):
        """Filter contact forms by status=in_progress"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/contact-forms?status=in_progress", headers=headers)
        assert response.status_code == 200
        data = response.json()
        for form in data:
            assert form.get("status") == "in_progress"
        print(f"SUCCESS: Filter by status=in_progress returned {len(data)} forms")
    
    def test_filter_by_status_resolved(self, auth_token):
        """Filter contact forms by status=resolved"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/contact-forms?status=resolved", headers=headers)
        assert response.status_code == 200
        data = response.json()
        for form in data:
            assert form.get("status") == "resolved"
        print(f"SUCCESS: Filter by status=resolved returned {len(data)} forms")
    
    def test_search_by_name(self, auth_token):
        """Search contact forms by name"""
        # First create a form with unique name
        test_id = str(uuid.uuid4())[:8]
        unique_name = f"TEST_SearchName_{test_id}"
        requests.post(f"{BASE_URL}/api/contact-form", json={
            "name": unique_name,
            "email": f"search_{test_id}@example.com",
            "message": "Search test"
        })
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/contact-forms?search={unique_name}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1, "Search should return at least 1 result"
        assert any(unique_name in form.get("name", "") for form in data)
        print(f"SUCCESS: Search by name returned {len(data)} results")
    
    def test_search_by_email(self, auth_token):
        """Search contact forms by email"""
        test_id = str(uuid.uuid4())[:8]
        unique_email = f"searchemail_{test_id}@testdomain.com"
        requests.post(f"{BASE_URL}/api/contact-form", json={
            "name": f"TEST_EmailSearch_{test_id}",
            "email": unique_email,
            "message": "Email search test"
        })
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/contact-forms?search={unique_email}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        print(f"SUCCESS: Search by email returned {len(data)} results")


class TestContactFormStatusUpdate:
    """Test PUT /api/contact-forms/:id for status updates"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@leiva.com",
            "password": "admin123"
        })
        if response.status_code == 401:
            requests.post(f"{BASE_URL}/api/auth/register", json={
                "name": "Admin User",
                "email": "admin@leiva.com",
                "password": "admin123",
                "role": "admin"
            })
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@leiva.com",
                "password": "admin123"
            })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not authenticate")
    
    def test_update_status_to_in_progress(self, auth_token):
        """Update contact form status to in_progress"""
        # Create a new form
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(f"{BASE_URL}/api/contact-form", json={
            "name": f"TEST_StatusUpdate_{test_id}",
            "email": f"status_{test_id}@example.com",
            "message": "Status update test"
        })
        form_id = create_response.json()["id"]
        
        # Update status
        headers = {"Authorization": f"Bearer {auth_token}"}
        update_response = requests.put(
            f"{BASE_URL}/api/contact-forms/{form_id}",
            json={"status": "in_progress"},
            headers=headers
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        data = update_response.json()
        assert data.get("status") == "in_progress"
        assert "updated_at" in data
        print(f"SUCCESS: Status updated to in_progress for form {form_id}")
    
    def test_update_status_to_resolved(self, auth_token):
        """Update contact form status to resolved"""
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(f"{BASE_URL}/api/contact-form", json={
            "name": f"TEST_Resolved_{test_id}",
            "email": f"resolved_{test_id}@example.com",
            "message": "Resolved test"
        })
        form_id = create_response.json()["id"]
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        update_response = requests.put(
            f"{BASE_URL}/api/contact-forms/{form_id}",
            json={"status": "resolved"},
            headers=headers
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data.get("status") == "resolved"
        print(f"SUCCESS: Status updated to resolved for form {form_id}")
    
    def test_update_nonexistent_form(self, auth_token):
        """Update non-existent form returns 404"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/contact-forms/{fake_id}",
            json={"status": "resolved"},
            headers=headers
        )
        assert response.status_code == 404
        print("SUCCESS: Update non-existent form returns 404")
    
    def test_update_requires_auth(self):
        """PUT /api/contact-forms/:id requires authentication"""
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/contact-forms/{fake_id}",
            json={"status": "resolved"}
        )
        assert response.status_code in [401, 403]
        print("SUCCESS: PUT /api/contact-forms requires auth")


class TestDataPersistence:
    """Test that data persists correctly"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@leiva.com",
            "password": "admin123"
        })
        if response.status_code == 401:
            requests.post(f"{BASE_URL}/api/auth/register", json={
                "name": "Admin User",
                "email": "admin@leiva.com",
                "password": "admin123",
                "role": "admin"
            })
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@leiva.com",
                "password": "admin123"
            })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not authenticate")
    
    def test_create_and_verify_persistence(self, auth_token):
        """Create form and verify it appears in list"""
        test_id = str(uuid.uuid4())[:8]
        unique_name = f"TEST_Persist_{test_id}"
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/contact-form", json={
            "name": unique_name,
            "email": f"persist_{test_id}@example.com",
            "phone": "+34 111 222 333",
            "service": "sourcing",
            "message": "Persistence test message",
            "source": "landing"
        })
        assert create_response.status_code == 200
        form_id = create_response.json()["id"]
        
        # Verify in list
        headers = {"Authorization": f"Bearer {auth_token}"}
        list_response = requests.get(f"{BASE_URL}/api/contact-forms", headers=headers)
        assert list_response.status_code == 200
        forms = list_response.json()
        
        found = next((f for f in forms if f.get("id") == form_id), None)
        assert found is not None, f"Form {form_id} not found in list"
        assert found["name"] == unique_name
        assert found["email"] == f"persist_{test_id}@example.com"
        assert found["phone"] == "+34 111 222 333"
        assert found["service"] == "sourcing"
        assert found["status"] == "new"
        assert found["source"] == "landing"
        print(f"SUCCESS: Form {form_id} persisted correctly with all fields")
    
    def test_status_update_persists(self, auth_token):
        """Update status and verify it persists"""
        test_id = str(uuid.uuid4())[:8]
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/contact-form", json={
            "name": f"TEST_StatusPersist_{test_id}",
            "email": f"statuspersist_{test_id}@example.com",
            "message": "Status persistence test"
        })
        form_id = create_response.json()["id"]
        
        # Update to in_progress
        headers = {"Authorization": f"Bearer {auth_token}"}
        requests.put(
            f"{BASE_URL}/api/contact-forms/{form_id}",
            json={"status": "in_progress"},
            headers=headers
        )
        
        # Verify
        list_response = requests.get(f"{BASE_URL}/api/contact-forms", headers=headers)
        forms = list_response.json()
        found = next((f for f in forms if f.get("id") == form_id), None)
        assert found is not None
        assert found["status"] == "in_progress"
        
        # Update to resolved
        requests.put(
            f"{BASE_URL}/api/contact-forms/{form_id}",
            json={"status": "resolved"},
            headers=headers
        )
        
        # Verify again
        list_response = requests.get(f"{BASE_URL}/api/contact-forms", headers=headers)
        forms = list_response.json()
        found = next((f for f in forms if f.get("id") == form_id), None)
        assert found["status"] == "resolved"
        print(f"SUCCESS: Status updates persist correctly for form {form_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
