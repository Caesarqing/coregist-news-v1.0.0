from __future__ import annotations

from datetime import datetime

from apscheduler.schedulers.blocking import BlockingScheduler

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
        })

    @staticmethod
    def _weekday_key(now: datetime) -> str:
        return ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][now.weekday()]

    @staticmethod
    def _is_push_due(push_settings: dict, now: datetime) -> bool:
        current_time = now.strftime("%H:%M")
        push_times = [str(item).strip() for item in push_settings.get("pushTimes", []) if str(item).strip()]
        if current_time not in push_times:
            return False
        if push_settings.get("everyday"):
            return True
        push_days = [str(item).strip().lower() for item in push_settings.get("pushDays", []) if str(item).strip()]
        return SchedulerService._weekday_key(now) in push_days

    def trigger_keyword_searches(self) -> None:
        now = datetime.now()
        due_user_ids: set[str] = set()
        with mongo_collection("user_search_jobs") as job_collection:
            def _create_job_doc(job_id: str, user_id: str, query: str, keywords: list[str], source_type: str) -> None:
                job_collection.update_one(
                    {"job_id": job_id},
                    {
                        "$set": {
                            "status": "queued",
                            "updatedAt": datetime.utcnow(),
                            "triggered_at": datetime.utcnow(),
                            "mode": "ai",
                            "query": query,
                            "keywords": keywords,
                            "filters": {"category": [], "source": [], "time_range": ""},
                            "allow_discovery": True,
                            "source_type": source_type,
                        },
                        "$setOnInsert": {
                            "job_id": job_id,
                            "userId": user_id,
                            "createdAt": datetime.utcnow(),
                        },
                    },
                    upsert=True,
                )
        with mongo_collection("users") as users_collection:
            users = list(users_collection.find(
                {
                    "$or": [
                        {"pushSettings.keywords.0": {"$exists": True}},
                        {"pushSettingsList.0": {"$exists": True}},
                    ],
                },
                {"pushSettings": 1, "pushSettingsList": 1},
            ))

        for user in users:
            user_id = str(user["_id"])
            entries = user.get("pushSettingsList") or []
            if not entries and user.get("pushSettings"):
                entries = [user.get("pushSettings") or {}]
            for index, push_settings in enumerate(entries):
                keywords = [str(item).strip() for item in push_settings.get("keywords", []) if str(item).strip()]
                if not keywords or not self._is_push_due(push_settings, now):
                    continue
                due_user_ids.add(user_id)
                entry_id = str(push_settings.get("_id") or push_settings.get("id") or index)
                job_id = f"scheduled:{user_id}:{entry_id}:{now.strftime('%Y%m%d%H%M')}"
                _create_job_doc(job_id, user_id, " ".join(keywords), keywords, "push_settings")
                self.queue.publish(QUEUE_KEYWORD_SEARCH, {
                    "job_id": job_id,
                    "user_id": user_id,
                    "mode": "ai",
                    "query": " ".join(keywords),
                    "keywords": keywords,
                    "filters": {},
                    "source_type": "push_settings",
                })

        with mongo_collection("trackingtopics") as tracking_collection:
            topics = list(tracking_collection.find(
                {"keywords.0": {"$exists": True}},
                {"userId": 1, "name": 1, "keywords": 1},
            ))
        for topic in topics:
            keywords = [str(item).strip() for item in topic.get("keywords", []) if str(item).strip()]
            topic_user_id = str(topic.get("userId") or "")
            if not keywords or not topic_user_id or topic_user_id not in due_user_ids:
                continue
            job_id = f"tracking:{topic['userId']}:{topic['_id']}:{now.strftime('%Y%m%d%H%M')}"
            _create_job_doc(job_id, topic_user_id, " ".join(keywords), keywords, "tracking_topic")
            self.queue.publish(QUEUE_KEYWORD_SEARCH, {
                "job_id": job_id,
                "user_id": topic_user_id,
                "mode": "ai",
                "query": " ".join(keywords),
                "keywords": keywords,
                "filters": {},
                "source_type": "tracking_topic",
                "topic_name": topic.get("name", ""),
            })

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
