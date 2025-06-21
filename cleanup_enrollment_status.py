#!/usr/bin/env python3
"""
Cleanup script to update any remaining 'pending_documents' enrollment statuses
to 'pending_approval' in the database
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

async def cleanup_enrollment_status():
    """Update any remaining pending_documents enrollment statuses to pending_approval"""
    
    # Connect to MongoDB
    MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.driving_school_platform
    
    try:
        print("🧹 Starting cleanup of 'pending_documents' enrollment statuses...")
        
        # Count pending_documents enrollments before cleanup
        pending_docs_count = await db.enrollments.count_documents({"enrollment_status": "pending_documents"})
        print(f"📊 Found {pending_docs_count} enrollments with 'pending_documents' status")
        
        if pending_docs_count > 0:
            # Update pending_documents to pending_approval
            print("🔄 Converting 'pending_documents' enrollments to 'pending_approval'...")
            update_result = await db.enrollments.update_many(
                {"enrollment_status": "pending_documents"},
                {"$set": {
                    "enrollment_status": "pending_approval",
                    "status_updated_at": datetime.utcnow(),
                    "status_updated_by": "system_cleanup",
                    "migration_note": "Migrated from pending_documents to pending_approval"
                }}
            )
            print(f"✅ Updated {update_result.modified_count} enrollments to 'pending_approval'")
        
        # Verify cleanup
        remaining_pending_docs = await db.enrollments.count_documents({"enrollment_status": "pending_documents"})
        if remaining_pending_docs == 0:
            print("✨ Cleanup successful! No more 'pending_documents' enrollments found.")
        else:
            print(f"⚠️  Warning: {remaining_pending_docs} 'pending_documents' enrollments still remain")
        
        # Show final enrollment status distribution
        print("\n📊 Final enrollment status distribution:")
        pending_approval_count = await db.enrollments.count_documents({"enrollment_status": "pending_approval"})
        approved_count = await db.enrollments.count_documents({"enrollment_status": "approved"})
        rejected_count = await db.enrollments.count_documents({"enrollment_status": "rejected"})
        completed_count = await db.enrollments.count_documents({"enrollment_status": "completed"})
        total_count = await db.enrollments.count_documents({})
        
        print(f"   ⏳ PENDING_APPROVAL: {pending_approval_count}")
        print(f"   ✅ APPROVED: {approved_count}")
        print(f"   ❌ REJECTED: {rejected_count}")
        print(f"   🎓 COMPLETED: {completed_count}")
        print(f"   📄 TOTAL: {total_count}")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {str(e)}")
        
    finally:
        client.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    asyncio.run(cleanup_enrollment_status())