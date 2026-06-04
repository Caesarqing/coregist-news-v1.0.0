from __future__ import annotations

from datetime import datetime, timedelta
import re
from zoneinfo import ZoneInfo

from apscheduler.schedulers.blocking import BlockingScheduler
from bson import ObjectId
import pika

from services.shared.python.queue import (
    QUEUE_AI_TASKS,
    QUEUE_KEYWORD_SEARCH,
    QUEUE_NEWS_CRAWL_TRIGGER,
    QUEUE_NEWS_NOTIFICATIONS,
    QUEUE_NEWS_RAW,
    QueueClient,
    mongo_collection,
)
from services.shared.python.settings import settings


class SchedulerService:
    def __init__(self) -> None:
        self.scheduler = BlockingScheduler()
        self.queue = QueueClient()

    @staticmethod
    def _queue_message_count(queue_name: str) -> int:
        connection = pika.BlockingConnection(pika.URLParameters(settings.rabbitmq_url))
        try:
            channel = connection.channel()
            declared = channel.queue_declare(queue=queue_name, durable=True, passive=True)
            return int(declared.method.message_count)
        finally:
            connection.close()

    @classmethod
    def rss_backlog_status(cls) -> dict:
        raw_messages = cls._queue_message_count(QUEUE_NEWS_RAW)
        ai_messages = cls._queue_message_count(QUEUE_AI_TASKS)
        return {
            "raw_messages": raw_messages,
            "ai_messages": ai_messages,
            "raw_limit": settings.news_raw_queue_max_messages,
            "ai_limit": settings.ai_tasks_queue_max_messages,
            "backlogged": (
                raw_messages >= settings.news_raw_queue_max_messages
                or ai_messages >= settings.ai_tasks_queue_max_messages
            ),
        }

    def trigger_default_crawl(self) -> None:
        if settings.rss_skip_when_backlogged:
            try:
                backlog = self.rss_backlog_status()
            except Exception as exc:
                backlog = {"backlogged": False, "error": str(exc)}
            if backlog.get("backlogged"):
                print(f"rss crawl skipped because queues are backlogged: {backlog}")
                return
        self.queue.publish(QUEUE_NEWS_CRAWL_TRIGGER, {
            "mode": "rss",
            "publish_raw": True,
            "limit_per_feed": settings.rss_max_items_per_feed,
            "source_limit": settings.rss_source_batch_size,
            "rotate_sources": True,
        })

    @staticmethod
    def _weekday_key(now: datetime) -> str:
        return ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][now.weekday()]

    @staticmethod
    def _scheduled_time_for_push(push_settings: dict, now: datetime, *, window_minutes: int | None = None) -> datetime | None:
        window = max(0, int(settings.push_due_window_minutes if window_minutes is None else window_minutes))
        push_times = [str(item).strip() for item in push_settings.get("pushTimes", []) if str(item).strip()]
        push_days = [str(item).strip().lower() for item in push_settings.get("pushDays", []) if str(item).strip()]
        for push_time in push_times:
            try:
                hour, minute = [int(part) for part in push_time.split(":", 1)]
                scheduled = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            except Exception:
                continue
            if scheduled > now or now - scheduled > timedelta(minutes=window):
                continue
            if push_settings.get("everyday") or SchedulerService._weekday_key(scheduled) in push_days:
                return scheduled
        return None

    @staticmethod
    def _is_push_due(push_settings: dict, now: datetime) -> bool:
        return SchedulerService._scheduled_time_for_push(push_settings, now) is not None

    @staticmethod
    def _normalize_push_count(value) -> int:
        try:
            parsed = int(value)
        except Exception:
            parsed = 5
        return max(1, min(parsed, 20))

    @staticmethod
    def _normalize_tracking_frequency(value) -> int:
        try:
            parsed = int(value)
        except Exception:
            parsed = settings.tracking_default_frequency_minutes
        return max(settings.tracking_min_frequency_minutes, min(parsed, 1440))

    @staticmethod
    def _normalize_tracking_remaining_count(value=None) -> int:
        try:
            parsed = int(value)
        except Exception:
            parsed = settings.tracking_default_remaining_count
        return max(1, min(parsed, settings.tracking_max_remaining_count))

    def trigger_tracking_topics(self) -> None:
        now = datetime.utcnow()
        backlogged = False
        if settings.rss_skip_when_backlogged:
            try:
                backlogged = bool(self.rss_backlog_status().get("backlogged"))
            except Exception as exc:
                print(f"tracking backlog check failed: {exc}")
                backlogged = False

        due_query = {
            "enabled": {"$ne": False},
            "$or": [
                {"nextRunAt": {"$lte": now}},
                {"nextRunAt": {"$in": [None, ""]}},
            ],
        }
        with mongo_collection("trackingtopics") as topic_collection:
            topics = list(topic_collection.find(due_query, limit=50))

        if not topics:
            return

        if backlogged:
            retry_at = now + timedelta(minutes=max(5, settings.tracking_min_frequency_minutes))
            with mongo_collection("trackingtopics") as topic_collection:
                topic_collection.update_many(
                    {"_id": {"$in": [topic["_id"] for topic in topics]}},
                    {
                        "$set": {
                            "lastError": "queue_backlogged",
                            "lastStatus": "backlogged",
                            "nextRunAt": retry_at,
                            "updatedAt": now,
                        },
                    },
                )
            print(f"tracking topics skipped because queues are backlogged: {len(topics)}")
            return

        for topic in topics:
            user_id = str(topic.get("userId") or "")
            topic_id = str(topic.get("_id") or "")
            keywords = [str(item).strip() for item in topic.get("keywords", []) if str(item).strip()]
            query = " ".join(keywords) or str(topic.get("name") or "").strip()
            if not user_id or not topic_id or not query:
                continue

            frequency = self._normalize_tracking_frequency(topic.get("frequencyMinutes"))
            remaining_count = self._normalize_tracking_remaining_count()
            run_key = now.strftime("%Y%m%d%H%M")
            job_id = f"tracking:{user_id}:{topic_id}:{run_key}"
            next_run_at = now + timedelta(minutes=frequency)

            with mongo_collection("user_search_jobs") as job_collection:
                result = job_collection.update_one(
                    {"job_id": job_id},
                    {
                        "$set": {
                            "status": "queued",
                            "updatedAt": now,
                            "triggered_at": now,
                            "mode": "ai",
                            "query": query,
                            "keywords": keywords,
                            "filters": {"category": [], "source": [], "time_range": ""},
                            "allow_discovery": True,
                            "source_type": "tracking_topic",
                            "tracking_topic_id": topic_id,
                            "topic_name": topic.get("name", ""),
                            "remaining_count": remaining_count,
                        },
                        "$setOnInsert": {
                            "job_id": job_id,
                            "userId": user_id,
                            "createdAt": now,
                        },
                    },
                    upsert=True,
                )
            if not result.upserted_id and topic.get("lastJobId") == job_id:
                continue

            self.queue.publish(QUEUE_KEYWORD_SEARCH, {
                "job_id": job_id,
                "user_id": user_id,
                "mode": "ai",
                "query": query,
                "keywords": keywords,
                "filters": {},
                "source_type": "tracking_topic",
                "tracking_topic_id": topic_id,
                "topic_name": topic.get("name", ""),
                "remaining_count": remaining_count,
            })
            with mongo_collection("trackingtopics") as topic_collection:
                topic_collection.update_one(
                    {"_id": topic["_id"]},
                    {
                        "$set": {
                            "lastJobId": job_id,
                            "lastRunAt": now,
                            "nextRunAt": next_run_at,
                            "lastError": "",
                            "lastStatus": "processing",
                            "updatedAt": now,
                        },
                    },
                )

    @staticmethod
    def _news_keyword_query(keywords: list[str], since: datetime) -> dict:
        escaped = [re.escape(keyword) for keyword in keywords if keyword]
        if not escaped:
            return {"_id": {"$exists": False}}
        regex = re.compile("|".join(escaped), re.IGNORECASE)
        return {
            "$and": [
                {
                    "$or": [
                        {"postedAt": {"$gte": since}},
                        {"crawledAt": {"$gte": since}},
                        {"processed_at": {"$gte": since}},
                    ],
                },
                {
                    "$or": [
                        {"search_text_zh": regex},
                        {"search_text_en": regex},
                        {"title_zh": regex},
                        {"title_en": regex},
                        {"summary_zh": regex},
                        {"summary_en": regex},
                        {"topic_tags": regex},
                        {"entity_tags": regex},
                        {"tags_zh": regex},
                        {"tags_en": regex},
                    ],
                },
            ],
        }

    def _match_existing_news(self, *, user_id: str, keywords: list[str], push_count: int, batch_id: str) -> list[ObjectId]:
        since = datetime.utcnow() - timedelta(hours=max(1, settings.push_existing_news_lookback_hours))
        with mongo_collection("news") as news_collection:
            docs = list(news_collection.find(
                self._news_keyword_query(keywords, since),
                {"_id": 1},
                sort=[("postedAt", -1), ("crawledAt", -1), ("processed_at", -1)],
                limit=push_count,
            ))
        news_ids = [doc["_id"] for doc in docs]
        if news_ids:
            with mongo_collection("user_news_maps") as map_collection:
                for news_id in news_ids:
                    map_collection.update_one(
                        {"userId": user_id, "newsId": news_id},
                        {
                            "$set": {
                                "query": " ".join(keywords),
                                "keywords": keywords,
                                "origin": "search",
                                "visible": True,
                                "push_batch_id": batch_id,
                                "updatedAt": datetime.utcnow(),
                            },
                            "$setOnInsert": {
                                "userId": user_id,
                                "newsId": news_id,
                                "createdAt": datetime.utcnow(),
                            },
                        },
                        upsert=True,
                    )
        return news_ids

    def _publish_push_notification_if_ready(self, *, batch: dict, force: bool = False) -> None:
        news_ids = [item for item in batch.get("matchedNewsIds", []) if item]
        push_count = self._normalize_push_count(batch.get("pushCount"))
        should_complete = force or len(news_ids) >= push_count
        if not should_complete or batch.get("notificationId") or batch.get("notificationQueuedAt"):
            return
        selected_ids = news_ids[:push_count]
        title = "新闻推送已更新"
        if selected_ids:
            summary = f"根据关键词 {', '.join(batch.get('keywords', []))} 为你找到 {len(selected_ids)} 条相关新闻。"
        else:
            summary = f"根据关键词 {', '.join(batch.get('keywords', []))} 暂未找到符合条件的相关新闻。"
        status = "ready" if len(selected_ids) >= push_count else ("partial" if selected_ids else "failed")
        notification_payload = {
            "type": "news_push",
            "user_id": batch.get("userId", ""),
            "title": title,
            "summary": summary,
            "content": summary,
            "news_ids": [str(item) for item in selected_ids],
            "push_batch_id": batch.get("batchId", ""),
        }
        try:
            self.queue.publish(QUEUE_NEWS_NOTIFICATIONS, notification_payload)
        except Exception as exc:
            with mongo_collection("push_batches") as batch_collection:
                batch_collection.update_one(
                    {"batchId": batch.get("batchId", "")},
                    {"$set": {"status": status, "lastError": str(exc)[:500], "updatedAt": datetime.utcnow()}},
                )
            return
        with mongo_collection("push_batches") as batch_collection:
            batch_collection.update_one(
                {"batchId": batch.get("batchId", "")},
                {
                    "$set": {
                        "status": status,
                        "lastError": "",
                        "notificationQueuedAt": datetime.utcnow(),
                        "updatedAt": datetime.utcnow(),
                    },
                },
            )

    @staticmethod
    def _push_now() -> datetime:
        return datetime.now(ZoneInfo(settings.push_timezone)).replace(tzinfo=None)

    def trigger_keyword_searches(self) -> None:
        now = self._push_now()
        with mongo_collection("users") as users_collection:
            users = list(users_collection.find(
                {
                    "pushSettingsList.0": {"$exists": True},
                },
                {"pushSettingsList": 1},
            ))

        for user in users:
            user_id = str(user["_id"])
            entries = user.get("pushSettingsList") or []
            for index, push_settings in enumerate(entries):
                keywords = [str(item).strip() for item in push_settings.get("keywords", []) if str(item).strip()]
                scheduled_for = self._scheduled_time_for_push(push_settings, now)
                if not keywords or not scheduled_for:
                    continue
                entry_id = str(push_settings.get("_id") or push_settings.get("id") or index)
                push_count = self._normalize_push_count(push_settings.get("pushCount"))
                batch_id = f"push:{user_id}:{entry_id}:{scheduled_for.strftime('%Y%m%d%H%M')}"
                matched_news_ids = self._match_existing_news(
                    user_id=user_id,
                    keywords=keywords,
                    push_count=push_count,
                    batch_id=batch_id,
                )
                with mongo_collection("push_batches") as batch_collection:
                    batch_result = batch_collection.update_one(
                        {"batchId": batch_id},
                        {
                            "$setOnInsert": {
                                "batchId": batch_id,
                                "userId": user_id,
                                "pushSettingId": entry_id,
                                "keywords": keywords,
                                "pushCount": push_count,
                                "scheduledFor": scheduled_for,
                                "status": "queued",
                                "matchedNewsIds": matched_news_ids,
                                "matchedCount": len(matched_news_ids),
                                "notificationId": "",
                                "notificationQueuedAt": None,
                                "searchJobId": "",
                                "lastError": "",
                                "createdAt": datetime.utcnow(),
                            },
                            "$set": {
                                "lastRunAt": datetime.utcnow(),
                                "updatedAt": datetime.utcnow(),
                            },
                        },
                        upsert=True,
                    )
                    batch = batch_collection.find_one({"batchId": batch_id}) or {}
                current_ids = list(dict.fromkeys([*(batch.get("matchedNewsIds") or []), *matched_news_ids]))
                with mongo_collection("push_batches") as batch_collection:
                    batch_collection.update_one(
                        {"batchId": batch_id},
                        {"$set": {"matchedNewsIds": current_ids, "matchedCount": len(current_ids), "updatedAt": datetime.utcnow()}},
                    )
                    batch = batch_collection.find_one({"batchId": batch_id}) or {}

                if len(current_ids) >= push_count:
                    with mongo_collection("push_batches") as batch_collection:
                        batch_collection.update_one({"batchId": batch_id}, {"$set": {"status": "ready", "updatedAt": datetime.utcnow()}})
                    batch["matchedNewsIds"] = current_ids
                    self._publish_push_notification_if_ready(batch=batch)
                    continue

                if not batch_result.upserted_id and batch.get("searchJobId"):
                    continue

                job_id = f"scheduled:{user_id}:{entry_id}:{scheduled_for.strftime('%Y%m%d%H%M')}"
                with mongo_collection("user_search_jobs") as job_collection:
                    job_collection.update_one(
                        {"job_id": job_id},
                        {
                            "$set": {
                                "status": "queued",
                                "updatedAt": datetime.utcnow(),
                                "triggered_at": datetime.utcnow(),
                                "mode": "ai",
                                "query": " ".join(keywords),
                                "keywords": keywords,
                                "filters": {
                                    "category": [],
                                    "source": [],
                                    "time_range": "",
                                    "remaining_count": max(0, push_count - len(current_ids)),
                                },
                                "allow_discovery": True,
                                "source_type": "push_settings",
                                "push_batch_id": batch_id,
                                "push_count": push_count,
                                "remaining_count": max(0, push_count - len(current_ids)),
                            },
                            "$setOnInsert": {
                                "job_id": job_id,
                                "userId": user_id,
                                "createdAt": datetime.utcnow(),
                            },
                        },
                        upsert=True,
                    )
                self.queue.publish(QUEUE_KEYWORD_SEARCH, {
                    "job_id": job_id,
                    "user_id": user_id,
                    "mode": "ai",
                    "query": " ".join(keywords),
                    "keywords": keywords,
                    "filters": {},
                    "source_type": "push_settings",
                    "push_batch_id": batch_id,
                    "push_count": push_count,
                    "remaining_count": max(0, push_count - len(current_ids)),
                })
                with mongo_collection("push_batches") as batch_collection:
                    batch_collection.update_one(
                        {"batchId": batch_id},
                        {
                            "$set": {
                                "searchJobId": job_id,
                                "status": "processing",
                                "searchExpectedCount": max(0, push_count - len(current_ids)),
                                "updatedAt": datetime.utcnow(),
                            },
                        },
                    )

        cutoff = datetime.utcnow() - timedelta(minutes=max(1, settings.push_batch_completion_timeout_minutes))
        with mongo_collection("push_batches") as batch_collection:
            stale_batches = list(batch_collection.find({
                "status": {"$in": ["queued", "processing"]},
                "createdAt": {"$lte": cutoff},
                "notificationId": {"$in": ["", None]},
            }))
            for batch in stale_batches:
                news_ids = [item for item in batch.get("matchedNewsIds", []) if item]
                batch_collection.update_one(
                    {"batchId": batch.get("batchId")},
                    {
                        "$set": {
                            "status": "partial" if news_ids else "failed",
                            "timedOutAt": datetime.utcnow(),
                            "updatedAt": datetime.utcnow(),
                        },
                    },
                )
                self._publish_push_notification_if_ready(batch=batch, force=True)

    def monitor_url(self, url: str, interval_seconds: int) -> None:
        def _job() -> None:
            self.queue.publish(QUEUE_NEWS_NOTIFICATIONS, {
                "user_id": "system",
                "content": f"URL 监控检查已执行: {url}",
            })

        self.scheduler.add_job(_job, "interval", seconds=interval_seconds, id=f"url-monitor:{url}", replace_existing=True)

    def start(self) -> None:
        self.scheduler.add_job(
            self.trigger_default_crawl,
            "interval",
            minutes=settings.scheduler_interval_minutes,
            id="default-news-crawl",
            replace_existing=True,
            coalesce=True,
            max_instances=1,
            misfire_grace_time=300,
        )
        self.scheduler.add_job(
            self.trigger_keyword_searches,
            "cron",
            minute="*",
            id="keyword-search-crawl",
            replace_existing=True,
            coalesce=True,
            max_instances=1,
            misfire_grace_time=max(60, settings.push_due_window_minutes * 60),
        )
        self.scheduler.add_job(
            self.trigger_tracking_topics,
            "cron",
            minute="*",
            id="tracking-topic-crawl",
            replace_existing=True,
            coalesce=True,
            max_instances=1,
            misfire_grace_time=300,
        )
        self.scheduler.start()


if __name__ == "__main__":
    SchedulerService().start()
