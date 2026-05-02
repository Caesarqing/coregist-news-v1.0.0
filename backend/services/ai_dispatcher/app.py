#!/usr/bin/env python3
"""AI Dispatcher Service - Consumes from QUEUE_NEWS_READY and dispatches to QUEUE_AI_TASKS."""

from __future__ import annotations

import logging
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.ai_dispatcher.dispatcher import AIDispatcher
from services.shared.python.repositories.raw_news_repository import RawNewsRepository
from services.shared.python.queue import QUEUE_NEWS_READY, QueueClient


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class AIDispatcherService:
    """Service that consumes ready news items and dispatches them for AI processing."""
    
    def __init__(self) -> None:
        self.dispatcher = AIDispatcher()
        self.queue = QueueClient()
        self.raw_news_repo = RawNewsRepository()

    def bootstrap_ready_backlog(self) -> None:
        """Re-dispatch ready raw news items that may have missed their queue event."""
        ready_items = self.raw_news_repo.find_by_status("ready", limit=50)
        if not ready_items:
            return
        logger.info("Bootstrapping %s ready raw news items", len(ready_items))
        for item in ready_items:
            news_id = item.get("news_id")
            if not news_id:
                continue
            try:
                self.dispatcher.dispatch(news_id, priority="normal")
            except Exception as exc:
                logger.warning("Failed to bootstrap dispatch for %s: %s", news_id, exc)
    
    def handle_ready_news(self, payload: dict) -> None:
        """
        Handle a ready news item by dispatching it for AI processing.
        
        Args:
            payload: Message payload containing news_id
        """
        news_id = payload.get("news_id")
        if not news_id:
            logger.error("Received payload without news_id")
            return
        
        try:
            logger.info(f"Dispatching news {news_id} for AI processing")
            self.dispatcher.dispatch(news_id, priority="normal")
            logger.info(f"Successfully dispatched news {news_id}")
        except Exception as e:
            message = str(e)
            if "is not ready for processing" in message or "not found" in message:
                logger.warning(f"Skipping stale ready message for {news_id}: {message}")
                return
            logger.error(f"Failed to dispatch news {news_id}: {e}")
            raise
    
    def start(self) -> None:
        """Start consuming from QUEUE_NEWS_READY."""
        logger.info("AI Dispatcher Service starting...")
        logger.info(f"Consuming from queue: {QUEUE_NEWS_READY}")
        
        try:
            self.bootstrap_ready_backlog()
            self.queue.consume(QUEUE_NEWS_READY, self.handle_ready_news)
        except KeyboardInterrupt:
            logger.info("AI Dispatcher Service stopped by user")
        except Exception as e:
            logger.error(f"AI Dispatcher Service error: {e}")
            raise
        finally:
            self.queue.close()


if __name__ == "__main__":
    service = AIDispatcherService()
    service.start()
