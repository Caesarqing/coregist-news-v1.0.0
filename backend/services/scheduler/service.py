from __future__ import annotations

from datetime import datetime, timedelta
import re

from apscheduler.schedulers.blocking import BlockingScheduler
from bson import ObjectId

from services.shared.python.queue import (
    QUEUE_KEYWORD_SEARCH,
    QUEUE_NEWS_CRAWL_TRIGGER,
    QUEUE_NEWS_NOTIFICATIONS,
    QueueClient,
    mongo_collection,
)
from services.shared.python.settings import settings


class SchedulerService:
    def __init__(self) -> None:
        self.scheduler = BlockingScheduler()
        self.queue = QueueClient()

    def trigger_default_crawl(self) -> None:
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
        if not should_complete or batch.get("notificationId"):
            return
        title = "新闻推送已更新"
        summary = f"根据关键词 {', '.join(batch.get('keywords', []))} 为你找到 {len(news_ids)} 条相关新闻。"
        self.queue.publish(QUEUE_NEWS_NOTIFICATIONS, {
            "type": "news_push",
            "user_id": batch.get("userId", ""),
            "title": title,
            "summary": summary,
            "content": summary,
            "news_ids": [str(item) for item in news_ids[:push_count]],
            "push_batch_id": batch.get("batchId", ""),
        })

    def trigger_keyword_searches(self) -> None:
        now = datetime.now()
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
                                "notificationId": "",
                                "searchJobId": "",
                                "createdAt": datetime.utcnow(),
                            },
                            "$set": {
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
                        {"$set": {"matchedNewsIds": current_ids, "updatedAt": datetime.utcnow()}},
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
                                "filters": {"category": [], "source": [], "time_range": ""},
                                "allow_discovery": True,
                                "source_type": "push_settings",
                                "push_batch_id": batch_id,
                                "push_count": push_count,
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
                })
                with mongo_collection("push_batches") as batch_collection:
                    batch_collection.update_one(
                        {"batchId": batch_id},
                        {"$set": {"searchJobId": job_id, "status": "processing", "updatedAt": datetime.utcnow()}},
                    )

        cutoff = datetime.utcnow() - timedelta(minutes=max(1, settings.push_batch_completion_timeout_minutes))
        with mongo_collection("push_batches") as batch_collection:
            stale_batches = list(batch_collection.find({
                "status": {"$in": ["queued", "processing"]},
                "createdAt": {"$lte": cutoff},
                "notificationId": {"$in": ["", None]},
            }))
            for batch in stale_batches:
                batch_collection.update_one({"batchId": batch.get("batchId")}, {"$set": {"status": "completed", "updatedAt": datetime.utcnow()}})
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
        )
        self.scheduler.add_job(
            self.trigger_keyword_searches,
            "cron",
            minute="*",
            id="keyword-search-crawl",
            replace_existing=True,
        )
        self.scheduler.start()


if __name__ == "__main__":
    SchedulerService().start()
