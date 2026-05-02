from __future__ import annotations

from typing import Any

from services.shared.python.queue import QUEUE_AI_TASKS, QueueClient, mongo_collection
from services.shared.python.repositories.raw_news_repository import RawNewsRepository
from services.shared.python.trackers.news_status_tracker import NewsStatusTracker


class AIDispatcher:
    """Dispatcher for AI processing tasks with rate limiting and priority."""
    
    def __init__(self) -> None:
        self.queue = QueueClient()
        self.raw_news_repo = RawNewsRepository()
        self.status_tracker = NewsStatusTracker()
    
    def dispatch(self, news_id: str, priority: str = "normal") -> None:
        """
        Dispatch a single AI processing task.
        
        Args:
            news_id: The news_id to process
            priority: Task priority ('high', 'normal', 'low')
        """
        # Verify news exists and is ready
        raw_news = self.raw_news_repo.find_by_id(news_id)
        if not raw_news:
            raise ValueError(f"News {news_id} not found")
        
        if raw_news.get("processing_status") != "ready":
            raise ValueError(f"News {news_id} is not ready for processing")
        
        try:
            # Update status to processing
            self.raw_news_repo.update_status(news_id, {"processing_status": "processing"})
            self.status_tracker.update_status(news_id, {
                "status": "processing",
                "stage": "ai_analysis",
            })
            
            # Get current retry count
            status = self.status_tracker.get_status(news_id)
            retry_count = status.get("retry_count", 0) if status else 0
            
            # AI analysis can load the canonical raw payload from Mongo by news_id.
            # Keeping the queue message small avoids ObjectId serialization issues
            # and makes the task format stable across producers.
            self.queue.publish(QUEUE_AI_TASKS, {
                "news_id": news_id,
                "priority": priority,
                "retry_count": retry_count,
            })
            
        except Exception as e:
            # Revert status on failure
            self.raw_news_repo.update_status(news_id, {"processing_status": "ready"})
            self.status_tracker.update_status(news_id, {
                "status": "ready",
                "error": str(e),
            })
            raise
    
    def dispatch_batch(self, news_ids: list[str]) -> dict[str, Any]:
        """
        Dispatch multiple AI processing tasks.
        
        Args:
            news_ids: List of news_ids to process
            
        Returns:
            Dictionary with dispatched count, skipped count, and errors
        """
        result = {
            "dispatched": 0,
            "skipped": 0,
            "errors": [],
        }
        
        for news_id in news_ids:
            try:
                self.dispatch(news_id)
                result["dispatched"] += 1
            except Exception as e:
                result["skipped"] += 1
                result["errors"].append({
                    "newsId": news_id,
                    "reason": str(e),
                })
        
        return result
    
    def schedule_retry(self, news_id: str, delay_ms: int) -> None:
        """
        Schedule a retry for a failed task.
        
        Args:
            news_id: The news_id to retry
            delay_ms: Delay in milliseconds before retry
        """
        # For now, just mark as ready - the retry scheduler will handle the delay
        self.status_tracker.mark_for_retry(news_id)
    
    def get_queue_depth(self) -> dict[str, Any]:
        """
        Get queue depth statistics.
        
        Returns:
            Dictionary with pending, processing, failed counts and avg wait time
        """
        with mongo_collection("news_status") as collection:
            pending_count = collection.count_documents({"status": {"$in": ["pending", "ready"]}})
            processing_count = collection.count_documents({"status": "processing"})
            failed_count = collection.count_documents({"status": "failed"})
            
            # Calculate average wait time for pending items
            pipeline = [
                {"$match": {"status": {"$in": ["pending", "ready"]}}},
                {"$project": {
                    "wait_time": {
                        "$subtract": ["$$NOW", "$created_at"]
                    }
                }},
                {"$group": {
                    "_id": None,
                    "avg_wait_time": {"$avg": "$wait_time"}
                }}
            ]
            
            result = list(collection.aggregate(pipeline))
            avg_wait_time_ms = result[0]["avg_wait_time"] if result else 0
            
            return {
                "pending": pending_count,
                "processing": processing_count,
                "failed": failed_count,
                "avg_wait_time_ms": avg_wait_time_ms,
            }
