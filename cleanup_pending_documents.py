#!/usr/bin/env python3
"""
Cleanup script to remove PENDING documents from the database
and update any remaining pending documents to accepted status
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def cleanup_pending_documents():
    """Remove all documents with pending status from the database"""
    
    # Connect to MongoDB
    MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.driving_school_platform
    
    try:
        print("🧹 Starting cleanup of PENDING documents...")
        
        # Count pending documents before cleanup
        pending_count = await db.documents.count_documents({"status": "pending"})
        print(f"📊 Found {pending_count} documents with PENDING status")
        
        if pending_count > 0:
            # Option 1: Delete pending documents entirely
            print("🗑️  Deleting all PENDING documents...")
            delete_result = await db.documents.delete_many({"status": "pending"})
            print(f"✅ Deleted {delete_result.deleted_count} pending documents")
            
            # Option 2: Alternative - Convert pending to accepted (uncomment if you prefer this)
            # print("🔄 Converting PENDING documents to ACCEPTED...")
            # update_result = await db.documents.update_many(
            #     {"status": "pending"},
            #     {"$set": {
            #         "status": "accepted",
            #         "is_verified": True,
            #         "approved_at": datetime.utcnow(),
            #         "approved_by": "system_cleanup"
            #     }}
            # )
            # print(f"✅ Updated {update_result.modified_count} documents to ACCEPTED")
        
        # Verify cleanup
        remaining_pending = await db.documents.count_documents({"status": "pending"})
        if remaining_pending == 0:
            print("✨ Cleanup successful! No more PENDING documents found.")
        else:
            print(f"⚠️  Warning: {remaining_pending} PENDING documents still remain")
        
        # Show final document status distribution
        print("\n📊 Final document status distribution:")
        accepted_count = await db.documents.count_documents({"status": "accepted"})
        refused_count = await db.documents.count_documents({"status": "refused"})
        total_count = await db.documents.count_documents({})
        
        print(f"   ✅ ACCEPTED: {accepted_count}")
        print(f"   ❌ REFUSED: {refused_count}")
        print(f"   📄 TOTAL: {total_count}")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {str(e)}")
        
    finally:
        client.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    asyncio.run(cleanup_pending_documents())