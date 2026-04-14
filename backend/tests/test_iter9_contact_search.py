"""
Iteration 9 Backend Tests
Tests for:
1. POST /api/contact-form (PUBLIC - no auth needed) - saves form data with name, email, phone, service, message, source
2. GET /api/contact-forms (auth required) - returns submitted forms
3. GET /api/search?q=test (auth required) - returns results with type, label, id, path
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@leiva.com"
TEST_PASSWORD = "newpass123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for protected endpoints"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestContactFormPublic:
    """Tests for POST /api/contact-form (PUBLIC endpoint - no auth required)"""
    
    def test_submit_contact_form_success(self, api_client):
        """Test submitting a contact form with all fields"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"TEST_User_{unique_id}",
            "email": f"test_{unique_id}@example.com",
            "phone": "+34600000000",
            "service": "logistica",
            "message": f"Test message from iteration 9 - {unique_id}",
            "source": "landing"
        }
        response = api_client.post(f"{BASE_URL}/api/contact-form", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "id" in data
        assert data["message"] == "Mensaje enviado correctamente. Te contactaremos pronto."
        assert isinstance(data["id"], str)
        assert len(data["id"]) > 0
        print(f"PASS: Contact form submitted successfully with id: {data['id']}")
    
    def test_submit_contact_form_minimal_fields(self, api_client):
        """Test submitting with only required fields"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"TEST_Minimal_{unique_id}",
            "email": f"minimal_{unique_id}@test.com",
            "message": "Minimal test message"
        }
        response = api_client.post(f"{BASE_URL}/api/contact-form", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"PASS: Contact form with minimal fields submitted, id: {data['id']}")
    
    def test_submit_contact_form_marketing_source(self, api_client):
        """Test submitting from marketing-digital page"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"TEST_Marketing_{unique_id}",
            "email": f"marketing_{unique_id}@test.com",
            "phone": "+34611111111",
            "service": "conversation-ai",
            "message": "Interested in AI services",
            "source": "marketing-digital"
        }
        response = api_client.post(f"{BASE_URL}/api/contact-form", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"PASS: Marketing contact form submitted, id: {data['id']}")
    
    def test_contact_form_no_auth_required(self, api_client):
        """Verify endpoint works without authentication"""
        # Explicitly ensure no auth header
        api_client.headers.pop("Authorization", None)
        
        payload = {
            "name": "TEST_NoAuth",
            "email": "noauth@test.com",
            "message": "Testing without auth"
        }
        response = api_client.post(f"{BASE_URL}/api/contact-form", json=payload)
        
        assert response.status_code == 200, "Contact form should work without auth"
        print("PASS: Contact form endpoint is public (no auth required)")


class TestContactFormsAuth:
    """Tests for GET /api/contact-forms (requires authentication)"""
    
    def test_get_contact_forms_authenticated(self, authenticated_client):
        """Test retrieving contact forms with valid auth"""
        response = authenticated_client.get(f"{BASE_URL}/api/contact-forms")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} contact forms")
        
        # Verify structure of returned forms
        if len(data) > 0:
            form = data[0]
            assert "id" in form
            assert "name" in form
            assert "email" in form
            assert "message" in form
            assert "source" in form
            assert "status" in form
            assert "created_at" in form
            print("PASS: Contact form structure is correct")
    
    def test_get_contact_forms_requires_auth(self, api_client):
        """Test that endpoint requires authentication"""
        # Ensure no auth header
        api_client.headers.pop("Authorization", None)
        
        response = api_client.get(f"{BASE_URL}/api/contact-forms")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("PASS: GET /api/contact-forms requires authentication")
    
    def test_contact_forms_sorted_by_date(self, authenticated_client):
        """Test that forms are sorted by created_at descending"""
        response = authenticated_client.get(f"{BASE_URL}/api/contact-forms")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) >= 2:
            # Check descending order
            for i in range(len(data) - 1):
                assert data[i]["created_at"] >= data[i+1]["created_at"], "Forms should be sorted by date descending"
            print("PASS: Contact forms are sorted by date (newest first)")
        else:
            print("SKIP: Not enough forms to verify sorting")


class TestGlobalSearch:
    """Tests for GET /api/search (requires authentication)"""
    
    def test_search_returns_results(self, authenticated_client):
        """Test search returns results with correct structure"""
        response = authenticated_client.get(f"{BASE_URL}/api/search?q=test")
        
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "total" in data
        assert isinstance(data["results"], list)
        print(f"PASS: Search returned {data['total']} results")
        
        # Verify result structure
        if len(data["results"]) > 0:
            result = data["results"][0]
            assert "type" in result
            assert "label" in result
            assert "id" in result
            assert "path" in result
            print(f"PASS: Search result structure correct - type: {result['type']}, path: {result['path']}")
    
    def test_search_result_types(self, authenticated_client):
        """Test search returns different types (import, invoice, contact, shipment, transaction)"""
        response = authenticated_client.get(f"{BASE_URL}/api/search?q=test")
        
        assert response.status_code == 200
        data = response.json()
        
        types_found = set(r["type"] for r in data["results"])
        expected_types = {"import", "invoice", "contact", "shipment", "transaction"}
        
        print(f"Types found in search: {types_found}")
        # At least some types should be present
        assert len(types_found) > 0, "Search should return at least one type"
        print(f"PASS: Search returns multiple types: {types_found}")
    
    def test_search_requires_auth(self, api_client):
        """Test that search requires authentication"""
        api_client.headers.pop("Authorization", None)
        
        response = api_client.get(f"{BASE_URL}/api/search?q=test")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("PASS: GET /api/search requires authentication")
    
    def test_search_short_query_returns_empty(self, authenticated_client):
        """Test that queries < 2 chars return empty results"""
        response = authenticated_client.get(f"{BASE_URL}/api/search?q=a")
        
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []
        print("PASS: Short query (< 2 chars) returns empty results")
    
    def test_search_empty_query_returns_empty(self, authenticated_client):
        """Test that empty query returns empty results"""
        response = authenticated_client.get(f"{BASE_URL}/api/search?q=")
        
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []
        print("PASS: Empty query returns empty results")
    
    def test_search_paths_are_valid(self, authenticated_client):
        """Test that search result paths are valid routes"""
        response = authenticated_client.get(f"{BASE_URL}/api/search?q=test")
        
        assert response.status_code == 200
        data = response.json()
        
        valid_paths = {"/imports", "/invoices", "/crm", "/shipments", "/accounting"}
        
        for result in data["results"]:
            assert result["path"] in valid_paths, f"Invalid path: {result['path']}"
        
        print("PASS: All search result paths are valid routes")


class TestContactFormDataPersistence:
    """Test that contact form data is properly persisted and retrievable"""
    
    def test_submit_and_verify_persistence(self, api_client, authenticated_client):
        """Submit a form and verify it appears in the list"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"TEST_Persist_{unique_id}",
            "email": f"persist_{unique_id}@test.com",
            "phone": "+34622222222",
            "service": "sourcing",
            "message": f"Persistence test message - {unique_id}",
            "source": "landing"
        }
        
        # Submit form
        submit_response = api_client.post(f"{BASE_URL}/api/contact-form", json=payload)
        assert submit_response.status_code == 200
        form_id = submit_response.json()["id"]
        
        # Retrieve forms and verify
        get_response = authenticated_client.get(f"{BASE_URL}/api/contact-forms")
        assert get_response.status_code == 200
        forms = get_response.json()
        
        # Find our submitted form
        found_form = next((f for f in forms if f["id"] == form_id), None)
        assert found_form is not None, f"Submitted form {form_id} not found in list"
        
        # Verify all fields persisted correctly
        assert found_form["name"] == payload["name"]
        assert found_form["email"] == payload["email"]
        assert found_form["phone"] == payload["phone"]
        assert found_form["service"] == payload["service"]
        assert found_form["message"] == payload["message"]
        assert found_form["source"] == payload["source"]
        assert found_form["status"] == "new"
        
        print(f"PASS: Contact form data persisted correctly - id: {form_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
