#!/usr/bin/env python3
"""Specific test to reproduce the exact 'Student enrollment not found' error"""

import requests
import json

BASE_URL = "http://localhost:8001/api"

def test_specific_error():
    """Test with actual data to find the specific 'Student enrollment not found' error"""
    print("🔍 Testing Specific 'Student enrollment not found' Error...")
    
    # First, let's check if there are any existing users/data we can use
    
    # Try to login with some common test credentials
    test_credentials = [
        {"email": "manager8@auto-ecoleblidacentreschool.dz", "password": "manager123"},
        {"email": "manager@test.dz", "password": "manager123"},
        {"email": "student@test.dz", "password": "student123"}
    ]
    
    for cred in test_credentials:
        print(f"\n🔑 Trying to login with {cred['email']}...")
        login_response = requests.post(f"{BASE_URL}/auth/login", json=cred)
        
        if login_response.status_code == 200:
            token = login_response.json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            print(f"✅ Login successful!")
            
            # Get user info
            user_response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
            if user_response.status_code == 200:
                user = user_response.json()['user']
                print(f"   Role: {user['role']}")
                
                # If it's a manager, test the enrollment issue
                if user['role'] == 'manager':
                    print(f"\n📋 Testing manager enrollments...")
                    
                    # Get enrollments
                    enrollments_response = requests.get(f"{BASE_URL}/manager/enrollments", headers=headers)
                    
                    if enrollments_response.status_code == 200:
                        enrollments_data = enrollments_response.json()
                        enrollments = enrollments_data.get('enrollments', [])
                        
                        print(f"   Found {len(enrollments)} enrollments")
                        
                        for enrollment in enrollments:
                            print(f"   - {enrollment['student_name']} (ID: {enrollment['id']}, Status: {enrollment['enrollment_status']})")
                            
                            # Test getting available teachers for each enrollment
                            teachers_response = requests.get(f"{BASE_URL}/manager/enrollments/{enrollment['id']}/available-teachers", 
                                                           headers=headers)
                            
                            if teachers_response.status_code == 200:
                                teachers_data = teachers_response.json()
                                teachers = teachers_data.get('available_teachers', [])
                                print(f"     Available teachers: {len(teachers)}")
                                
                                if teachers:
                                    print(f"     Teachers: {[t['name'] for t in teachers]}")
                                    
                                    # Try to assign the first teacher
                                    teacher = teachers[0]
                                    print(f"   📝 Attempting to assign teacher {teacher['name']} to {enrollment['student_name']}...")
                                    
                                    assign_data = {'teacher_id': teacher['id']}
                                    assign_response = requests.post(f"{BASE_URL}/manager/enrollments/{enrollment['id']}/assign-teacher", 
                                                                  data=assign_data, headers=headers)
                                    
                                    if assign_response.status_code == 200:
                                        result = assign_response.json()
                                        print(f"     ✅ Assignment successful: {result['teacher_name']}")
                                    else:
                                        print(f"     ❌ Assignment failed: {assign_response.status_code}")
                                        print(f"     Error: {assign_response.text}")
                                        
                                        # This is where we might see the "Student enrollment not found" error
                                        return assign_response.text
                                else:
                                    print(f"     ⚠️  No available teachers for this enrollment")
                            else:
                                print(f"     ❌ Failed to get available teachers: {teachers_response.status_code}")
                                print(f"     Error: {teachers_response.text}")
                                
                                # This might be where the error occurs
                                if "enrollment not found" in teachers_response.text.lower():
                                    print(f"     🐛 FOUND THE BUG: {teachers_response.text}")
                                    return teachers_response.text
                    
                    else:
                        print(f"   ❌ Failed to get enrollments: {enrollments_response.status_code}")
                        print(f"   Error: {enrollments_response.text}")
                
                elif user['role'] == 'student':
                    print(f"\n📚 Testing student dashboard...")
                    
                    # Get student enrollments
                    dashboard_response = requests.get(f"{BASE_URL}/dashboard", headers=headers)
                    if dashboard_response.status_code == 200:
                        dashboard_data = dashboard_response.json()
                        enrollments = dashboard_data.get('enrollments', [])
                        print(f"   Student has {len(enrollments)} enrollments")
                        
                        for enrollment in enrollments:
                            print(f"   - School: {enrollment.get('school_name', 'Unknown')} (Status: {enrollment.get('enrollment_status', 'Unknown')})")
        
        else:
            print(f"   ❌ Login failed: {login_response.status_code}")
    
    print(f"\n🔍 Testing completed")
    return None

if __name__ == "__main__":
    error = test_specific_error()
    if error:
        print(f"\n🐛 REPRODUCED ERROR: {error}")
    else:
        print(f"\n✅ No 'enrollment not found' error detected in current data")