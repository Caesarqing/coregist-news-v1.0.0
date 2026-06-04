from __future__ import annotations

import argparse
from datetime import datetime, timedelta
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pymongo import MongoClient

from services.shared.python.settings import settings


def repair_stuck_push_batches(*, apply: bool, hours: int, limit: int) -> int:
    cutoff = datetime.utcnow() - timedelta(hours=max(1, hours))
    query = {
        "createdAt": {"$gte": cutoff},
        "notificationQueuedAt": {"$ne": None},
        "notificationId": {"$in": ["", None]},
    }
    client = MongoClient(settings.mongodb_uri)
    try:
        db = client[settings.mongodb_db_name]
        rows = list(db["push_batches"].find(
            query,
            {"_id": 1, "batchId": 1, "status": 1, "keywords": 1, "notificationQueuedAt": 1, "updatedAt": 1},
            sort=[("updatedAt", -1)],
            limit=max(1, limit),
        ))
        for row in rows:
            print({
                "batchId": row.get("batchId"),
                "status": row.get("status"),
                "keywords": row.get("keywords", []),
                "notificationQueuedAt": row.get("notificationQueuedAt"),
                "updatedAt": row.get("updatedAt"),
            })
        if not apply or not rows:
            return len(rows)
        result = db["push_batches"].update_many(
            {"_id": {"$in": [row["_id"] for row in rows]}},
            {
                "$set": {
                    "status": "processing",
                    "lastError": "notification queue marker reset for retry",
                    "updatedAt": datetime.utcnow(),
                },
                "$unset": {"notificationQueuedAt": ""},
            },
        )
        print({"matched": result.matched_count, "modified": result.modified_count})
        return result.modified_count
    finally:
        client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--hours", type=int, default=72)
    parser.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()
    count = repair_stuck_push_batches(apply=args.apply, hours=args.hours, limit=args.limit)
    print({"apply": args.apply, "count": count})
