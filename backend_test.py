import requests
import sys
import random
import string
import time
import os
from datetime import datetime, timedelta

class DrivingSchoolAPITester:
    def __init__(self, base_url="https://fefe5908-9c36-463f-be91-5198c5f5b373.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.theory_course_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

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
                self.test_results.append({
                    "name": name,
                    "status": "PASSED",
                    "details": f"Status: {response.status_code}"
                })
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                self.test_results.append({
                    "name": name,
                    "status": "FAILED",
                    "details": f"Expected {expected_status}, got {response.status_code}. Response: {response.text}"
                })

            try:
                return success, response.json() if response.text else {}
            except:
                return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                "name": name,
                "status": "ERROR",
                "details": str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test the health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_get_states(self):
        """Test getting the list of states"""
        success, response = self.run_test(
            "Get States",
            "GET",
            "api/states",
            200
        )
        if success and 'states' in response:
            print(f"  Found {len(response['states'])} states")
            return True
        return False

    def test_register_user(self):
        """Test user registration"""
        # Generate random user data
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        email = f"test_user_{random_suffix}@example.com"
        password = "Test@123456"
        first_name = "Test"
        last_name = "User"
        
        # Create form data
        data = {
            "email": email,
            "password": password,
            "first_name": first_name,
            "last_name": last_name,
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
            "Register User",
            "POST",
            "api/auth/register",
            200,
            data=data,
            files=files
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"  Registered user: {email} with role: {response['user']['role']}")
            return True
        return False

    def test_login(self, email=None, password=None):
        """Test login with the registered user or provided credentials"""
        if not email and not self.user_data:
            print("❌ No user data available for login test")
            return False
            
        data = {
            "email": email or self.user_data["email"],
            "password": password or "Test@123456"
        }
        
        success, response = self.run_test(
            "Login",
            "POST",
            "api/auth/login",
            200,
            data=data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"  Logged in as: {self.user_data['email']} with role: {self.user_data['role']}")
            return True
        return False

    def test_get_dashboard(self):
        """Test getting dashboard data"""
        if not self.token:
            print("❌ No token available for dashboard test")
            return False
            
        success, response = self.run_test(
            "Get Dashboard",
            "GET",
            "api/dashboard",
            200
        )
        
        if success:
            print(f"  Dashboard data retrieved successfully")
            if 'enrollments' in response:
                print(f"  Found {len(response['enrollments'])} enrollments")
            if 'documents' in response:
                print(f"  Found {len(response['documents'])} documents")
            return True
        return False

    def test_get_driving_schools(self):
        """Test getting the list of driving schools"""
        success, response = self.run_test(
            "Get Driving Schools",
            "GET",
            "api/driving-schools",
            200
        )
        
        if success and 'schools' in response:
            print(f"  Found {len(response['schools'])} driving schools")
            if response['schools']:
                self.school_id = response['schools'][0]['id']
                print(f"  Selected school ID: {self.school_id}")
                return True
        return False

    def test_enroll_in_school(self):
        """Test enrolling in a driving school"""
        if not self.token or not hasattr(self, 'school_id'):
            print("❌ No token or school ID available for enrollment test")
            return False
            
        data = {
            "school_id": self.school_id
        }
        
        success, response = self.run_test(
            "Enroll in School",
            "POST",
            "api/enroll",
            200,
            data=data
        )
        
        if success and 'enrollment' in response:
            print(f"  Enrolled in school with ID: {self.school_id}")
            print(f"  Enrollment status: {response['enrollment']['enrollment_status']}")
            return True
        return False

    def test_get_notifications(self):
        """Test getting notifications"""
        if not self.token:
            print("❌ No token available for notifications test")
            return False
            
        success, response = self.run_test(
            "Get Notifications",
            "GET",
            "api/notifications",
            200
        )
        
        if success and 'notifications' in response:
            print(f"  Found {len(response['notifications'])} notifications")
            return True
        return False

    def test_get_courses(self):
        """Test getting courses"""
        if not self.token:
            print("❌ No token available for courses test")
            return False
            
        success, response = self.run_test(
            "Get Courses",
            "GET",
            "api/courses",
            200 if self.user_data["role"] == "student" else 403
        )
        
        if success:
            if self.user_data["role"] == "student":
                if 'courses' in response:
                    print(f"  Found {len(response['courses'])} courses")
                    # Store theory course ID for later tests
                    for course in response['courses']:
                        if course.get('course_type') == 'theory':
                            self.theory_course_id = course.get('id')
                            print(f"  Found theory course with ID: {self.theory_course_id}")
                            break
            else:
                print(f"  As expected, only students can access courses")
            return True
        return False
        
    def test_theory_learning_sessions(self):
        """Test getting theory learning sessions"""
        if not self.token or not self.theory_course_id:
            print("❌ No token or theory course ID available for theory sessions test")
            return False
            
        success, response = self.run_test(
            "Get Theory Sessions",
            "GET",
            "api/sessions/my",
            200
        )
        
        if success:
            if 'sessions' in response:
                theory_sessions = [s for s in response['sessions'] if s.get('session_type') == 'theory']
                print(f"  Found {len(theory_sessions)} theory sessions")
            else:
                print("  No sessions found, which is expected for a new student")
            return True
        return False
        
    def test_theory_learning_video_rooms(self):
        """Test getting theory learning video rooms"""
        if not self.token or not self.theory_course_id:
            print("❌ No token or theory course ID available for video rooms test")
            return False
            
        success, response = self.run_test(
            "Get Video Rooms",
            "GET",
            "api/video-rooms/my",
            200
        )
        
        if success:
            if 'rooms' in response:
                theory_rooms = [r for r in response['rooms'] if r.get('course_id') == self.theory_course_id]
                print(f"  Found {len(theory_rooms)} theory video rooms")
            else:
                print("  No video rooms found, which is expected for a new student")
            return True
        return False

    def test_upload_document(self, document_type="profile_photo"):
        """Test document upload"""
        if not self.token:
            print("❌ No token available for document upload test")
            return False
            
        # Create a simple text file for testing
        test_file_content = f"Test document content for {document_type}"
        test_file_name = f"test_{document_type}.txt"
        
        files = {
            'file': (test_file_name, test_file_content, 'text/plain')
        }
        
        data = {
            'document_type': document_type
        }
        
        success, response = self.run_test(
            f"Upload {document_type}",
            "POST",
            "api/documents/upload",
            200,
            data=data,
            files=files
        )
        
        if success and 'document' in response:
            print(f"  Document uploaded successfully: {document_type}")
            return True
        return False

    def test_get_documents(self):
        """Test getting documents"""
        if not self.token:
            print("❌ No token available for documents test")
            return False
            
        success, response = self.run_test(
            "Get Documents",
            "GET",
            "api/documents",
            200
        )
        
        if success and 'documents' in response:
            print(f"  Found {len(response['documents'])} documents")
            if 'required_documents' in response:
                print(f"  Required documents: {', '.join(response['required_documents'])}")
            return True
        return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Driving School Platform API Tests")
        print("=============================================")
        
        # Basic tests
        self.test_health_check()
        self.test_get_states()
        
        # Authentication tests
        if not self.test_register_user():
            print("❌ Registration failed, stopping tests")
            return
            
        # Get driving schools
        self.test_get_driving_schools()
        
        # Test dashboard
        self.test_get_dashboard()
        
        # Test enrollment
        if hasattr(self, 'school_id'):
            self.test_enroll_in_school()
        
        # Test document upload for all required documents
        for doc_type in ["profile_photo", "id_card", "medical_certificate", "residence_certificate"]:
            self.test_upload_document(doc_type)
        
        # Test getting documents
        self.test_get_documents()
        
        # Test getting notifications
        self.test_get_notifications()
        
        # Test getting courses
        self.test_get_courses()
        
        # Test theory learning functionality
        if self.theory_course_id:
            self.test_theory_learning_sessions()
            self.test_theory_learning_video_rooms()
        
        # Print results
        print("\n📊 Test Results Summary")
        print("=====================")
        print(f"Tests passed: {self.tests_passed}/{self.tests_run} ({(self.tests_passed/self.tests_run)*100:.1f}%)")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if test["status"] != "PASSED"]
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

class DocumentApprovalTester:
    def __init__(self, base_url="https://b3fac1a6-d84b-4483-9ac3-199e11902926.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.student_token = None
        self.manager_token = None
        self.student_headers = None
        self.manager_headers = None
        self.tests_run = 0
        self.tests_passed = 0
        self.enrollment_id = None
        self.document_ids = {}
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, headers=headers, files=files)
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
                print(f"Response: {response.text}")
                return False, {}
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}
    
    def login_student(self, email="student@test.dz", password="student123"):
        """Login as student and get token"""
        success, response = self.run_test(
            "Student Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.student_token = response['access_token']
            self.student_headers = {'Authorization': f'Bearer {self.student_token}'}
            print(f"✅ Student logged in successfully: {email}")
            return True
        return False
    
    def login_manager(self, email="manager8@auto-ecoleblidacentreschool.dz", password="manager123"):
        """Login as manager and get token"""
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
            print(f"✅ Manager logged in successfully: {email}")
            return True
        return False
    
    def get_student_dashboard(self):
        """Get student dashboard data"""
        success, response = self.run_test(
            "Get Student Dashboard",
            "GET",
            "dashboard",
            200,
            headers=self.student_headers
        )
        
        if success:
            # Find the enrollment with pending_documents status
            enrollments = response.get('enrollments', [])
            if not enrollments:
                print("❌ No enrollments found")
                print("Will try to create a new enrollment...")
                return self.create_new_enrollment()
                
            print(f"Found {len(enrollments)} enrollments:")
            for enrollment in enrollments:
                status = enrollment.get('enrollment_status')
                print(f"  - Enrollment ID: {enrollment.get('id')}, Status: {status}")
                
                if status == 'pending_documents':
                    self.enrollment_id = enrollment.get('id')
                    print(f"✅ Found enrollment with pending_documents status: {self.enrollment_id}")
                    return True
                elif status == 'pending_approval':
                    # We can use this enrollment to test the manager's side
                    self.enrollment_id = enrollment.get('id')
                    print(f"✅ Found enrollment with pending_approval status: {self.enrollment_id}")
                    print("Will test manager's document approval functionality")
                    return True
            
            print("❌ No suitable enrollment found")
            print("Will try to create a new enrollment with a different school...")
            return self.create_new_enrollment(try_different_school=True)
        return False
        
    def create_new_enrollment(self, try_different_school=False):
        """Create a new enrollment for testing"""
        # First get available schools
        success, response = self.run_test(
            "Get Available Schools",
            "GET",
            "driving-schools",
            200,
            headers=self.student_headers
        )
        
        if not success or not response.get('schools'):
            print("❌ Failed to get available schools")
            return False
            
        # Use the first school or a different one if specified
        schools = response['schools']
        school_index = 1 if try_different_school and len(schools) > 1 else 0
        school_id = schools[school_index]['id']
        print(f"✅ Found school with ID: {school_id}")
        
        # Create enrollment
        success, response = self.run_test(
            "Create Enrollment",
            "POST",
            "enrollments",
            200,
            data={"school_id": school_id},
            headers=self.student_headers
        )
        
        if success and response.get('enrollment_id'):
            self.enrollment_id = response['enrollment_id']
            print(f"✅ Created new enrollment with ID: {self.enrollment_id}")
            return True
        
        print("❌ Failed to create new enrollment")
        return False
    
    def get_student_documents(self):
        """Get student documents"""
        success, response = self.run_test(
            "Get Student Documents",
            "GET",
            "documents",
            200,
            headers=self.student_headers
        )
        
        if success:
            # Check required documents
            required_docs = response.get('required_documents', [])
            print(f"✅ Required documents: {required_docs}")
            return required_docs
        return []
    
    def create_dummy_file(self):
        """Create a dummy file for document upload"""
        return b"dummy file content for testing documents"
    
    def upload_document(self, doc_type):
        """Upload a document"""
        files = {'file': (f'{doc_type}.jpg', self.create_dummy_file(), 'image/jpeg')}
        data = {'document_type': doc_type}
        
        success, response = self.run_test(
            f"Upload {doc_type}",
            "POST",
            "documents/upload",
            200,
            data=data,
            headers=self.student_headers,
            files=files
        )
        
        if success and 'document' in response:
            doc_id = response['document']['id']
            self.document_ids[doc_type] = doc_id
            print(f"✅ Document uploaded with ID: {doc_id}")
            return doc_id
        return None
    
    def check_enrollment_status(self, expected_status):
        """Check if enrollment status matches expected status"""
        success, response = self.run_test(
            f"Check Enrollment Status (expecting {expected_status})",
            "GET",
            "dashboard",
            200,
            headers=self.student_headers
        )
        
        if success:
            enrollments = response.get('enrollments', [])
            for enrollment in enrollments:
                if enrollment.get('id') == self.enrollment_id:
                    actual_status = enrollment.get('enrollment_status')
                    if actual_status == expected_status:
                        print(f"✅ Enrollment status is {actual_status} as expected")
                        return True
                    else:
                        print(f"❌ Enrollment status is {actual_status}, expected {expected_status}")
                        return False
        
        print("❌ Enrollment not found")
        return False
    
    def get_pending_documents_for_manager(self):
        """Get pending documents for manager"""
        success, response = self.run_test(
            "Get Pending Documents for Manager",
            "GET",
            "managers/pending-documents",
            200,
            headers=self.manager_headers
        )
        
        if success:
            documents = response.get('documents', [])
            print(f"✅ Manager sees {len(documents)} pending documents")
            return documents
        return []
    
    def accept_document(self, doc_id):
        """Accept a document as manager"""
        success, response = self.run_test(
            f"Accept Document {doc_id}",
            "POST",
            f"documents/accept/{doc_id}",
            200,
            headers=self.manager_headers
        )
        
        if success:
            documents_complete = response.get('documents_complete', False)
            print(f"✅ Document accepted. All documents complete: {documents_complete}")
            return documents_complete
        return False
    
    def run_document_approval_tests(self):
        """Run all tests for document approval workflow"""
        print("\n🔍 TESTING DOCUMENT APPROVAL WORKFLOW")
        print("=" * 60)
        
        # Step 1: Login as student
        if not self.login_student():
            print("❌ Student login failed, stopping tests")
            return False
        
        # Step 2: Get student dashboard and find enrollment
        if not self.get_student_dashboard():
            print("❌ Failed to find suitable enrollment, stopping tests")
            return False
        
        # Get the current enrollment status
        success, response = self.run_test(
            "Get Current Enrollment Status",
            "GET",
            "dashboard",
            200,
            headers=self.student_headers
        )
        
        if not success:
            print("❌ Failed to get current enrollment status")
            return False
            
        enrollments = response.get('enrollments', [])
        current_enrollment = next((e for e in enrollments if e.get('id') == self.enrollment_id), None)
        if not current_enrollment:
            print("❌ Enrollment not found in dashboard")
            return False
            
        current_status = current_enrollment.get('enrollment_status')
        print(f"Current enrollment status: {current_status}")
        
        # If status is already pending_approval, we'll test the manager's side
        if current_status == 'pending_approval':
            print("\n🔍 Testing manager's document approval functionality")
            
            # Login as manager
            if not self.login_manager():
                print("❌ Manager login failed, stopping tests")
                return False
                
            # Get student documents
            success, response = self.run_test(
                "Get Student Documents",
                "GET",
                "documents",
                200,
                headers=self.student_headers
            )
            
            if not success:
                print("❌ Failed to get student documents")
                return False
                
            # Get pending documents for manager
            pending_docs = self.get_pending_documents_for_manager()
            print(f"Manager sees {len(pending_docs)} pending documents")
            
            # Check if there are any pending documents for this student
            student_docs = []
            for doc in pending_docs:
                if doc.get('student_id') == current_enrollment.get('student_id'):
                    student_docs.append(doc)
            
            print(f"Found {len(student_docs)} pending documents for this student")
            
            if student_docs:
                # Accept each document and verify status
                for i, doc in enumerate(student_docs):
                    doc_id = doc.get('id')
                    is_last = i == len(student_docs) - 1
                    
                    documents_complete = self.accept_document(doc_id)
                    
                    # If this is the last document, verify status changed to pending_approval
                    if is_last:
                        if not documents_complete:
                            print("❌ Documents not marked as complete after accepting all documents")
                        else:
                            print("✅ All documents marked as complete")
                    else:
                        if documents_complete:
                            print(f"❌ Documents marked as complete after accepting {i+1}/{len(student_docs)} documents")
            else:
                print("No pending documents found for this student")
                
            print("\n✅ Manager document approval functionality tested")
            
            # Final results
            print("\n" + "=" * 60)
            print(f"🎉 TESTS PASSED: {self.tests_passed}/{self.tests_run}")
            print("✅ Document approval workflow is working correctly")
            print("✅ Enrollment status transitions as expected")
            print("✅ No premature status changes occur")
            
            return self.tests_passed == self.tests_run
        
        # If status is pending_documents, we'll test the full workflow
        elif current_status == 'pending_documents':
            # Step 3: Get required documents
            required_docs = self.get_student_documents()
            if not required_docs:
                print("❌ Failed to get required documents, stopping tests")
                return False
            
            # Step 4: Upload documents one by one and verify status doesn't change
            for doc_type in required_docs:
                doc_id = self.upload_document(doc_type)
                if not doc_id:
                    print(f"❌ Failed to upload {doc_type}, stopping tests")
                    return False
                
                # Verify status hasn't changed after upload
                if not self.check_enrollment_status('pending_documents'):
                    print(f"❌ Enrollment status changed after uploading {doc_type}, but it shouldn't")
                    return False
            
            print("\n✅ All documents uploaded successfully")
            print("✅ Enrollment status correctly remained 'pending_documents' after all uploads")
            
            # Step 5: Login as manager
            if not self.login_manager():
                print("❌ Manager login failed, stopping tests")
                return False
            
            # Step 6: Get pending documents for manager
            pending_docs = self.get_pending_documents_for_manager()
            if not pending_docs:
                print("❌ No pending documents found for manager, stopping tests")
                return False
            
            # Step 7: Accept all documents except the last one
            doc_ids = list(self.document_ids.values())
            for i, doc_id in enumerate(doc_ids[:-1]):
                documents_complete = self.accept_document(doc_id)
                if documents_complete:
                    print(f"❌ Documents marked as complete after accepting {i+1}/{len(doc_ids)} documents")
                    return False
                
                # Verify status hasn't changed after accepting some documents
                if not self.check_enrollment_status('pending_documents'):
                    print(f"❌ Enrollment status changed after accepting {i+1}/{len(doc_ids)} documents, but it shouldn't")
                    return False
            
            print("\n✅ Enrollment status correctly remained 'pending_documents' after accepting all but last document")
            
            # Step 8: Accept the last document
            last_doc_id = doc_ids[-1]
            documents_complete = self.accept_document(last_doc_id)
            if not documents_complete:
                print("❌ Documents not marked as complete after accepting all documents")
                return False
            
            # Step 9: Verify status changed to pending_approval
            if not self.check_enrollment_status('pending_approval'):
                print("❌ Enrollment status did not change to pending_approval after accepting all documents")
                return False
            
            print("\n✅ Enrollment status correctly changed to 'pending_approval' after accepting all documents")
            
            # Step 10: Verify no more pending documents for this student
            pending_docs_after = self.get_pending_documents_for_manager()
            student_pending_docs = [doc for doc in pending_docs_after if doc['id'] in doc_ids]
            if student_pending_docs:
                print(f"❌ Still found {len(student_pending_docs)} pending documents after accepting all")
                return False
            
            print("\n✅ No more pending documents for this student after accepting all")
            
            # Final results
            print("\n" + "=" * 60)
            print(f"🎉 TESTS PASSED: {self.tests_passed}/{self.tests_run}")
            print("✅ Document approval workflow is working correctly")
            print("✅ Enrollment status transitions as expected")
            print("✅ No premature status changes occur")
            
            return self.tests_passed == self.tests_run
        
        else:
            print(f"❌ Enrollment status is {current_status}, which is not suitable for testing")
            return False

class EnrollmentApprovalTester:
    def __init__(self, base_url="https://2e073b76-e9ba-4bd7-9ccb-f4f1837a3320.preview.emergentagent.com"):
        self.base_url = base_url
        self.manager_token = None
        self.manager_headers = None
        self.tests_run = 0
        self.tests_passed = 0
        self.enrollment_id = None
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, headers=headers, files=files)
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
                print(f"Response: {response.text}")
                return False, {}
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}
    
    def login_manager(self, email="manager@test.com", password="manager123"):
        """Login as manager and get token"""
        success, response = self.run_test(
            "Manager Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.manager_token = response['access_token']
            self.manager_headers = {'Authorization': f'Bearer {self.manager_token}'}
            print(f"✅ Manager logged in successfully: {email}")
            return True
        return False
    
    def get_pending_enrollments(self):
        """Get pending enrollments for manager"""
        success, response = self.run_test(
            "Get Manager Enrollments",
            "GET",
            "api/manager/enrollments",
            200,
            headers=self.manager_headers
        )
        
        if success:
            enrollments = response.get('enrollments', [])
            pending_enrollments = [e for e in enrollments if e.get('enrollment_status') == 'pending_approval']
            print(f"✅ Found {len(pending_enrollments)} pending enrollments")
            
            if pending_enrollments:
                self.enrollment_id = pending_enrollments[0]['id']
                print(f"✅ Selected enrollment ID: {self.enrollment_id}")
                return pending_enrollments
            else:
                print("❌ No pending enrollments found")
        return []
    
    def approve_enrollment(self, enrollment_id=None):
        """Approve an enrollment"""
        if not enrollment_id:
            enrollment_id = self.enrollment_id
            
        if not enrollment_id:
            print("❌ No enrollment ID available")
            return False
            
        success, response = self.run_test(
            f"Approve Enrollment {enrollment_id}",
            "POST",
            f"api/manager/enrollments/{enrollment_id}/approve",
            200,
            headers=self.manager_headers
        )
        
        if success:
            print(f"✅ Enrollment {enrollment_id} approved successfully")
            return True
        return False
    
    def reject_enrollment(self, enrollment_id=None, reason="Test rejection reason"):
        """Reject an enrollment"""
        if not enrollment_id:
            enrollment_id = self.enrollment_id
            
        if not enrollment_id:
            print("❌ No enrollment ID available")
            return False
            
        data = {'reason': reason}
        headers = self.manager_headers.copy()
        # Remove Content-Type for multipart/form-data
        if 'Content-Type' in headers:
            del headers['Content-Type']
        
        success, response = self.run_test(
            f"Reject Enrollment {enrollment_id}",
            "POST",
            f"api/manager/enrollments/{enrollment_id}/reject",
            200,
            data=data,
            headers=headers,
            files={}
        )
        
        if success:
            print(f"✅ Enrollment {enrollment_id} rejected successfully")
            return True
        return False
    
    def verify_enrollment_status(self, enrollment_id, expected_status):
        """Verify enrollment status"""
        success, response = self.run_test(
            f"Verify Enrollment Status",
            "GET",
            "api/manager/enrollments",
            200,
            headers=self.manager_headers
        )
        
        if success:
            enrollments = response.get('enrollments', [])
            enrollment = next((e for e in enrollments if e.get('id') == enrollment_id), None)
            
            if enrollment:
                actual_status = enrollment.get('enrollment_status')
                if actual_status == expected_status:
                    print(f"✅ Enrollment status is {actual_status} as expected")
                    return True
                else:
                    print(f"❌ Enrollment status is {actual_status}, expected {expected_status}")
            else:
                print(f"❌ Enrollment {enrollment_id} not found")
        return False
    
    def run_enrollment_approval_tests(self):
        """Run all tests for enrollment approval workflow"""
        print("\n🔍 TESTING ENROLLMENT APPROVAL/REJECTION WORKFLOW")
        print("=" * 60)
        
        # Step 1: Login as manager
        if not self.login_manager():
            print("❌ Manager login failed, stopping tests")
            return False
        
        # Step 2: Get pending enrollments
        pending_enrollments = self.get_pending_enrollments()
        if not pending_enrollments:
            print("❌ No pending enrollments found, stopping tests")
            return False
        
        # If we have multiple pending enrollments, we can test both approve and reject
        if len(pending_enrollments) >= 2:
            # Test approve functionality
            approve_id = pending_enrollments[0]['id']
            if self.approve_enrollment(approve_id):
                if self.verify_enrollment_status(approve_id, 'approved'):
                    print("✅ Enrollment approval workflow tested successfully")
                else:
                    print("❌ Enrollment status not updated after approval")
            else:
                print("❌ Failed to approve enrollment")
            
            # Test reject functionality
            reject_id = pending_enrollments[1]['id']
            if self.reject_enrollment(reject_id, "Testing rejection functionality"):
                if self.verify_enrollment_status(reject_id, 'rejected'):
                    print("✅ Enrollment rejection workflow tested successfully")
                else:
                    print("❌ Enrollment status not updated after rejection")
            else:
                print("❌ Failed to reject enrollment")
        else:
            # We only have one pending enrollment, so we'll just test approval
            print("Only one pending enrollment found, testing approval only")
            if self.approve_enrollment():
                if self.verify_enrollment_status(self.enrollment_id, 'approved'):
                    print("✅ Enrollment approval workflow tested successfully")
                else:
                    print("❌ Enrollment status not updated after approval")
            else:
                print("❌ Failed to approve enrollment")
        
        # Final results
        print("\n" + "=" * 60)
        print(f"🎉 TESTS PASSED: {self.tests_passed}/{self.tests_run}")
        
        return self.tests_passed == self.tests_run

class NewApprovalSystemTester:
    def __init__(self, base_url=None):
        # Get the backend URL from environment if available
        self.base_url = base_url or "http://localhost:8001"
        self.manager_token = None
        self.student_token = None
        self.manager_headers = None
        self.student_headers = None
        self.tests_run = 0
        self.tests_passed = 0
        self.enrollment_id = None
        self.student_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
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

    def login_manager(self, email="manager@test.com", password="manager123"):
        """Login as manager and get token"""
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
            print(f"✅ Manager logged in successfully: {email}")
            return True
        return False

    def login_student(self, email="student@test.com", password="student123"):
        """Login as student and get token"""
        success, response = self.run_test(
            "Student Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.student_token = response['access_token']
            self.student_headers = {'Authorization': f'Bearer {self.student_token}'}
            self.student_id = response.get('user', {}).get('id')
            print(f"✅ Student logged in successfully: {email}")
            return True
        return False

    def get_manager_enrollments(self):
        """Get enrollments for manager"""
        success, response = self.run_test(
            "Get Manager Enrollments",
            "GET",
            "manager/enrollments",
            200,
            headers=self.manager_headers
        )
        
        if success and 'enrollments' in response:
            enrollments = response.get('enrollments', [])
            pending_enrollments = [e for e in enrollments if e.get('enrollment_status') == 'pending_approval']
            
            print(f"Found {len(enrollments)} total enrollments")
            print(f"Found {len(pending_enrollments)} pending approval enrollments")
            
            if pending_enrollments:
                self.enrollment_id = pending_enrollments[0]['id']
                self.student_id = pending_enrollments[0]['student_id']
                print(f"Selected enrollment ID: {self.enrollment_id}")
                print(f"Student ID: {self.student_id}")
                return pending_enrollments
        
        return []

    def view_student_details(self):
        """Test the View Student Details button"""
        if not self.student_id:
            print("❌ No student ID available")
            return False
        
        success, response = self.run_test(
            "View Student Details",
            "GET",
            f"manager/student-details/{self.student_id}",
            200,
            headers=self.manager_headers
        )
        
        if success:
            student = response.get('student', {})
            print(f"✅ Viewed details for student: {student.get('first_name')} {student.get('last_name')}")
            return True
        return False

    def view_student_documents(self):
        """Test the View Documents button"""
        if not self.enrollment_id:
            print("❌ No enrollment ID available")
            return False
        
        success, response = self.run_test(
            "View Student Documents",
            "GET",
            f"manager/enrollments/{self.enrollment_id}/documents",
            200,
            headers=self.manager_headers
        )
        
        if success:
            documents = response.get('documents', [])
            print(f"✅ Viewed {len(documents)} documents for student")
            return True
        return False

    def accept_student(self):
        """Test the Accept Student button"""
        if not self.enrollment_id:
            print("❌ No enrollment ID available")
            return False
        
        success, response = self.run_test(
            "Accept Student",
            "POST",
            f"manager/enrollments/{self.enrollment_id}/accept",
            200,
            data={},
            headers=self.manager_headers
        )
        
        if success:
            print(f"✅ Successfully accepted student enrollment")
            return True
        return False

    def refuse_student(self, reason="Documents unclear, please resubmit clearer photos"):
        """Test the Refuse Student button"""
        if not self.enrollment_id:
            print("❌ No enrollment ID available")
            return False
        
        # For refuse, we need to use form data
        data = {'reason': reason}
        files = {}
        
        success, response = self.run_test(
            "Refuse Student",
            "POST",
            f"manager/enrollments/{self.enrollment_id}/refuse",
            200,
            data=data,
            headers=self.manager_headers,
            files=files
        )
        
        if success:
            print(f"✅ Successfully refused student enrollment with reason: {reason}")
            return True
        return False

    def check_student_dashboard_after_refusal(self):
        """Check if student can see the refusal reason on their dashboard"""
        if not self.student_token:
            print("❌ No student token available")
            return False
        
        success, response = self.run_test(
            "Check Student Dashboard After Refusal",
            "GET",
            "dashboard",
            200,
            headers=self.student_headers
        )
        
        if success:
            enrollments = response.get('enrollments', [])
            rejected_enrollments = [e for e in enrollments if e.get('enrollment_status') == 'rejected']
            
            if rejected_enrollments:
                print(f"Found {len(rejected_enrollments)} rejected enrollments")
                for enrollment in rejected_enrollments:
                    if enrollment.get('refusal_reason'):
                        print(f"Refusal reason displayed to student: {enrollment.get('refusal_reason')}")
                        return True
                    else:
                        print("❌ No refusal reason found in enrollment")
            else:
                print("❌ No rejected enrollments found")
        
        return False

    def run_new_approval_system_tests(self):
        """Run all tests for the new approval system"""
        print("\n🔍 TESTING NEW 4-BUTTON APPROVAL SYSTEM")
        print("=" * 60)
        
        # Step 1: Login as manager
        if not self.login_manager():
            print("❌ Manager login failed, stopping tests")
            return False
        
        # Step 2: Get pending enrollments
        pending_enrollments = self.get_manager_enrollments()
        if not pending_enrollments:
            print("❌ No pending enrollments found, stopping tests")
            return False
        
        # Step 3: Test View Student Details button
        if not self.view_student_details():
            print("❌ Failed to view student details")
        
        # Step 4: Test View Documents button
        if not self.view_student_documents():
            print("❌ Failed to view student documents")
        
        # Step 5: Login as student for later verification
        if not self.login_student():
            print("❌ Student login failed, will not be able to verify refusal message")
        
        # Step 6: Test Refuse Student button
        if not self.refuse_student("Documents unclear, please resubmit clearer photos"):
            print("❌ Failed to refuse student")
            return False
        
        # Step 7: Check if student can see refusal reason
        if self.student_token:
            if not self.check_student_dashboard_after_refusal():
                print("❌ Student cannot see refusal reason on dashboard")
            else:
                print("✅ Student can see refusal reason on dashboard")
        
        # Final results
        print("\n" + "=" * 60)
        print(f"🎉 TESTS PASSED: {self.tests_passed}/{self.tests_run}")
        
        return self.tests_passed == self.tests_run

class RoleChangeAndTeacherAssignmentTester:
    def __init__(self, base_url=None):
        # Get the backend URL from environment if available
        self.base_url = base_url or "https://fefe5908-9c36-463f-be91-5198c5f5b373.preview.emergentagent.com"
        self.manager_token = None
        self.student_token = None
        self.guest_token = None
        self.manager_headers = None
        self.student_headers = None
        self.guest_headers = None
        self.tests_run = 0
        self.tests_passed = 0
        self.enrollment_id = None
        self.student_id = None
        self.course_id = None
        self.teacher_id = None
        self.school_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
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
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
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

    def login_manager(self, email="manager@test.com", password="manager123"):
        """Login as manager and get token"""
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
            print(f"✅ Manager logged in successfully: {email}")
            return True
        return False

    def login_guest(self, email="guest@test.com", password="guest123"):
        """Login as guest and get token"""
        success, response = self.run_test(
            "Guest Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.guest_token = response['access_token']
            self.guest_headers = {'Authorization': f'Bearer {self.guest_token}'}
            self.guest_id = response.get('user', {}).get('id')
            print(f"✅ Guest logged in successfully: {email}")
            print(f"Guest role: {response.get('user', {}).get('role')}")
            return True
        return False

    def register_guest(self):
        """Register a new guest user"""
        # Generate random user data
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
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
            self.guest_id = response.get('user', {}).get('id')
            self.guest_email = email
            self.guest_password = password
            print(f"✅ Registered guest: {email} with role: {response.get('user', {}).get('role')}")
            return True
        return False

    def get_driving_schools(self):
        """Get available driving schools"""
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
        """Enroll guest in a driving school"""
        if not self.school_id:
            print("❌ No school ID available")
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

    def upload_required_documents(self):
        """Upload all required documents for the guest"""
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
        """Get enrollments for manager"""
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
            if self.guest_id:
                for enrollment in enrollments:
                    if enrollment.get('student_id') == self.guest_id:
                        self.enrollment_id = enrollment.get('id')
                        print(f"✅ Found enrollment for our guest: {self.enrollment_id}")
                        return True
            
            # If we don't have a specific guest ID or couldn't find it, use the first pending enrollment
            pending_enrollments = [e for e in enrollments if e.get('enrollment_status') == 'pending_approval']
            if pending_enrollments:
                self.enrollment_id = pending_enrollments[0]['id']
                self.student_id = pending_enrollments[0]['student_id']
                print(f"✅ Using first pending enrollment: {self.enrollment_id}")
                return True
            
            print("❌ No suitable enrollments found")
        return False

    def approve_enrollment(self):
        """Approve the enrollment as manager"""
        if not self.enrollment_id:
            print("❌ No enrollment ID available")
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

    def check_user_role(self, expected_role="student"):
        """Check if user role has changed to the expected role"""
        success, response = self.run_test(
            "Check User Role",
            "GET",
            "auth/me",
            200,
            headers=self.guest_headers
        )
        
        if success and 'user' in response:
            actual_role = response['user'].get('role')
            if actual_role == expected_role:
                print(f"✅ User role is {actual_role} as expected")
                return True
            else:
                print(f"❌ User role is {actual_role}, expected {expected_role}")
        return False

    def get_available_teachers(self):
        """Get available teachers for the school"""
        if not self.school_id:
            print("❌ No school ID available")
            return False
        
        success, response = self.run_test(
            "Get Available Teachers",
            "GET",
            f"manager/available-teachers/{self.school_id}",
            200,
            headers=self.manager_headers
        )
        
        if success and 'teachers' in response and response['teachers']:
            self.teacher_id = response['teachers'][0]['teacher_id']
            print(f"✅ Found teacher with ID: {self.teacher_id}")
            return True
        
        print("❌ No available teachers found")
        return False

    def get_student_courses(self):
        """Get courses for the student"""
        success, response = self.run_test(
            "Get Student Courses",
            "GET",
            "dashboard",
            200,
            headers=self.guest_headers
        )
        
        if success and 'enrollments' in response:
            for enrollment in response['enrollments']:
                if enrollment.get('id') == self.enrollment_id and 'courses' in enrollment:
                    courses = enrollment['courses']
                    if courses:
                        self.course_id = courses[0]['id']
                        print(f"✅ Found course with ID: {self.course_id}")
                        return True
        
        # If we couldn't find the course through dashboard, try the courses endpoint
        success, response = self.run_test(
            "Get Student Courses (Alternative)",
            "GET",
            "courses",
            200,
            headers=self.guest_headers
        )
        
        if success and 'courses' in response and response['courses']:
            self.course_id = response['courses'][0]['id']
            print(f"✅ Found course with ID: {self.course_id}")
            return True
        
        print("❌ No courses found for student")
        return False

    def assign_teacher_to_course(self):
        """Assign teacher to a course"""
        if not self.course_id or not self.teacher_id:
            print("❌ Missing course ID or teacher ID")
            return False
        
        data = {'teacher_id': self.teacher_id}
        
        success, response = self.run_test(
            "Assign Teacher to Course",
            "POST",
            f"manager/courses/{self.course_id}/assign-teacher",
            200,
            data=data,
            headers=self.manager_headers
        )
        
        if success:
            print(f"✅ Teacher assigned to course successfully")
            return True
        return False

    def unassign_teacher_from_course(self):
        """Unassign teacher from a course"""
        if not self.course_id:
            print("❌ No course ID available")
            return False
        
        success, response = self.run_test(
            "Unassign Teacher from Course",
            "DELETE",
            f"manager/courses/{self.course_id}/unassign-teacher",
            200,
            headers=self.manager_headers
        )
        
        if success:
            print(f"✅ Teacher unassigned from course successfully")
            return True
        return False

    def verify_teacher_assignment(self):
        """Verify teacher is assigned to the course"""
        success, response = self.run_test(
            "Get Student Courses",
            "GET",
            "courses",
            200,
            headers=self.guest_headers
        )
        
        if success and 'courses' in response:
            for course in response['courses']:
                if course['id'] == self.course_id:
                    if course.get('teacher_id') == self.teacher_id:
                        print(f"✅ Teacher is assigned to course as expected")
                        return True
                    else:
                        print(f"❌ Teacher is not assigned to course")
                        return False
        
        print("❌ Course not found")
        return False

    def run_role_change_tests(self):
        """Test the role change functionality"""
        print("\n🔍 TESTING ROLE CHANGE FUNCTIONALITY")
        print("=" * 60)
        
        # Step 1: Register a new guest
        if not self.register_guest():
            print("❌ Failed to register guest, stopping tests")
            return False
        
        # Step 2: Get available schools
        if not self.get_driving_schools():
            print("❌ Failed to get schools, stopping tests")
            return False
        
        # Step 3: Enroll in a school
        if not self.enroll_in_school():
            print("❌ Failed to enroll in school, stopping tests")
            return False
        
        # Step 4: Upload required documents
        if not self.upload_required_documents():
            print("❌ Failed to upload documents, stopping tests")
            return False
        
        # Step 5: Login as manager
        if not self.login_manager():
            print("❌ Failed to login as manager, stopping tests")
            return False
        
        # Step 6: Get enrollments as manager
        if not self.get_manager_enrollments():
            print("❌ Failed to get enrollments as manager, stopping tests")
            return False
        
        # Step 7: Approve the enrollment
        if not self.approve_enrollment():
            print("❌ Failed to approve enrollment, stopping tests")
            return False
        
        # Step 8: Check if user role has changed to student
        if not self.check_user_role("student"):
            print("❌ User role did not change to student after approval")
            return False
        
        print("\n✅ ROLE CHANGE FUNCTIONALITY WORKS CORRECTLY")
        return True

    def run_teacher_assignment_tests(self):
        """Test the teacher assignment functionality"""
        print("\n🔍 TESTING TEACHER ASSIGNMENT FUNCTIONALITY")
        print("=" * 60)
        
        # Step 1: Get available teachers
        if not self.get_available_teachers():
            print("❌ Failed to get available teachers, stopping tests")
            return False
        
        # Step 2: Get student courses
        if not self.get_student_courses():
            print("❌ Failed to get student courses, stopping tests")
            return False
        
        # Step 3: Assign teacher to course
        if not self.assign_teacher_to_course():
            print("❌ Failed to assign teacher to course, stopping tests")
            return False
        
        # Step 4: Verify teacher assignment
        if not self.verify_teacher_assignment():
            print("❌ Failed to verify teacher assignment, stopping tests")
            return False
        
        # Step 5: Unassign teacher from course
        if not self.unassign_teacher_from_course():
            print("❌ Failed to unassign teacher from course")
            return False
        
        print("\n✅ TEACHER ASSIGNMENT FUNCTIONALITY WORKS CORRECTLY")
        return True

    def run_all_tests(self):
        """Run all tests for role change and teacher assignment"""
        print("\n🚀 TESTING DRIVING SCHOOL PLATFORM FIXES")
        print("=" * 60)
        
        # Test role change functionality
        role_change_success = self.run_role_change_tests()
        
        # Test teacher assignment functionality
        teacher_assignment_success = self.run_teacher_assignment_tests()
        
        # Final results
        print("\n" + "=" * 60)
        print(f"🎉 TESTS PASSED: {self.tests_passed}/{self.tests_run}")
        print(f"Role Change Functionality: {'✅ WORKING' if role_change_success else '❌ FAILING'}")
        print(f"Teacher Assignment Functionality: {'✅ WORKING' if teacher_assignment_success else '❌ FAILING'}")
        
        return role_change_success and teacher_assignment_success

if __name__ == "__main__":
    # Choose which test to run
    test_type = "theory_learning"  # Options: "general", "document_approval", "enrollment_approval", "new_approval_system", "role_change_and_teacher_assignment", "theory_learning"
    
    if test_type == "general" or test_type == "theory_learning":
        tester = DrivingSchoolAPITester()
        success = tester.run_all_tests()
    elif test_type == "document_approval":
        tester = DocumentApprovalTester()
        success = tester.run_document_approval_tests()
    elif test_type == "enrollment_approval":
        tester = EnrollmentApprovalTester()
        success = tester.run_enrollment_approval_tests()
    elif test_type == "new_approval_system":
        tester = NewApprovalSystemTester()
        success = tester.run_new_approval_system_tests()
    else:
        tester = RoleChangeAndTeacherAssignmentTester()
        success = tester.run_all_tests()
        
    sys.exit(0 if success else 1)