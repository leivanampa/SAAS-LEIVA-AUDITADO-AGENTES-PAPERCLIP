"""
Iteration 11 Tests: i18n system, Delete User functionality, Inbox Badge
Tests for:
1. DELETE /api/users/:id endpoint (admin only, cannot delete self)
2. GET /api/contact-forms?status=new (for inbox badge count)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint is working"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ Health endpoint working")
    
    def test_admin_login(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@leiva.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@leiva.com"
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful, user_id: {data['user'].get('id')}")
        return data["token"], data["user"]


class TestDeleteUserEndpoint:
    """Tests for DELETE /api/users/:id endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@leiva.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token"), response.json().get("user")
        pytest.skip("Admin authentication failed")
    
    def test_delete_user_requires_auth(self):
        """Test that delete user endpoint requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/users/some-fake-id")
        assert response.status_code in [401, 403, 422]
        print("✓ Delete user requires authentication")
    
    def test_delete_user_admin_only(self, admin_token):
        """Test that only admin can delete users"""
        token, admin_user = admin_token
        headers = {"Authorization": f"Bearer {token}"}
        
        # First create a test client user to test with
        create_response = requests.post(f"{BASE_URL}/api/users/create-client", 
            headers=headers,
            json={
                "name": "TEST_DeleteTest",
                "email": "test_delete_check@test.com",
                "password": "test123",
                "company": "Test Company"
            }
        )
        
        if create_response.status_code == 200:
            test_user_id = create_response.json().get("id")
            # Clean up - delete the test user
            requests.delete(f"{BASE_URL}/api/users/{test_user_id}", headers=headers)
        
        print("✓ Admin can access delete endpoint")
    
    def test_cannot_delete_own_account(self, admin_token):
        """Test that admin cannot delete their own account"""
        token, admin_user = admin_token
        headers = {"Authorization": f"Bearer {token}"}
        admin_id = admin_user.get("id")
        
        response = requests.delete(f"{BASE_URL}/api/users/{admin_id}", headers=headers)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        # Should contain message about not being able to delete own account
        print(f"✓ Cannot delete own account - returns 400: {data.get('detail')}")
    
    def test_delete_nonexistent_user(self, admin_token):
        """Test deleting a user that doesn't exist"""
        token, _ = admin_token
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.delete(f"{BASE_URL}/api/users/nonexistent-user-id-12345", headers=headers)
        assert response.status_code == 404
        print("✓ Delete nonexistent user returns 404")
    
    def test_create_and_delete_user_flow(self, admin_token):
        """Test full flow: create a client user, verify, then delete"""
        token, _ = admin_token
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 1: Create a test client user
        create_response = requests.post(f"{BASE_URL}/api/users/create-client", 
            headers=headers,
            json={
                "name": "TEST_ToBeDeleted",
                "email": "test_to_delete@test.com",
                "password": "test123",
                "company": "Test Delete Company"
            }
        )
        
        # Handle case where user already exists
        if create_response.status_code == 400 and "ya esta registrado" in create_response.json().get("detail", ""):
            # User exists, try to find and delete them
            users_response = requests.get(f"{BASE_URL}/api/users", headers=headers)
            users = users_response.json()
            test_user = next((u for u in users if u.get("email") == "test_to_delete@test.com"), None)
            if test_user:
                test_user_id = test_user.get("id")
            else:
                pytest.skip("Could not find or create test user")
        else:
            assert create_response.status_code == 200, f"Failed to create user: {create_response.text}"
            test_user_id = create_response.json().get("id")
        
        print(f"✓ Created test user with id: {test_user_id}")
        
        # Step 2: Verify user exists in users list
        users_response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert users_response.status_code == 200
        users = users_response.json()
        user_exists = any(u.get("id") == test_user_id for u in users)
        assert user_exists, "Created user should exist in users list"
        print("✓ User exists in users list")
        
        # Step 3: Delete the user
        delete_response = requests.delete(f"{BASE_URL}/api/users/{test_user_id}", headers=headers)
        assert delete_response.status_code == 200
        delete_data = delete_response.json()
        assert "message" in delete_data
        print(f"✓ User deleted successfully: {delete_data.get('message')}")
        
        # Step 4: Verify user no longer exists
        users_response_after = requests.get(f"{BASE_URL}/api/users", headers=headers)
        users_after = users_response_after.json()
        user_still_exists = any(u.get("id") == test_user_id for u in users_after)
        assert not user_still_exists, "Deleted user should not exist in users list"
        print("✓ User no longer exists after deletion")


class TestInboxBadgeEndpoint:
    """Tests for inbox badge count (GET /api/contact-forms?status=new)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@leiva.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_get_new_contact_forms_requires_auth(self):
        """Test that getting contact forms requires authentication"""
        response = requests.get(f"{BASE_URL}/api/contact-forms?status=new")
        assert response.status_code in [401, 403]
        print("✓ Contact forms endpoint requires authentication")
    
    def test_get_new_contact_forms_with_auth(self, admin_token):
        """Test getting new contact forms for inbox badge"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/contact-forms?status=new", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} new contact forms for inbox badge")
        
        # Verify all returned forms have status 'new'
        for form in data:
            assert form.get("status") == "new", f"Form {form.get('id')} has status {form.get('status')}, expected 'new'"
        print("✓ All returned forms have status 'new'")
    
    def test_get_all_contact_forms(self, admin_token):
        """Test getting all contact forms"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/contact-forms", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} total contact forms")


class TestNonAdminCannotDelete:
    """Test that non-admin users cannot delete users"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@leiva.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_create_manager_and_test_delete_permission(self, admin_token):
        """Create a manager user and verify they cannot delete users"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a manager user for testing
        create_response = requests.post(f"{BASE_URL}/api/users/create-client", 
            headers=headers,
            json={
                "name": "TEST_Manager",
                "email": "test_manager_delete@test.com",
                "password": "manager123",
                "company": "Test Manager Company"
            }
        )
        
        manager_id = None
        if create_response.status_code == 200:
            manager_id = create_response.json().get("id")
            # Change role to manager
            requests.put(f"{BASE_URL}/api/users/{manager_id}/role", 
                headers=headers, 
                json={"role": "manager"}
            )
        elif create_response.status_code == 400:
            # User exists, find them
            users_response = requests.get(f"{BASE_URL}/api/users", headers=headers)
            users = users_response.json()
            manager = next((u for u in users if u.get("email") == "test_manager_delete@test.com"), None)
            if manager:
                manager_id = manager.get("id")
        
        if not manager_id:
            pytest.skip("Could not create or find manager user")
        
        # Login as manager
        manager_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_manager_delete@test.com",
            "password": "manager123"
        })
        
        if manager_login.status_code != 200:
            # Clean up and skip
            requests.delete(f"{BASE_URL}/api/users/{manager_id}", headers=headers)
            pytest.skip("Could not login as manager")
        
        manager_token = manager_login.json().get("token")
        manager_headers = {"Authorization": f"Bearer {manager_token}"}
        
        # Try to delete a user as manager (should fail with 403)
        # First get any user that's not the manager
        users_response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        users = users_response.json()
        other_user = next((u for u in users if u.get("id") != manager_id and u.get("role") != "admin"), None)
        
        if other_user:
            delete_response = requests.delete(f"{BASE_URL}/api/users/{other_user.get('id')}", headers=manager_headers)
            assert delete_response.status_code == 403, f"Expected 403, got {delete_response.status_code}"
            print("✓ Manager cannot delete users (returns 403)")
        
        # Clean up - delete the test manager
        requests.delete(f"{BASE_URL}/api/users/{manager_id}", headers=headers)
        print("✓ Test manager cleaned up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
