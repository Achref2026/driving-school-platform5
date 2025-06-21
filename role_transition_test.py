import requests
import unittest
import time
import random
import string
import os
from datetime import datetime

class GuestToStudentRoleTransitionTest:
    """Test the guest-to-student role transition functionality in the driving school platform."""
    
    def __init__(self, base_url="https://fefe5908-9c36-463f-be91-5198c5f5b373.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.guest_user = None
        self.manager_user = None
        self.guest_token = None
        self.manager_token = None
        self.school_id = None
        self.enrollment_id = None
        self.tests_run = 0
        self.tests_passed = 0
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart/form-data
                    if 'Content-Type' in headers:
                        del headers['Content-Type']
                    response = requests.post(url, data=data, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json().get('detail', 'No detail provided')
                    print(f"Error: {error_detail}")
                except:
                    print(f"Response: {response.text}")
                return False, {}
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}
    
    def generate_random_string(self, length=8):
        """Generate a random string for unique test data."""
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    
    def register_guest(self):
        """Register a new guest user."""
        print("\n----- Registering a new guest user -----")
        
        # Generate random user data
        random_suffix = self.generate_random_string()
        email = f"guest_{random_suffix}@example.com"
        password = "Test@123456"
        
        # Create form data
        data = {
            "email": email,
            "password": password,
            "first_name": "Test",
            "last_name": "Guest",
            "phone": "1234567890",
            "address": "123 Test Street",
            "date_of_birth": "1990-01-01",
            "gender": "male",
            "state": "Alger"
        }
        
        # Create a dummy file for profile_photo
        files = {
            'profile_photo': ('test_photo.jpg', b'dummy content', 'image/jpeg')
        }
        
        success, response = self.run_test(
            "Register Guest",
            "POST",
            "auth/register",
            200,
            data=data,
            files=files
        )
        
        if success and 'access_token' in response:
            self.guest_token = response['access_token']
            self.guest_headers = {'Authorization': f'Bearer {self.guest_token}'}
            self.guest_user = response.get('user', {})
            print(f"✅ Registered guest: {email} with role: {response.get('user', {}).get('role')}")
            return True
        return False
    
    def login_manager(self, email="manager@test.com", password="manager123"):
        """Login as manager and get token."""
        print("\n----- Logging in as manager -----")
        
        success, response = self.run_test(
            "Manager Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.manager_token = response['access_token']
            self.manager_headers = {'Authorization': f'Bearer {self.manager_token}'}
            self.manager_user = response.get('user', {})
            print(f"✅ Manager logged in successfully: {email}")
            return True
        return False
    
    def verify_guest_role(self):
        """Verify that the newly registered user has the 'guest' role."""
        print("\n----- Verifying guest role -----")
        
        if not self.guest_headers:
            print("❌ No guest headers available")
            return False
        
        success, response = self.run_test(
            "Verify Guest Role",
            "GET",
            "auth/me",
            200,
            headers=self.guest_headers
        )
        
        if success and 'user' in response:
            role = response['user'].get('role')
            if role == 'guest':
                print(f"✅ User has 'guest' role as expected")
                return True
            else:
                print(f"❌ User has '{role}' role, expected 'guest'")
        return False
    
    def verify_student_role_after_approval(self):
        """Verify that the user's role changed to 'student' after manager approval."""
        print("\n----- Verifying role change to student after manager approval -----")
        
        if not self.guest_headers:
            print("❌ No guest headers available")
            return False
        
        success, response = self.run_test(
            "Verify Student Role After Approval",
            "GET",
            "auth/me",
            200,
            headers=self.guest_headers
        )
        
        if success and 'user' in response:
            role = response['user'].get('role')
            if role == 'student':
                print(f"✅ User role changed to 'student' after manager approval as expected")
                return True
            else:
                print(f"❌ User has '{role}' role, expected 'student' after approval")
        return False
    
    def get_driving_schools(self):
        """Get available driving schools."""
        print("\n----- Getting available driving schools -----")
        
        if not self.guest_headers:
            print("❌ No guest headers available")
            return False
        
        success, response = self.run_test(
            "Get Driving Schools",
            "GET",
            "driving-schools",
            200,
            headers=self.guest_headers
        )
        
        if success and 'schools' in response and response['schools']:
            self.school_id = response['schools'][0]['id']
            print(f"✅ Found school with ID: {self.school_id}")
            return True
        return False
    
    def enroll_in_school(self):
        """Enroll guest in a driving school."""
        print("\n----- Enrolling in driving school -----")
        
        if not self.school_id or not self.guest_headers:
            print("❌ No school ID or guest headers available")
            return False
        
        success, response = self.run_test(
            "Enroll in School",
            "POST",
            "enrollments",
            200,
            data={"school_id": self.school_id},
            headers=self.guest_headers
        )
        
        if success and 'enrollment_id' in response:
            self.enrollment_id = response['enrollment_id']
            print(f"✅ Created enrollment with ID: {self.enrollment_id}")
            return True
        return False
    
    def verify_guest_role_after_enrollment(self):
        """Verify that the user's role remains 'guest' after enrollment (new workflow)."""
        print("\n----- Verifying role remains guest after enrollment -----")
        
        if not self.guest_headers:
            print("❌ No guest headers available")
            return False
        
        success, response = self.run_test(
            "Verify Guest Role After Enrollment",
            "GET",
            "auth/me",
            200,
            headers=self.guest_headers
        )
        
        if success and 'user' in response:
            role = response['user'].get('role')
            if role == 'guest':
                print(f"✅ User role remains 'guest' after enrollment as expected (new workflow)")
                return True
            else:
                print(f"❌ User has '{role}' role, expected 'guest'")
        return False
    
    def upload_required_documents(self):
        """Upload all required documents for the student."""
        print("\n----- Uploading required documents -----")
        
        if not self.guest_headers:
            print("❌ No guest headers available")
            return False
        
        # Get required documents
        success, response = self.run_test(
            "Get Required Documents",
            "GET",
            "documents",
            200,
            headers=self.guest_headers
        )
        
        if not success or 'required_documents' not in response:
            print("❌ Failed to get required documents")
            return False
        
        required_docs = response['required_documents']
        print(f"Required documents: {required_docs}")
        
        # Upload each required document
        for doc_type in required_docs:
            files = {'file': (f'{doc_type}.jpg', b'dummy content', 'image/jpeg')}
            data = {'document_type': doc_type}
            
            success, _ = self.run_test(
                f"Upload {doc_type}",
                "POST",
                "documents/upload",
                200,
                data=data,
                headers=self.guest_headers,
                files=files
            )
            
            if not success:
                print(f"❌ Failed to upload {doc_type}")
                return False
        
        print("✅ All required documents uploaded successfully")
        return True
    
    def get_manager_enrollments(self):
        """Get enrollments for manager."""
        print("\n----- Getting manager enrollments -----")
        
        if not self.manager_headers:
            print("❌ No manager headers available")
            return False
        
        success, response = self.run_test(
            "Get Manager Enrollments",
            "GET",
            "manager/enrollments",
            200,
            headers=self.manager_headers
        )
        
        if success and 'enrollments' in response:
            enrollments = response.get('enrollments', [])
            
            # Find the enrollment for our guest
            if self.guest_user and 'id' in self.guest_user:
                for enrollment in enrollments:
                    if enrollment.get('student_id') == self.guest_user['id']:
                        self.enrollment_id = enrollment.get('id')
                        print(f"✅ Found enrollment for our guest: {self.enrollment_id}")
                        return True
            
            # If we don't have a specific guest ID or couldn't find it, use the first pending enrollment
            pending_enrollments = [e for e in enrollments if e.get('enrollment_status') == 'pending_approval']
            if pending_enrollments:
                self.enrollment_id = pending_enrollments[0]['id']
                print(f"✅ Using first pending enrollment: {self.enrollment_id}")
                return True
            
            print("❌ No suitable enrollments found")
        return False
    
    def approve_enrollment(self):
        """Approve the enrollment as manager."""
        print("\n----- Approving enrollment -----")
        
        if not self.enrollment_id or not self.manager_headers:
            print("❌ No enrollment ID or manager headers available")
            return False
        
        success, response = self.run_test(
            "Approve Enrollment",
            "POST",
            f"manager/enrollments/{self.enrollment_id}/accept",
            200,
            headers=self.manager_headers
        )
        
        if success:
            print(f"✅ Enrollment approved successfully")
            return True
        return False
    
    def verify_student_dashboard_access(self):
        """Verify that the student can access the student dashboard."""
        print("\n----- Verifying student dashboard access -----")
        
        if not self.guest_headers:
            print("❌ No guest headers available")
            return False
        
        # Try to access courses (only accessible to students)
        success, response = self.run_test(
            "Access Student Courses",
            "GET",
            "courses",
            200,
            headers=self.guest_headers
        )
        
        if success and 'courses' in response:
            print(f"✅ Student can access courses. Found {len(response['courses'])} courses")
            return True
        return False
    
    def run_all_tests(self):
        """Run all tests in sequence."""
        print("\n🚀 TESTING GUEST-TO-STUDENT ROLE TRANSITION")
        print("=" * 60)
        
        try:
            # Step 1: Register a new guest user
            if not self.register_guest():
                print("❌ Failed to register guest user, stopping tests")
                return False
            
            # Step 2: Verify initial role is 'guest'
            if not self.verify_guest_role():
                print("❌ Failed to verify guest role, stopping tests")
                return False
            
            # Step 3: Get available driving schools
            if not self.get_driving_schools():
                print("❌ Failed to get driving schools, stopping tests")
                return False
            
            # Step 4: Enroll in a driving school
            if not self.enroll_in_school():
                print("❌ Failed to enroll in driving school, stopping tests")
                return False
            
            # Step 5: Verify role remains 'guest' after enrollment (new workflow)
            if not self.verify_guest_role_after_enrollment():
                print("❌ Failed to verify role remains guest after enrollment, stopping tests")
                return False
            
            # Step 6: Upload required documents (as guest)
            if not self.upload_required_documents():
                print("❌ Failed to upload required documents, stopping tests")
                return False
            
            # Step 7: Login as manager
            if not self.login_manager():
                print("❌ Failed to login as manager, stopping tests")
                return False
            
            # Step 8: Get manager enrollments
            if not self.get_manager_enrollments():
                print("❌ Failed to get manager enrollments, stopping tests")
                return False
            
            # Step 9: Approve enrollment
            if not self.approve_enrollment():
                print("❌ Failed to approve enrollment, stopping tests")
                return False
            
            # Step 10: Verify role changed to 'student' after approval
            if not self.verify_student_role_after_approval():
                print("❌ Failed to verify role change to student after approval, stopping tests")
                return False
            
            # Step 11: Verify student can access dashboard
            if not self.verify_student_dashboard_access():
                print("❌ Failed to verify student dashboard access, stopping tests")
                return False
            
            print("\n✅ All tests passed successfully!")
            print(f"Tests passed: {self.tests_passed}/{self.tests_run}")
            return True
            
        except Exception as e:
            print(f"\n❌ Error during testing: {str(e)}")
            return False

if __name__ == "__main__":
    # Use the public endpoint from the .env file
    tester = GuestToStudentRoleTransitionTest()
    tester.run_all_tests()