#!/usr/bin/env python3
"""Test script to reproduce and debug the teacher assignment issue"""

import requests
import json
import random
import string
from io import BytesIO
import uuid

BASE_URL = "http://localhost:8001/api"

def create_dummy_file():
    """Create a dummy file for testing"""
    return BytesIO(b"dummy file content for testing documents")

def generate_random_email():
    """Generate a random email"""
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_{random_suffix}@example.com"

def test_teacher_assignment_bug():
    """Test the complete teacher assignment flow to identify issues"""
    print("🔍 Testing Teacher Assignment Bug...")
    
    # Step 1: Register a manager and create a driving school
    print("\n1️⃣ Creating Manager and Driving School...")
    manager_email = generate_random_email()
    manager_data = {
        "email": manager_email,
        "password": "manager123",
        "first_name": "Test",
        "last_name": "Manager",
        "phone": "1234567890",
        "address": "123 Manager Street",
        "date_of_birth": "1980-01-01",
        "gender": "male",
        "state": "Alger"
    }
    
    files = {
        'profile_photo': ('manager_photo.jpg', create_dummy_file(), 'image/jpeg')
    }
    
    manager_register_response = requests.post(f"{BASE_URL}/auth/register", data=manager_data, files=files)
    
    if manager_register_response.status_code != 200:
        print(f"❌ Manager registration failed: {manager_register_response.status_code}")
        print(manager_register_response.text)
        return False
    
    manager_token = manager_register_response.json()['access_token']
    manager_headers = {'Authorization': f'Bearer {manager_token}'}
    print(f"✅ Manager registered: {manager_email}")
    
    # Create driving school
    school_data = {
        "name": "Test Driving School",
        "address": "456 School Street",
        "state": "Alger",
        "phone": "0987654321",
        "email": "school@test.dz",
        "description": "A test driving school for debugging",
        "price": 25000.0
    }
    
    school_response = requests.post(f"{BASE_URL}/driving-schools", json=school_data, headers=manager_headers)
    
    if school_response.status_code != 200:
        print(f"❌ School creation failed: {school_response.status_code}")
        print(school_response.text)
        return False
    
    school_id = school_response.json()['id']
    print(f"✅ Driving school created: {school_id}")
    
    # Step 2: Create a teacher for the school
    print("\n2️⃣ Creating Teacher...")
    teacher_email = generate_random_email()
    teacher_data = {
        "email": teacher_email,
        "first_name": "Test",
        "last_name": "Teacher",
        "phone": "1111111111",
        "address": "789 Teacher Street",
        "date_of_birth": "1985-01-01",
        "gender": "male",
        "password": "teacher123",
        "can_teach_male": True,
        "can_teach_female": True
    }
    
    teacher_response = requests.post(f"{BASE_URL}/teachers/add", json=teacher_data, headers=manager_headers)
    
    if teacher_response.status_code != 200:
        print(f"❌ Teacher creation failed: {teacher_response.status_code}")
        print(teacher_response.text)
        return False
    
    teacher_id = teacher_response.json()['teacher']['id']
    print(f"✅ Teacher created: {teacher_id}")
    
    # Approve the teacher
    approve_teacher_response = requests.post(f"{BASE_URL}/teachers/{teacher_id}/approve", 
                                           headers=manager_headers)
    if approve_teacher_response.status_code == 200:
        print(f"✅ Teacher approved")
    else:
        print(f"⚠️  Failed to approve teacher: {approve_teacher_response.text}")
        # Continue anyway
    
    # Step 3: Register a student
    print("\n3️⃣ Creating Student...")
    student_email = generate_random_email()
    student_data = {
        "email": student_email,
        "password": "student123",
        "first_name": "Test",
        "last_name": "Student",
        "phone": "2222222222",
        "address": "321 Student Street",
        "date_of_birth": "1995-01-01",
        "gender": "male",
        "state": "Alger"
    }
    
    files = {
        'profile_photo': ('student_photo.jpg', create_dummy_file(), 'image/jpeg')
    }
    
    student_register_response = requests.post(f"{BASE_URL}/auth/register", data=student_data, files=files)
    
    if student_register_response.status_code != 200:
        print(f"❌ Student registration failed: {student_register_response.status_code}")
        print(student_register_response.text)
        return False
    
    student_token = student_register_response.json()['access_token']
    student_headers = {'Authorization': f'Bearer {student_token}'}
    print(f"✅ Student registered: {student_email}")
    
    # Step 4: Student enrolls in the driving school
    print("\n4️⃣ Student Enrolling in School...")
    enrollment_data = {"school_id": school_id}
    enrollment_response = requests.post(f"{BASE_URL}/enrollments", json=enrollment_data, headers=student_headers)
    
    if enrollment_response.status_code != 200:
        print(f"❌ Enrollment failed: {enrollment_response.status_code}")
        print(enrollment_response.text)
        return False
    
    enrollment_id = enrollment_response.json()['enrollment_id']
    print(f"✅ Student enrolled: {enrollment_id}")
    
    # Step 5: Upload student documents
    print("\n5️⃣ Uploading Student Documents...")
    required_docs = ['id_card', 'medical_certificate', 'residence_certificate']
    doc_ids = []
    
    for doc_type in required_docs:
        files = {
            'file': (f'{doc_type}.jpg', create_dummy_file(), 'image/jpeg')
        }
        data = {'document_type': doc_type}
        
        doc_response = requests.post(f"{BASE_URL}/documents/upload", 
                                   files=files, data=data, headers=student_headers)
        if doc_response.status_code == 200:
            doc_id = doc_response.json()['document']['id']
            doc_ids.append(doc_id)
            print(f"  ✅ Uploaded {doc_type} (ID: {doc_id})")
        else:
            print(f"  ❌ Failed to upload {doc_type}: {doc_response.text}")
    
    # Step 6: Manager accepts documents
    print("\n6️⃣ Manager Accepting Documents...")
    for doc_id in doc_ids:
        accept_response = requests.post(f"{BASE_URL}/documents/accept/{doc_id}", 
                                      headers=manager_headers)
        if accept_response.status_code == 200:
            print(f"  ✅ Accepted document {doc_id}")
        else:
            print(f"  ❌ Failed to accept document {doc_id}: {accept_response.text}")
    
    # Step 7: Manager accepts enrollment
    print("\n7️⃣ Manager Accepting Enrollment...")
    accept_response = requests.post(f"{BASE_URL}/manager/enrollments/{enrollment_id}/accept", 
                                   headers=manager_headers)
    if accept_response.status_code == 200:
        print(f"✅ Enrollment accepted")
    else:
        print(f"❌ Failed to accept enrollment: {accept_response.text}")
    
    # Step 8: Check manager's enrollments (THIS IS WHERE THE BUG MIGHT BE)
    print("\n8️⃣ Checking Manager's Enrollments...")
    enrollments_response = requests.get(f"{BASE_URL}/manager/enrollments", headers=manager_headers)
    
    if enrollments_response.status_code != 200:
        print(f"❌ Failed to get enrollments: {enrollments_response.status_code}")
        print(enrollments_response.text)
        return False
    
    enrollments_data = enrollments_response.json()
    enrollments = enrollments_data.get('enrollments', [])
    
    print(f"📋 Manager sees {len(enrollments)} enrollments")
    
    if not enrollments:
        print("🐛 BUG FOUND: Manager cannot see any enrollments!")
        return False
    
    # Find our test enrollment
    test_enrollment = None
    for enrollment in enrollments:
        if enrollment['id'] == enrollment_id:
            test_enrollment = enrollment
            break
    
    if not test_enrollment:
        print(f"🐛 BUG FOUND: Manager cannot see the specific enrollment {enrollment_id}!")
        print(f"Available enrollments: {[e['id'] for e in enrollments]}")
        return False
    
    print(f"✅ Found test enrollment: {test_enrollment['student_name']}")
    print(f"   Status: {test_enrollment['enrollment_status']}")
    print(f"   Documents verified: {test_enrollment.get('documents_verified', 'unknown')}")
    
    # Step 9: Get available teachers for assignment
    print("\n9️⃣ Getting Available Teachers...")
    teachers_response = requests.get(f"{BASE_URL}/manager/enrollments/{enrollment_id}/available-teachers", 
                                   headers=manager_headers)
    
    if teachers_response.status_code != 200:
        print(f"❌ Failed to get available teachers: {teachers_response.status_code}")
        print(teachers_response.text)
        return False
    
    teachers_data = teachers_response.json()
    available_teachers = teachers_data.get('teachers', [])
    
    print(f"👨‍🏫 Found {len(available_teachers)} available teachers")
    
    if not available_teachers:
        print("🐛 BUG FOUND: No available teachers found!")
        return False
    
    # Step 10: Assign teacher to enrollment
    print("\n🔟 Assigning Teacher to Enrollment...")
    target_teacher = available_teachers[0]  # Use first available teacher
    
    assign_data = {'teacher_id': target_teacher['id']}
    assign_response = requests.post(f"{BASE_URL}/manager/enrollments/{enrollment_id}/assign-teacher", 
                                  data=assign_data, headers=manager_headers)
    
    if assign_response.status_code != 200:
        print(f"❌ Failed to assign teacher: {assign_response.status_code}")
        print(assign_response.text)
        return False
    
    assignment_result = assign_response.json()
    print(f"✅ Teacher assigned successfully: {assignment_result['teacher_name']}")
    
    # Step 11: Verify assignment
    print("\n🔍 Verifying Teacher Assignment...")
    final_enrollments_response = requests.get(f"{BASE_URL}/manager/enrollments", headers=manager_headers)
    final_enrollments = final_enrollments_response.json().get('enrollments', [])
    
    assigned_enrollment = None
    for enrollment in final_enrollments:
        if enrollment['id'] == enrollment_id:
            assigned_enrollment = enrollment
            break
    
    if assigned_enrollment and assigned_enrollment.get('assigned_teacher'):
        teacher_info = assigned_enrollment['assigned_teacher']
        print(f"✅ Assignment verified: {teacher_info['name']} ({teacher_info['email']})")
        return True
    else:
        print("🐛 BUG FOUND: Teacher assignment not reflected in enrollment data!")
        return False

if __name__ == "__main__":
    success = test_teacher_assignment_bug()
    if success:
        print(f"\n🎉 Teacher assignment flow works correctly!")
    else:
        print(f"\n💥 Teacher assignment bug reproduced!")