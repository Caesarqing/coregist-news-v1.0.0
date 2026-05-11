from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pika
from pymongo import MongoClient

from services.shared.python.queue import QUEUE_KEYWORD_SEARCH, QUEUE_NEWS_CRAWL_TRIGGER
from services.shared.python.settings import settings


def queue_snapshot() -> list[dict]:
    connection = pika.BlockingConnection(pika.URLParameters(settings.rabbitmq_url))
    try:
        channel = connection.channel()
        rows = []
        for queue_name in (QUEUE_NEWS_CRAWL_TRIGGER, QUEUE_KEYWORD_SEARCH):
            declared = channel.queue_declare(queue=queue_name, durable=True, passive=True)
            rows.append({
                "queue": queue_name,
                "messages": declared.method.message_count,
                "consumers": declared.method.consumer_count,
                "healthy": declared.method.consumer_count > 0,
            })
        return rows
    finally:
        connection.close()


def batch_snapshot() -> list[dict]:
    client = MongoClient(settings.mongodb_uri)
    try:
        db = client[settings.mongodb_db_name]
        cutoff = datetime.utcnow() - timedelta(hours=24)
        rows = []
        for batch in db["push_batches"].find({"createdAt": {"$gte": cutoff}}, sort=[("createdAt", -1)], limit=10):
            rows.append({
                "batchId": batch.get("batchId"),
                "status": batch.get("status"),
                "keywords": batch.get("keywords", []),
                "pushCount": batch.get("pushCount"),
                "matchedCount": len([item for item in batch.get("matchedNewsIds", []) if item]),
                "hasNotification": bool(batch.get("notificationId")),
                "notificationQueued": bool(batch.get("notificationQueuedAt")),
                "lastError": batch.get("lastError", ""),
                "createdAt": batch.get("createdAt"),
                "updatedAt": batch.get("updatedAt"),
            })
        return rows
    finally:
        client.close()


def rss_health_snapshot() -> dict:
    client = MongoClient(settings.mongodb_uri)
    try:
        db = client[settings.mongodb_db_name]
        state = db[settings.rss_rotation_state_collection].find_one({"_id": "default"}) or {}
        sources = state.get("sources") or {}
        domains = state.get("domains") or {}
        unhealthy = []
        for _key, item in sources.items():
            if not isinstance(item, dict):
                continue
            if item.get("disabled_by_health") or item.get("quarantine_until") or item.get("error_count"):
                unhealthy.append({
                    "sourceId": item.get("source_id"),
                    "lastErrorType": item.get("last_error_type", ""),
                    "errorCount": item.get("error_count", 0),
                    "consecutiveFailures": item.get("consecutive_failures", 0),
                    "quarantineUntil": item.get("quarantine_until"),
                    "disabledByHealth": bool(item.get("disabled_by_health")),
                    "lastError": item.get("last_error", ""),
                })
        unhealthy.sort(
            key=lambda item: (
                not item["disabledByHealth"],
                str(item.get("quarantineUntil") or ""),
                -int(item.get("consecutiveFailures") or 0),
            )
        )
        quarantined_domains = []
        for _key, item in domains.items():
            if isinstance(item, dict) and item.get("quarantine_until"):
                quarantined_domains.append({
                    "hostname": item.get("hostname"),
                    "lastErrorType": item.get("last_error_type", ""),
                    "quarantineUntil": item.get("quarantine_until"),
                })
        return {
            "cursor": state.get("cursor", 0),
            "unhealthySources": unhealthy[:20],
            "quarantinedDomains": quarantined_domains[:20],
        }
    finally:
        client.close()


if __name__ == "__main__":
    print(json.dumps({
        "queues": queue_snapshot(),
        "recentPushBatches": batch_snapshot(),
        "rssHealth": rss_health_snapshot(),
    }, ensure_ascii=False, default=str, indent=2))
