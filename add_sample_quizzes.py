#!/usr/bin/env python3
"""
Add sample quizzes to the database for testing
"""
import asyncio
import uuid
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

async def add_sample_quizzes():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.driving_school_platform
    
    # Sample quizzes
    sample_quizzes = [
        {
            "id": str(uuid.uuid4()),
            "course_type": "theory",
            "title": "Road Signs and Traffic Rules",
            "description": "Test your knowledge of Algerian road signs and traffic regulations",
            "difficulty": "easy",
            "questions": [
                {
                    "id": 1,
                    "question": "What does a red triangle sign with an exclamation mark mean?",
                    "options": ["Stop", "General Warning", "No Entry", "Speed Limit"],
                    "correct_answer": "General Warning",
                    "explanation": "A red triangle with exclamation mark indicates a general warning to drivers."
                },
                {
                    "id": 2,
                    "question": "What is the speed limit in urban areas in Algeria?",
                    "options": ["40 km/h", "50 km/h", "60 km/h", "70 km/h"],
                    "correct_answer": "50 km/h",
                    "explanation": "The speed limit in urban areas in Algeria is 50 km/h unless otherwise indicated."
                },
                {
                    "id": 3,
                    "question": "When should you use your headlights during the day?",
                    "options": ["Never", "Only when raining", "Outside urban areas", "Always"],
                    "correct_answer": "Outside urban areas",
                    "explanation": "In Algeria, headlights must be used during the day when driving outside urban areas."
                },
                {
                    "id": 4,
                    "question": "What does a circular blue sign with a white arrow mean?",
                    "options": ["Prohibition", "Mandatory direction", "Information", "Warning"],
                    "correct_answer": "Mandatory direction",
                    "explanation": "Blue circular signs indicate mandatory actions, including direction."
                },
                {
                    "id": 5,
                    "question": "At what age can you get a driving license in Algeria?",
                    "options": ["16 years", "17 years", "18 years", "19 years"],
                    "correct_answer": "18 years",
                    "explanation": "In Algeria, you must be at least 18 years old to obtain a driving license."
                }
            ],
            "passing_score": 70.0,
            "time_limit_minutes": 10,
            "is_active": True,
            "created_by": "system",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "course_type": "theory",
            "title": "Advanced Traffic Scenarios",
            "description": "Practice complex driving scenarios and decision making",
            "difficulty": "medium",
            "questions": [
                {
                    "id": 1,
                    "question": "At a four-way intersection with no traffic lights, who has the right of way?",
                    "options": ["Vehicle coming from the left", "Vehicle coming from the right", "First vehicle to arrive", "Largest vehicle"],
                    "correct_answer": "Vehicle coming from the right",
                    "explanation": "In Algeria, at unmarked intersections, vehicles coming from the right have priority."
                },
                {
                    "id": 2,
                    "question": "What should you do when you see a school bus with flashing red lights?",
                    "options": ["Slow down and proceed", "Stop completely", "Change lanes", "Sound your horn"],
                    "correct_answer": "Stop completely",
                    "explanation": "When a school bus has flashing red lights, all traffic must stop to ensure children's safety."
                },
                {
                    "id": 3,
                    "question": "What is the minimum following distance in good weather conditions?",
                    "options": ["1 second", "2 seconds", "3 seconds", "4 seconds"],
                    "correct_answer": "3 seconds",
                    "explanation": "The recommended following distance is at least 3 seconds in good weather conditions."
                },
                {
                    "id": 4,
                    "question": "When is it legal to use the emergency lane on a highway?",
                    "options": ["When traffic is slow", "When you need to exit", "Only in emergencies", "When passing"],
                    "correct_answer": "Only in emergencies",
                    "explanation": "Emergency lanes are reserved for genuine emergencies and breakdowns only."
                },
                {
                    "id": 5,
                    "question": "What should you do if your vehicle starts to skid?",
                    "options": ["Brake hard", "Turn steering wheel opposite to skid", "Turn steering wheel into the skid", "Accelerate"],
                    "correct_answer": "Turn steering wheel into the skid",
                    "explanation": "To regain control during a skid, gently steer in the same direction as the skid."
                }
            ],
            "passing_score": 80.0,
            "time_limit_minutes": 15,
            "is_active": True,
            "created_by": "system",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "course_type": "park",
            "title": "Parking and Maneuvering",
            "description": "Test your knowledge of parking rules and vehicle control",
            "difficulty": "medium",
            "questions": [
                {
                    "id": 1,
                    "question": "When parallel parking, what is the first step?",
                    "options": ["Signal and position vehicle", "Check mirrors", "Turn steering wheel", "Start reversing"],
                    "correct_answer": "Signal and position vehicle",
                    "explanation": "Always signal your intention and position your vehicle properly before beginning the parking maneuver."
                },
                {
                    "id": 2,
                    "question": "How far from the curb should your vehicle be when properly parked?",
                    "options": ["10 cm", "15 cm", "30 cm", "50 cm"],
                    "correct_answer": "15 cm",
                    "explanation": "Your vehicle should be parked within 15 cm of the curb for proper positioning."
                },
                {
                    "id": 3,
                    "question": "What is the purpose of the reference points when parking?",
                    "options": ["Decoration", "Help judge distances", "Legal requirement", "Mirror adjustment"],
                    "correct_answer": "Help judge distances",
                    "explanation": "Reference points help drivers judge distances and positions during parking maneuvers."
                },
                {
                    "id": 4,
                    "question": "When should you use your handbrake?",
                    "options": ["Only on hills", "Only when parking", "Always when stopped", "Never"],
                    "correct_answer": "Always when stopped",
                    "explanation": "The handbrake should be applied whenever the vehicle is parked or stopped for safety."
                }
            ],
            "passing_score": 75.0,
            "time_limit_minutes": 8,
            "is_active": True,
            "created_by": "system",
            "created_at": datetime.utcnow()
        }
    ]
    
    # Insert the quizzes
    try:
        result = await db.quizzes.insert_many(sample_quizzes)
        print(f"Successfully added {len(result.inserted_ids)} sample quizzes")
        
        # Verify
        count = await db.quizzes.count_documents({"is_active": True})
        print(f"Total active quizzes in database: {count}")
        
    except Exception as e:
        print(f"Error adding quizzes: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(add_sample_quizzes())