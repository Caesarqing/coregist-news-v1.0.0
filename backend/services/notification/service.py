from __future__ import annotations

from datetime import datetime

import requests
from bson import ObjectId

from services.shared.python.agent_runtime import build_default_agent_registry, build_default_skillset
from services.shared.python.queue import QUEUE_NEWS_NOTIFICATIONS, QueueClient, mongo_collection
from services.shared.python.settings import settings


class NotificationService:
    def __init__(self) -> None:
        self.registry = build_default_agent_registry()
        self.skillset = build_default_skillset()
        self.queue = QueueClient()
        self.notification_agent = self.registry.get_agent("notification_agent")

    @staticmethod
    def _coerce_object_ids(values: list) -> list:
        object_ids = []
        for value in values or []:
            try:
                object_ids.append(ObjectId(str(value)))
            except Exception:
                continue
        return object_ids

    def _send_fcm(self, *, user_id: str, title: str, body: str, notification_id: str) -> None:
        if not settings.fcm_server_key:
            return
        with mongo_collection("user_push_tokens") as collection:
            tokens = list(collection.find({"userId": user_id, "enabled": True}, {"token": 1}))
        for token_doc in tokens:
            token = token_doc.get("token")
            if not token:
                continue
            try:
                response = requests.post(
                    "https://fcm.googleapis.com/fcm/send",
                    headers={
                        "Authorization": f"key={settings.fcm_server_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "to": token,
                        "notification": {"title": title, "body": body},
                        "data": {"notificationId": notification_id, "path": "/notifications"},
                    },
                    timeout=8,
                )
                if response.status_code in (400, 404, 410):
                    with mongo_collection("user_push_tokens") as collection:
                        collection.update_one(
                            {"_id": token_doc["_id"]},
                            {"$set": {"enabled": False, "lastError": response.text[:500], "updatedAt": datetime.utcnow()}},
                        )
            except Exception as exc:
                with mongo_collection("user_push_tokens") as collection:
                    collection.update_one(
                        {"_id": token_doc["_id"]},
                        {"$set": {"lastError": str(exc)[:500], "updatedAt": datetime.utcnow()}},
                    )

    def _create_notification(self, payload: dict) -> str:
        user_id = payload.get("user_id", "unknown")
        news_ids = self._coerce_object_ids(payload.get("news_ids", []))
        push_batch_id = payload.get("push_batch_id", "")
        title = payload.get("title") or "CoreGist 新闻通知"
        summary = payload.get("summary") or payload.get("content", "")
        with mongo_collection("notifications") as collection:
            existing = collection.find_one({"pushBatchId": push_batch_id}) if push_batch_id else None
            if existing:
                notification_id = str(existing["_id"])
                collection.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {
                        "title": title,
                        "summary": summary,
                        "newsIds": news_ids,
                        "updatedAt": datetime.utcnow(),
                    }},
                )
            else:
                result = collection.insert_one({
                    "userId": user_id,
                    "type": payload.get("type", "news_push"),
                    "title": title,
                    "summary": summary,
                    "content": payload.get("content", summary),
                    "newsIds": news_ids,
                    "pushBatchId": push_batch_id,
                    "readAt": None,
                    "createdAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow(),
                })
                notification_id = str(result.inserted_id)
        if push_batch_id:
            with mongo_collection("push_batches") as collection:
                collection.update_one(
                    {"batchId": push_batch_id},
                    {"$set": {"notificationId": notification_id, "status": "completed", "updatedAt": datetime.utcnow()}},
                )
        self._send_fcm(user_id=user_id, title=title, body=summary, notification_id=notification_id)
        return notification_id

    def send(self, payload: dict) -> None:
        if payload.get("type") == "news_push" or payload.get("push_batch_id"):
            self._create_notification(payload)
            return
        content = payload.get("content", "")
        prompt = self.notification_agent.prompt_template.format(notification_content=content)
        self.skillset.get_skill("email_sender").execute(
            to=settings.notification_email,
            subject="CoreGist 新闻通知",
            body=prompt,
        )
        self.skillset.get_skill("app_notifier").execute(
            user_id=payload.get("user_id", "unknown"),
            content=content,
        )

    def consume(self) -> None:
        self.queue.consume(QUEUE_NEWS_NOTIFICATIONS, self.send)


if __name__ == "__main__":
    NotificationService().consume()
