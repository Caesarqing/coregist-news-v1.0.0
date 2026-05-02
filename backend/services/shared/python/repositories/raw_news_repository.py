from __future__ import annotations

from datetime import datetime
from typing import Any

from services.shared.python.queue import mongo_collection


class RawNewsRepository:
    """Repository for managing raw news documents in MongoDB."""
    
    def __init__(self) -> None:
        self.collection_name = "raw_news"
    
    def upsert(self, raw_news: dict[str, Any]) -> str:
        """
        Insert or update raw news document in MongoDB.
        
        Args:
            raw_news: Dictionary containing raw news data
            
        Returns:
            news_id of the upserted document
            
        Raises:
            ValueError: If required fields are missing
        """
        # Validate required fields
        if not raw_news.get("news_id"):
            raise ValueError("news_id is required")
        if not raw_news.get("title"):
            raise ValueError("title is required")
        if not raw_news.get("url"):
            raise ValueError("url is required")
        
        news_id = raw_news["news_id"]
        
        # Prepare document with timestamps
        now = datetime.utcnow()
        document = {
            **raw_news,
            "updated_at": now,
        }
        
        # Set created_at only for new documents
        with mongo_collection(self.collection_name) as collection:
            existing = collection.find_one({"news_id": news_id}, {"retry_count": 1})
            
            if existing:
                # Preserve retry_count on update
                if "retry_count" not in document:
                    document["retry_count"] = existing.get("retry_count", 0)
            else:
                # Set defaults for new document
                document["created_at"] = now
                if "processing_status" not in document:
                    document["processing_status"] = "pending"
                if "retry_count" not in document:
                    document["retry_count"] = 0
            
            # Upsert the document
            collection.update_one(
                {"news_id": news_id},
                {"$set": document},
                upsert=True
            )
        
        return news_id
    
    def find_by_id(self, news_id: str) -> dict[str, Any] | None:
        """
        Find raw news document by news_id.
        
        Args:
            news_id: The news_id to search for
            
        Returns:
            Raw news document or None if not found
        """
        with mongo_collection(self.collection_name) as collection:
            return collection.find_one({"news_id": news_id})
    
    def find_by_status(self, status: str, limit: int = 100) -> list[dict[str, Any]]:
        """
        Find raw news documents by processing status.
        
        Args:
            status: Processing status to filter by
            limit: Maximum number of documents to return
            
        Returns:
            List of raw news documents
        """
        with mongo_collection(self.collection_name) as collection:
            cursor = collection.find(
                {"processing_status": status}
            ).sort("created_at", -1).limit(limit)
            return list(cursor)
    
    def update_status(
        self,
        news_id: str,
        status_update: dict[str, Any]
    ) -> None:
        """
        Update processing status and related fields for a news item.
        
        Args:
            news_id: The news_id to update
            status_update: Dictionary with fields to update (e.g., processing_status, last_error)
        """
        update_doc = {
            **status_update,
            "updated_at": datetime.utcnow()
        }
        
        with mongo_collection(self.collection_name) as collection:
            collection.update_one(
                {"news_id": news_id},
                {"$set": update_doc}
            )
