import unittest
from contextlib import contextmanager
from datetime import datetime
from unittest.mock import patch

from bson import ObjectId

from services.news_scraper.service import NewsScraperService


class FakeQueue:
    def __init__(self):
        self.messages = []

    def publish(self, queue_name, payload):
        self.messages.append((queue_name, payload))


class FakePushBatchCollection:
    def __init__(self, doc):
        self.doc = doc

    def find_one(self, *_args, **_kwargs):
        return self.doc.copy()

    def update_one(self, _query, update, **_kwargs):
        if "$addToSet" in update:
            for key, value in update["$addToSet"].items():
                current = self.doc.setdefault(key, [])
                if value not in current:
                    current.append(value)
        if "$set" in update:
            self.doc.update(update["$set"])


class FakeUserMapCollection:
    def __init__(self):
        self.updated = None

    def update_one(self, *_args, **_kwargs):
        self.updated = (_args, _kwargs)
        return None

    def count_documents(self, *_args, **_kwargs):
        return 1


class FakeTrackingTopicCollection:
    def __init__(self):
        self.updated = None

    def update_one(self, *_args, **_kwargs):
        self.updated = (_args, _kwargs)
        return None


class PushBatchFlowTest(unittest.TestCase):
    def test_remaining_capacity_uses_batch_push_count(self):
        batch = {
            "batchId": "batch-1",
            "pushCount": 5,
            "matchedNewsIds": [ObjectId(), ObjectId()],
        }

        @contextmanager
        def fake_mongo_collection(name):
            self.assertEqual(name, "push_batches")
            yield FakePushBatchCollection(batch)

        service = object.__new__(NewsScraperService)
        with patch("services.news_scraper.service.mongo_collection", fake_mongo_collection):
            self.assertEqual(
                service._remaining_push_capacity({"push_batch_id": "batch-1", "push_count": 5}),
                3,
            )

    def test_existing_news_added_to_batch_can_queue_notification(self):
        news_id = ObjectId()
        batch = {
            "batchId": "batch-1",
            "userId": "user-1",
            "keywords": ["AI"],
            "pushCount": 1,
            "matchedNewsIds": [],
            "notificationId": "",
            "notificationQueuedAt": None,
            "createdAt": datetime.utcnow(),
        }
        push_batch_collection = FakePushBatchCollection(batch)

        @contextmanager
        def fake_mongo_collection(name):
            if name == "push_batches":
                yield push_batch_collection
            else:
                yield FakeUserMapCollection()

        service = object.__new__(NewsScraperService)
        service.queue = FakeQueue()
        with patch("services.news_scraper.service.mongo_collection", fake_mongo_collection):
            service._add_news_to_push_batch(
                batch_id="batch-1",
                news_object_id=news_id,
                user_id="user-1",
                search_job_id="job-1",
                query="AI",
                keywords=["AI"],
            )

        self.assertEqual(batch["matchedNewsIds"], [news_id])
        self.assertEqual(batch["matchedCount"], 1)
        self.assertEqual(batch["status"], "ready")
        self.assertTrue(batch["notificationQueuedAt"])
        self.assertEqual(len(service.queue.messages), 1)
        self.assertEqual(service.queue.messages[0][1]["news_ids"], [str(news_id)])

    def test_tracking_news_map_writes_topic_id_and_syncs_topic(self):
        news_id = ObjectId()
        topic_id = ObjectId()
        user_map_collection = FakeUserMapCollection()
        topic_collection = FakeTrackingTopicCollection()

        @contextmanager
        def fake_mongo_collection(name):
            if name == "user_news_maps":
                yield user_map_collection
            elif name == "trackingtopics":
                yield topic_collection
            else:
                raise AssertionError(name)

        service = object.__new__(NewsScraperService)
        with patch("services.news_scraper.service.mongo_collection", fake_mongo_collection):
            service._upsert_user_news_map(
                user_id="user-1",
                news_object_id=news_id,
                search_job_id="job-1",
                query="OpenAI",
                keywords=["OpenAI"],
                origin="tracking",
                tracking_topic_id=str(topic_id),
            )

        update = user_map_collection.updated[0][1]
        self.assertEqual(update["$set"]["tracking_topic_id"], str(topic_id))
        self.assertEqual(update["$set"]["origin"], "tracking")
        topic_update = topic_collection.updated[0][1]
        self.assertEqual(topic_update["$set"]["matchedCount"], 1)
        self.assertEqual(topic_update["$set"]["lastStatus"], "updated")


if __name__ == "__main__":
    unittest.main()
