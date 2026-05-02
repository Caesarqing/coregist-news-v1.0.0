from __future__ import annotations

from services.shared.python.agent_runtime import build_default_agent_registry, build_default_skillset
from services.shared.python.queue import QUEUE_NEWS_NOTIFICATIONS, QueueClient
from services.shared.python.settings import settings


class NotificationService:
    def __init__(self) -> None:
        self.registry = build_default_agent_registry()
        self.skillset = build_default_skillset()
        self.queue = QueueClient()
        self.notification_agent = self.registry.get_agent("notification_agent")

    def send(self, payload: dict) -> None:
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
