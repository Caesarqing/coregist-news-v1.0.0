import importlib.util
import unittest
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

from bson import ObjectId

from services.content_processing.service import ContentProcessingService
from services.news_scraper.service import NewsScraperService
from services.scheduler.service import SchedulerService
from services.shared.python.queue import LEGACY_QUEUES, QUEUE_KEYWORD_SEARCH, QueueClient


class FakeQueue:
    def __init__(self):
        self.messages = []

    def publish(self, queue_name, payload):
        self.messages.append((queue_name, payload))


class FakeLockCollection:
    def __init__(self, existing=None):
        self.existing = existing
        self.updated = False

    def find_one(self, *_args, **_kwargs):
        return self.existing

    def update_one(self, *_args, **_kwargs):
        self.updated = True


class FakeRawRepo:
    def __init__(self):
        self.docs = []

    def upsert(self, doc):
        self.docs.append(doc)
        return doc["news_id"]


class FakeStatusTracker:
    def __init__(self):
        self.updates = []

    def update_status(self, news_id, update):
        self.updates.append((news_id, update))


class FakeTrackingTopicCollection:
    def __init__(self, docs):
        self.docs = docs
        self.updated_many = None
        self.updated_one = None

    def find(self, *_args, **_kwargs):
        return list(self.docs)

    def update_many(self, query, update):
        self.updated_many = (query, update)

    def update_one(self, query, update, **_kwargs):
        self.updated_one = (query, update)
        for doc in self.docs:
            if doc.get("_id") == query.get("_id"):
                doc.update(update.get("$set", {}))


class FakeSearchJobCollection:
    def __init__(self, *, upserted=True):
        self.updated = None
        self.upserted = upserted

    def update_one(self, query, update, **_kwargs):
        self.updated = (query, update)
        return type("UpdateResult", (), {"upserted_id": ObjectId() if self.upserted else None})()


class PipelineBacklogControlsTest(unittest.TestCase):
    def test_legacy_queue_publish_is_noop(self):
        with patch("services.shared.python.queue.pika.BlockingConnection", side_effect=AssertionError("should not connect")):
            QueueClient().publish(LEGACY_QUEUES[0], {"news_id": "n1"})

    def test_scheduler_skips_rss_when_backlogged(self):
        service = object.__new__(SchedulerService)
        service.queue = FakeQueue()

        with (
            patch("services.scheduler.service.settings.rss_skip_when_backlogged", True),
            patch.object(SchedulerService, "rss_backlog_status", return_value={"backlogged": True, "raw_messages": 6000}),
        ):
            service.trigger_default_crawl()

        self.assertEqual(service.queue.messages, [])

    def test_scheduler_triggers_due_tracking_topic(self):
        service = object.__new__(SchedulerService)
        service.queue = FakeQueue()
        topic_id = ObjectId()
        topic_collection = FakeTrackingTopicCollection([
            {
                "_id": topic_id,
                "userId": ObjectId(),
                "name": "OpenAI",
                "keywords": ["OpenAI"],
                "enabled": True,
                "frequencyMinutes": 30,
                "nextRunAt": datetime.utcnow() - timedelta(minutes=1),
            }
        ])
        job_collection = FakeSearchJobCollection()

        @contextmanager
        def fake_mongo_collection(name):
            if name == "trackingtopics":
                yield topic_collection
            elif name == "user_search_jobs":
                yield job_collection
            else:
                raise AssertionError(name)

        with (
            patch("services.scheduler.service.mongo_collection", fake_mongo_collection),
            patch("services.scheduler.service.settings.rss_skip_when_backlogged", False),
        ):
            service.trigger_tracking_topics()

        self.assertEqual(len(service.queue.messages), 1)
        queue_name, payload = service.queue.messages[0]
        self.assertEqual(queue_name, QUEUE_KEYWORD_SEARCH)
        self.assertEqual(payload["source_type"], "tracking_topic")
        self.assertEqual(payload["tracking_topic_id"], str(topic_id))
        self.assertEqual(topic_collection.updated_one[1]["$set"]["lastStatus"], "processing")

    def test_scheduler_marks_tracking_backlogged_without_enqueue(self):
        service = object.__new__(SchedulerService)
        service.queue = FakeQueue()
        topic_collection = FakeTrackingTopicCollection([
            {
                "_id": ObjectId(),
                "userId": ObjectId(),
                "name": "AI",
                "keywords": ["AI"],
                "enabled": True,
                "nextRunAt": datetime.utcnow() - timedelta(minutes=1),
            }
        ])

        @contextmanager
        def fake_mongo_collection(name):
            self.assertEqual(name, "trackingtopics")
            yield topic_collection

        with (
            patch("services.scheduler.service.mongo_collection", fake_mongo_collection),
            patch("services.scheduler.service.settings.rss_skip_when_backlogged", True),
            patch.object(SchedulerService, "rss_backlog_status", return_value={"backlogged": True}),
        ):
            service.trigger_tracking_topics()

        self.assertEqual(service.queue.messages, [])
        self.assertEqual(topic_collection.updated_many[1]["$set"]["lastError"], "queue_backlogged")

    def test_ingestion_lock_blocks_recent_duplicate(self):
        service = object.__new__(NewsScraperService)
        service.queue = FakeQueue()
        lock_collection = FakeLockCollection({"expires_at": datetime.utcnow() + timedelta(hours=1)})

        @contextmanager
        def fake_mongo_collection(name):
            self.assertEqual(name, "news_ingestion_locks")
            yield lock_collection

        payload = {
            "canonical_link": "https://example.com/news",
            "url": "https://example.com/news",
            "title": "News",
        }
        with patch("services.news_scraper.service.mongo_collection", fake_mongo_collection):
            self.assertEqual(service.publish_raw_payload(payload), 0)

        self.assertFalse(lock_collection.updated)
        self.assertEqual(service.queue.messages, [])

    def test_content_processing_marks_existing_news_as_duplicate_completed(self):
        service = object.__new__(ContentProcessingService)
        service.raw_news_repo = FakeRawRepo()
        service.status_tracker = FakeStatusTracker()
        payload = {
            "news_id": "raw-1",
            "title": "Existing",
            "url": "https://example.com/existing",
        }

        with patch.object(ContentProcessingService, "_find_existing_news", return_value={"_id": "news-1"}):
            result = service.process_news(payload)

        self.assertEqual(result["status"], "duplicate_completed")
        self.assertEqual(service.raw_news_repo.docs[0]["processing_status"], "duplicate_completed")
        self.assertEqual(service.raw_news_repo.docs[0]["duplicate_news_id"], "news-1")

    def test_repair_script_cleanup_query_preserves_user_push_and_recent(self):
        script_path = Path(__file__).resolve().parents[1] / "scripts" / "repair-news-pipeline.py"
        spec = importlib.util.spec_from_file_location("repair_news_pipeline", script_path)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)

        cutoff = datetime(2026, 5, 11, 0, 0, 0)
        query = module.droppable_query(cutoff)

        self.assertIn("completed", query["processing_status"]["$nin"])
        self.assertIn("dropped", query["processing_status"]["$nin"])
        self.assertIn({"created_at": {"$lt": cutoff}}, query["$and"][2]["$or"])
        self.assertIn({"push_batch_id": {"$in": ["", None]}}, query["$and"][0]["$or"])
        self.assertIn({"user_id": {"$in": ["", None]}}, query["$and"][1]["$or"])


if __name__ == "__main__":
    unittest.main()
