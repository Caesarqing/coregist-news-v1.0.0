from __future__ import annotations

from datetime import datetime
from typing import Any

from services.shared.python.queue import mongo_collection


class NewsStatusTracker:
    """Tracker for managing news processing status in MongoDB."""
    
    def __init__(self) -> None:
        self.collection_name = "news_status"
    
    def create_status(self, news_id: str, initial_status: dict[str, Any]) -> None:
        """
        Create a new status record for a news item.
        
        Args:
            news_id: The news_id to track
            initial_status: Initial status information (status, stage, etc.)
        """
        now = datetime.utcnow()
        document = {
            "news_id": news_id,
            "status": initial_status.get("status", "pending"),
            "stage": initial_status.get("stage", "ingestion"),
            "retry_count": 0,
            "max_retries": initial_status.get("max_retries", 3),
            "created_at": now,
            "updated_at": now,
        }
        
        # Add optional fields if provided
        if "started_at" in initial_status:
            document["started_at"] = initial_status["started_at"]
        
        with mongo_collection(self.collection_name) as collection:
            collection.insert_one(document)
    
    def update_status(self, news_id: str, update: dict[str, Any]) -> None:
        """
        Update status information for a news item.
        
        Args:
            news_id: The news_id to update
            update: Dictionary with fields to update (status, stage, error, etc.)
        """
        update_doc = {
            "updated_at": datetime.utcnow()
        }
        
        # Add provided fields
        if "status" in update:
            update_doc["status"] = update["status"]
        if "stage" in update:
            update_doc["stage"] = update["stage"]
        if "error" in update:
            update_doc["last_error"] = update["error"]
            update_doc["last_error_at"] = datetime.utcnow()
        if "error_code" in update:
            update_doc["error_code"] = update["error_code"]
        if "completed_at" in update:
            update_doc["completed_at"] = update["completed_at"]
        if "started_at" in update:
            update_doc["started_at"] = update["started_at"]
        
        # Handle retry count increment
        if update.get("increment_retry"):
            with mongo_collection(self.collection_name) as collection:
                collection.update_one(
                    {"news_id": news_id},
                    {
                        "$set": update_doc,
                        "$inc": {"retry_count": 1}
                    }
                )
        else:
            with mongo_collection(self.collection_name) as collection:
                collection.update_one(
                    {"news_id": news_id},
                    {"$set": update_doc}
                )
    
    def get_status(self, news_id: str) -> dict[str, Any] | None:
        """
        Get status information for a news item.
        
        Args:
            news_id: The news_id to query
            
        Returns:
            Status document or None if not found
        """
        with mongo_collection(self.collection_name) as collection:
            return collection.find_one({"news_id": news_id})
    
    def get_pending_items(self, limit: int = 50) -> list[dict[str, Any]]:
        """
        Get pending news items ordered by updated_at descending.
        
        Args:
            limit: Maximum number of items to return
            
        Returns:
            List of status documents
        """
        with mongo_collection(self.collection_name) as collection:
            cursor = collection.find(
                {"status": {"$in": ["pending", "ready"]}}
            ).sort("updated_at", -1).limit(limit)
            return list(cursor)
    
    def get_failed_items(self, retryable: bool = True, limit: int = 100) -> list[dict[str, Any]]:
        """
        Get failed news items, optionally filtered by retryability.
        
        Args:
            retryable: If True, only return items with retry_count < max_retries
            limit: Maximum number of items to return
            
        Returns:
            List of status documents
        """
        query = {"status": "failed"}
        
        if retryable:
            # Only return items that haven't exceeded max retries
            query["$expr"] = {"$lt": ["$retry_count", "$max_retries"]}
        
        with mongo_collection(self.collection_name) as collection:
            cursor = collection.find(query).sort("last_error_at", 1).limit(limit)
            return list(cursor)
    
    def mark_for_retry(self, news_id: str) -> None:
        """
        Mark a failed item for retry by resetting status to 'ready'.
        
        Args:
            news_id: The news_id to mark for retry
        """
        with mongo_collection(self.collection_name) as collection:
            collection.update_one(
                {"news_id": news_id},
                {
                    "$set": {
                        "status": "ready",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
