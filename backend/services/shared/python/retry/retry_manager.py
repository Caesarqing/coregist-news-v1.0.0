from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from services.shared.python.queue import QUEUE_AI_TASKS, QueueClient
from services.shared.python.settings import settings
from services.shared.python.trackers.news_status_tracker import NewsStatusTracker


# Retryable error codes
RETRYABLE_ERROR_CODES = [
    "LLM_TIMEOUT",
    "LLM_RATE_LIMIT",
    "LLM_ERROR",
    "DATABASE_ERROR",
]

# Non-retryable error codes
NON_RETRYABLE_ERROR_CODES = [
    "CONTENT_TOO_SHORT",
    "VALIDATION_ERROR",
]


class RetryManager:
    """Manager for handling failed task retry with exponential backoff."""
    
    def __init__(self) -> None:
        self.status_tracker = NewsStatusTracker()
        self.queue = QueueClient()
        self.max_retries = settings.retry_max_retries
        self.base_delay_ms = settings.retry_base_delay_ms
        self.max_delay_ms = settings.retry_max_delay_ms
        self.exponential_base = settings.retry_exponential_base
    
    def should_retry(self, error: dict[str, Any], retry_count: int) -> bool:
        """
        Determine if an error should be retried.
        
        Args:
            error: Error dictionary with 'code' and 'retryable' fields
            retry_count: Current retry count
            
        Returns:
            True if the error should be retried, False otherwise
        """
        # Check if retry count exceeded
        if retry_count >= self.max_retries:
            return False
        
        # Check if error is explicitly marked as retryable
        if "retryable" in error:
            return error["retryable"]
        
        # Check error code
        error_code = error.get("code", "")
        if error_code in RETRYABLE_ERROR_CODES:
            return True
        if error_code in NON_RETRYABLE_ERROR_CODES:
            return False
        
        # Default to retryable for unknown errors
        return True
    
    def calculate_delay(self, retry_count: int) -> int:
        """
        Calculate exponential backoff delay for retry.
        
        Args:
            retry_count: Current retry count (0-indexed)
            
        Returns:
            Delay in milliseconds
        """
        if retry_count >= self.max_retries:
            return 0
        
        # Calculate exponential backoff: base_delay * exponential_base^retry_count
        delay = self.base_delay_ms * (self.exponential_base ** retry_count)
        
        # Cap at max delay
        return min(delay, self.max_delay_ms)
    
    def schedule_retry(self, news_id: str, error: dict[str, Any]) -> None:
        """
        Schedule a retry for a failed news item.
        
        Args:
            news_id: The news_id to retry
            error: Error information
        """
        # Get current status
        status = self.status_tracker.get_status(news_id)
        if not status:
            return
        
        retry_count = status.get("retry_count", 0)
        
        # Check if should retry
        if not self.should_retry(error, retry_count):
            # Mark as permanently failed
            self.status_tracker.update_status(news_id, {
                "status": "failed",
                "error": error.get("message", "Unknown error"),
                "error_code": error.get("code", "UNKNOWN"),
            })
            return
        
        # Update status with error and increment retry count
        self.status_tracker.update_status(news_id, {
            "status": "failed",
            "error": error.get("message", "Unknown error"),
            "error_code": error.get("code", "UNKNOWN"),
            "increment_retry": True,
        })
    
    def process_retry_queue(self) -> int:
        """
        Process the retry queue and re-dispatch eligible failed items.
        
        Returns:
            Number of items retried
        """
        # Get failed items that are retryable
        failed_items = self.status_tracker.get_failed_items(retryable=True, limit=100)
        retried_count = 0
        
        for item in failed_items:
            news_id = item["news_id"]
            retry_count = item.get("retry_count", 0)
            last_error_at = item.get("last_error_at")
            
            # Check if retry count exceeded
            if retry_count >= self.max_retries:
                continue
            
            # Calculate required delay
            delay_ms = self.calculate_delay(retry_count)
            
            # Check if enough time has passed
            if last_error_at:
                elapsed = datetime.utcnow() - last_error_at
                elapsed_ms = elapsed.total_seconds() * 1000
                
                if elapsed_ms < delay_ms:
                    # Not ready for retry yet
                    continue
            
            # Mark for retry
            self.status_tracker.mark_for_retry(news_id)
            
            # Re-dispatch to AI queue with low priority
            self.queue.publish(QUEUE_AI_TASKS, {
                "news_id": news_id,
                "priority": "low",
                "retry_count": retry_count,
            })
            
            retried_count += 1
        
        return retried_count
    
    def get_max_retries(self) -> int:
        """Get the maximum number of retries allowed."""
        return self.max_retries
