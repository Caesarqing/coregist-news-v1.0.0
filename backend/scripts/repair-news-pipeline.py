from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pika
from pymongo import MongoClient

from services.shared.python.queue import (
    ACTIVE_QUEUES,
    LEGACY_QUEUES,
    QUEUE_NEWS_READY,
    QueueClient,
)
from services.shared.python.settings import settings


def utc_now() -> datetime:
    return datetime.utcnow()


def mongo_db():
    client = MongoClient(settings.mongodb_uri)
    return client, client[settings.mongodb_db_name]


def queue_rows(queue_names: tuple[str, ...]) -> list[dict[str, Any]]:
    connection = pika.BlockingConnection(pika.URLParameters(settings.rabbitmq_url))
    try:
        channel = connection.channel()
        rows = []
        for queue_name in queue_names:
            try:
                declared = channel.queue_declare(queue=queue_name, durable=True, passive=True)
                rows.append({
                    "queue": queue_name,
                    "messages": declared.method.message_count,
                    "consumers": declared.method.consumer_count,
                })
            except Exception as exc:
                rows.append({"queue": queue_name, "error": str(exc)})
                if channel.is_closed:
                    channel = connection.channel()
        return rows
    finally:
        connection.close()


def keep_query(cutoff: datetime) -> dict:
    return {
        "$or": [
            {"push_batch_id": {"$nin": ["", None]}},
            {"user_id": {"$nin": ["", None]}},
            {"created_at": {"$gte": cutoff}},
        ]
    }


def droppable_query(cutoff: datetime) -> dict:
    return {
        "processing_status": {"$nin": ["completed", "duplicate_completed", "dropped"]},
        "$and": [
            {"$or": [{"push_batch_id": {"$in": ["", None]}}, {"push_batch_id": {"$exists": False}}]},
            {"$or": [{"user_id": {"$in": ["", None]}}, {"user_id": {"$exists": False}}]},
            {"$or": [{"created_at": {"$lt": cutoff}}, {"created_at": {"$exists": False}}]},
        ],
    }


def stale_processing_query(timeout_cutoff: datetime, recent_cutoff: datetime) -> dict:
    return {
        "processing_status": "processing",
        "updated_at": {"$lte": timeout_cutoff},
        **keep_query(recent_cutoff),
    }


def snapshot(_args) -> dict:
    client, db = mongo_db()
    try:
        raw_status = list(db.raw_news.aggregate([
            {"$group": {"_id": "$processing_status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]))
        latest_news = db.news.find_one(
            {},
            {"title_zh": 1, "title_en": 1, "processed_at": 1, "crawledAt": 1, "postedAt": 1},
            sort=[("processed_at", -1), ("crawledAt", -1), ("postedAt", -1)],
        )
        recent_errors = list(db.raw_news.find(
            {"last_error": {"$nin": ["", None]}},
            {"news_id": 1, "processing_status": 1, "last_error": 1, "updated_at": 1},
            sort=[("updated_at", -1)],
            limit=10,
        ))
        return {
            "queues": {
                "active": queue_rows(ACTIVE_QUEUES),
                "legacy": queue_rows(LEGACY_QUEUES),
            },
            "mongo": {
                "discovery_news": db.discovery_news.count_documents({}),
                "raw_news": db.raw_news.count_documents({}),
                "news": db.news.count_documents({}),
                "notifications": db.notifications.count_documents({}),
                "push_batches": db.push_batches.count_documents({}),
                "raw_status": raw_status,
                "latest_news": latest_news,
                "recent_raw_errors": recent_errors,
            },
            "llm": {
                "provider": settings.llm_provider,
                "base_url_present": bool(settings.llm_base_url),
                "api_key_present": bool(settings.llm_api_key),
                "model": settings.llm_model,
            },
        }
    finally:
        client.close()


def cleanup_backlog(args) -> dict:
    cutoff = utc_now() - timedelta(hours=max(1, args.keep_hours))
    timeout_cutoff = utc_now() - timedelta(minutes=max(1, args.processing_timeout_minutes))
    client, db = mongo_db()
    try:
        drop_query = droppable_query(cutoff)
        stale_query = stale_processing_query(timeout_cutoff, cutoff)
        drop_count = db.raw_news.count_documents(drop_query)
        stale_count = db.raw_news.count_documents(stale_query)
        result = {
            "apply": bool(args.apply),
            "drop_count": drop_count,
            "stale_processing_reset_count": stale_count,
            "keep_hours": args.keep_hours,
            "processing_timeout_minutes": args.processing_timeout_minutes,
        }
        if args.apply:
            db.raw_news.update_many(
                drop_query,
                {
                    "$set": {
                        "processing_status": "dropped",
                        "drop_reason": "backlog_cleanup_old",
                        "dropped_at": utc_now(),
                        "updated_at": utc_now(),
                    }
                },
            )
            db.raw_news.update_many(
                stale_query,
                {
                    "$set": {
                        "processing_status": "ready",
                        "requeue_reason": "stale_processing_reset",
                        "updated_at": utc_now(),
                    }
                },
            )
        return result
    finally:
        client.close()


def purge_legacy_queues(args) -> dict:
    connection = pika.BlockingConnection(pika.URLParameters(settings.rabbitmq_url))
    try:
        channel = connection.channel()
        rows = []
        for queue_name in LEGACY_QUEUES:
            try:
                declared = channel.queue_declare(queue=queue_name, durable=True, passive=True)
                row = {"queue": queue_name, "messages_before": declared.method.message_count, "apply": bool(args.apply)}
                if args.apply:
                    purged = channel.queue_purge(queue=queue_name)
                    row["purged"] = purged.method.message_count
            except Exception as exc:
                row = {"queue": queue_name, "error": str(exc), "apply": bool(args.apply)}
                if channel.is_closed:
                    channel = connection.channel()
            rows.append(row)
        return {"legacyQueues": rows}
    finally:
        connection.close()


def requeue_active(args) -> dict:
    recent_cutoff = utc_now() - timedelta(hours=max(1, args.keep_hours))
    timeout_cutoff = utc_now() - timedelta(minutes=max(1, args.processing_timeout_minutes))
    query = {
        "$and": [
            keep_query(recent_cutoff),
            {
                "$or": [
                    {"processing_status": "ready"},
                    {
                        "processing_status": "processing",
                        "updated_at": {"$lte": timeout_cutoff},
                    },
                ]
            },
        ],
    }
    client, db = mongo_db()
    queued = 0
    try:
        rows = list(db.raw_news.find(
            query,
            {"news_id": 1, "processing_status": 1},
            sort=[("created_at", -1), ("updated_at", -1)],
            limit=max(1, args.limit),
        ))
        result = {"apply": bool(args.apply), "candidate_count": len(rows), "queued": 0}
        if args.apply:
            queue = QueueClient()
            for row in rows:
                news_id = row.get("news_id")
                if not news_id:
                    continue
                db.raw_news.update_one(
                    {"news_id": news_id},
                    {"$set": {"processing_status": "ready", "updated_at": utc_now()}},
                )
                queue.publish(QUEUE_NEWS_READY, {"news_id": news_id})
                queued += 1
            result["queued"] = queued
        return result
    finally:
        client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Repair and inspect the CoreGist news pipeline.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("snapshot")

    cleanup = subparsers.add_parser("cleanup-backlog")
    cleanup.add_argument("--apply", action="store_true")
    cleanup.add_argument("--keep-hours", type=int, default=72)
    cleanup.add_argument("--processing-timeout-minutes", type=int, default=30)

    purge = subparsers.add_parser("purge-legacy-queues")
    purge.add_argument("--apply", action="store_true")

    requeue = subparsers.add_parser("requeue-active")
    requeue.add_argument("--apply", action="store_true")
    requeue.add_argument("--limit", type=int, default=1000)
    requeue.add_argument("--keep-hours", type=int, default=72)
    requeue.add_argument("--processing-timeout-minutes", type=int, default=30)

    args = parser.parse_args()
    if args.command == "snapshot":
        result = snapshot(args)
    elif args.command == "cleanup-backlog":
        result = cleanup_backlog(args)
    elif args.command == "purge-legacy-queues":
        result = purge_legacy_queues(args)
    elif args.command == "requeue-active":
        result = requeue_active(args)
    else:
        raise SystemExit(f"Unsupported command: {args.command}")
    print(json.dumps(result, ensure_ascii=False, default=str, indent=2))


if __name__ == "__main__":
    main()
