import requests
import time
import os
import json
from datetime import datetime

class GuestToStudentTester:
    def __init__(self, base_url="https://fefe5908-9c36-463f-be91-5198c5f5b373.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.guest_token = None
        self.guest_user_id = None
        self.manager_token = None
        self.enrollment_id = None
        self.school_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, token=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        # Set up headers
        if headers is None:
            headers = {}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = self.session.post(url, data=data, files=files, headers=headers)
                else:
                    response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            
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
                    print(f"Error detail: {error_detail}")
                except:
                    print(f"Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def register_guest_user(self):
        """Register a new guest user"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        user_data = {
            "email": f"guest{timestamp}@test.com",
            "password": "guest123",
            "first_name": "Test",
            "last_name": "Guest",
            "phone": "+213555123456",
            "address": "123 Test Street",
            "date_of_birth": "1990-01-01",
            "gender": "male",
            "state": "Alger"
        }
        
        # Create a dummy file for profile_photo
        files = {
            'profile_photo': ('test_photo.jpg', b'dummy content', 'image/jpeg')
        }
        
        # Remove Content-Type for multipart/form-data
        headers = {}
        
        success, response = self.run_test(
            "Register Guest User",
            "POST",
            "api/auth/register",
            200,
            data=user_data,
            files=files,
            headers=headers
        )
        
        if success and response.get('access_token'):
            self.guest_token = response['access_token']
            self.guest_user_id = response['user']['id']
            print(f"Guest user registered with ID: {self.guest_user_id}")
            print(f"Guest user role: {response['user']['role']}")
            return True
        return False

    def login_manager(self):
        """Login as manager"""
        manager_data = {
            "email": "manager@test.com",
            "password": "manager123"
        }
        
        success, response = self.run_test(
            "Login as Manager",
            "POST",
            "api/auth/login",
            200,
            data=manager_data
        )
        
        if success and response.get('access_token'):
            self.manager_token = response['access_token']
            print(f"Manager logged in successfully")
            return True
        return False

    def get_driving_schools(self):
        """Get list of driving schools"""
        success, response = self.run_test(
            "Get Driving Schools",
            "GET",
            "api/driving-schools",
            200
        )
        
        if success and response.get('schools') and len(response['schools']) > 0:
            self.school_id = response['schools'][0]['id']
            print(f"Found school with ID: {self.school_id}")
            return True
        return False

    def enroll_in_school(self):
        """Enroll guest user in a driving school"""
        if not self.school_id:
            print("❌ No school ID available for enrollment")
            return False
            
        enrollment_data = {
            "school_id": self.school_id
        }
        
        success, response = self.run_test(
            "Enroll in Driving School",
            "POST",
            "api/enrollments",
            200,
            data=enrollment_data,
            token=self.guest_token
        )
        
        if success and response.get('enrollment_id'):
            self.enrollment_id = response['enrollment_id']
            print(f"Enrolled with ID: {self.enrollment_id}")
            print(f"Enrollment status: {response['status']}")
            return True
        return False

    def check_user_role_after_enrollment(self):
        """Check that user role is still 'guest' after enrollment"""
        success, response = self.run_test(
            "Check User Role After Enrollment",
            "GET",
            "api/auth/me",
            200,
            token=self.guest_token
        )
        
        if success:
            role = response.get('user', {}).get('role')
            if role == 'guest':
                print(f"✅ User role is correctly still 'guest' after enrollment")
                return True
            else:
                print(f"❌ User role is incorrectly '{role}' after enrollment, should be 'guest'")
                return False
        return False

    def upload_documents(self):
        """Upload required documents for the guest user"""
        document_types = [
            "profile_photo", 
            "id_card", 
            "medical_certificate", 
            "residence_certificate"
        ]
        
        all_uploads_successful = True
        
        for doc_type in document_types:
            # Create a simple text file as a mock document
            with open(f"{doc_type}.txt", "w") as f:
                f.write(f"This is a mock {doc_type} document")
            
            with open(f"{doc_type}.txt", "rb") as f:
                files = {"file": (f"{doc_type}.txt", f, "text/plain")}
                data = {"document_type": doc_type}
                
                # Remove Content-Type for multipart/form-data
                headers = {}
                if self.guest_token:
                    headers['Authorization'] = f'Bearer {self.guest_token}'
                
                success, response = self.run_test(
                    f"Upload {doc_type}",
                    "POST",
                    "api/documents/upload",
                    200,
                    data=data,
                    files=files,
                    headers=headers
                )
                
                if not success:
                    all_uploads_successful = False
            
            # Clean up the file
            os.remove(f"{doc_type}.txt")
        
        return all_uploads_successful

    def check_user_role_after_documents(self):
        """Check that user role is still 'guest' after document upload"""
        success, response = self.run_test(
            "Check User Role After Document Upload",
            "GET",
            "api/auth/me",
            200,
            token=self.guest_token
        )
        
        if success:
            role = response.get('user', {}).get('role')
            if role == 'guest':
                print(f"✅ User role is correctly still 'guest' after document upload")
                return True
            else:
                print(f"❌ User role is incorrectly '{role}' after document upload, should be 'guest'")
                return False
        return False

    def approve_enrollment(self):
        """Approve enrollment as manager"""
        if not self.enrollment_id:
            print("❌ No enrollment ID available for approval")
            return False
            
        success, response = self.run_test(
            "Approve Enrollment",
            "POST",
            f"api/manager/enrollments/{self.enrollment_id}/accept",
            200,
            token=self.manager_token
        )
        
        if success:
            print(f"Enrollment approved successfully")
            return True
        return False

    def check_user_role_after_approval(self):
        """Check that user role is now 'student' after manager approval"""
        success, response = self.run_test(
            "Check User Role After Approval",
            "GET",
            "api/auth/me",
            200,
            token=self.guest_token
        )
        
        if success:
            role = response.get('user', {}).get('role')
            if role == 'student':
                print(f"✅ User role is correctly changed to 'student' after approval")
                return True
            else:
                print(f"❌ User role is incorrectly '{role}' after approval, should be 'student'")
                return False
        return False

    def check_student_access(self):
        """Check that student can access courses"""
        success, response = self.run_test(
            "Check Student Access to Courses",
            "GET",
            "api/courses",
            200,
            token=self.guest_token
        )
        
        if success:
            print(f"Student can access courses")
            return True
        return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Guest-to-Student Role Transformation Tests")
        
        # Step 1: Register a new guest user
        if not self.register_guest_user():
            print("❌ Failed to register guest user, stopping tests")
            return False
        
        # Step 2: Get available driving schools
        if not self.get_driving_schools():
            print("❌ Failed to get driving schools, stopping tests")
            return False
        
        # Step 3: Enroll in a driving school
        if not self.enroll_in_school():
            print("❌ Failed to enroll in driving school, stopping tests")
            return False
        
        # Step 4: Check user role after enrollment (should still be 'guest')
        if not self.check_user_role_after_enrollment():
            print("❌ User role check after enrollment failed, stopping tests")
            return False
        
        # Step 5: Upload required documents
        if not self.upload_documents():
            print("❌ Failed to upload documents, stopping tests")
            return False
        
        # Step 6: Check user role after document upload (should still be 'guest')
        if not self.check_user_role_after_documents():
            print("❌ User role check after document upload failed, stopping tests")
            return False
        
        # Step 7: Login as manager
        if not self.login_manager():
            print("❌ Failed to login as manager, stopping tests")
            return False
        
        # Step 8: Approve enrollment as manager
        if not self.approve_enrollment():
            print("❌ Failed to approve enrollment, stopping tests")
            return False
        
        # Step 9: Check user role after approval (should now be 'student')
        if not self.check_user_role_after_approval():
            print("❌ User role check after approval failed, stopping tests")
            return False
        
        # Step 10: Check student access to courses
        if not self.check_student_access():
            print("❌ Student access check failed, stopping tests")
            return False
        
        print(f"\n📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    # Get backend URL from environment or use default
    backend_url = "https://fefe5908-9c36-463f-be91-5198c5f5b373.preview.emergentagent.com"
    
    tester = GuestToStudentTester(backend_url)
    tester.run_all_tests()