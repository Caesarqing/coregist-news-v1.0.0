from __future__ import annotations

import json
from contextlib import contextmanager
from typing import Any, Callable, Optional

import pika

from services.shared.python.settings import settings


QUEUE_NEWS_CRAWL_TRIGGER = "news_crawl_trigger_queue"
QUEUE_KEYWORD_SEARCH = "keyword_search_queue"
QUEUE_NEWS_RAW = "news_raw_queue"
QUEUE_NEWS_PROCESSED = "news_processed_queue"
QUEUE_NEWS_READY = "news_ready_queue"
QUEUE_AI_TASKS = "ai_tasks_queue"
QUEUE_NEWS_SUMMARIZED = "news_summarized_queue"
QUEUE_NEWS_BIAS = "news_bias_detected_queue"
QUEUE_NEWS_EVALUATED = "news_evaluated_queue"
QUEUE_NEWS_FINAL = "news_final_queue"
QUEUE_NEWS_NOTIFICATIONS = "news_notifications_queue"


class QueueClient:
    def __init__(self, rabbitmq_url: str | None = None) -> None:
        self.rabbitmq_url = rabbitmq_url or settings.rabbitmq_url
        self._connection: Optional[pika.BlockingConnection] = None
        self._channel = None

    def connect(self):
        if self._connection and self._connection.is_open:
            return self._channel
        parameters = pika.URLParameters(self.rabbitmq_url)
        self._connection = pika.BlockingConnection(parameters)
        self._channel = self._connection.channel()
        for queue_name in (
            QUEUE_NEWS_CRAWL_TRIGGER,
            QUEUE_KEYWORD_SEARCH,
            QUEUE_NEWS_RAW,
            QUEUE_NEWS_PROCESSED,
            QUEUE_NEWS_READY,
            QUEUE_AI_TASKS,
            QUEUE_NEWS_SUMMARIZED,
            QUEUE_NEWS_BIAS,
            QUEUE_NEWS_EVALUATED,
            QUEUE_NEWS_FINAL,
            QUEUE_NEWS_NOTIFICATIONS,
        ):
            self._channel.queue_declare(queue=queue_name, durable=True)
        return self._channel

    def publish(self, queue_name: str, payload: dict[str, Any]) -> None:
        parameters = pika.URLParameters(self.rabbitmq_url)
        connection = pika.BlockingConnection(parameters)
        try:
            channel = connection.channel()
            channel.queue_declare(queue=queue_name, durable=True)
            channel.basic_publish(
                exchange="",
                routing_key=queue_name,
                body=json.dumps(payload, ensure_ascii=False, default=str),
                properties=pika.BasicProperties(delivery_mode=2),
            )
        finally:
            if connection.is_open:
                connection.close()

    def consume(self, queue_name: str, callback: Callable[[dict[str, Any]], None]) -> None:
        channel = self.connect()

        def _wrapped(ch, method, _properties, body: bytes) -> None:
            try:
                data = json.loads(body.decode("utf-8"))
                callback(data)
                ch.basic_ack(delivery_tag=method.delivery_tag)
            except Exception:
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                raise

        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=queue_name, on_message_callback=_wrapped, auto_ack=False)
        channel.start_consuming()

    def consume_many(self, queue_callbacks: dict[str, Callable[[dict[str, Any]], None]]) -> None:
        channel = self.connect()

        for queue_name, callback in queue_callbacks.items():
            def _wrapped(ch, method, _properties, body: bytes, *, _callback=callback) -> None:
                try:
                    data = json.loads(body.decode("utf-8"))
                    _callback(data)
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception:
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                    raise

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=queue_name, on_message_callback=_wrapped, auto_ack=False)

        channel.start_consuming()

    def close(self) -> None:
        if self._connection and self._connection.is_open:
            self._connection.close()


@contextmanager
def mongo_collection(collection_name: str):
    from pymongo import MongoClient

    client = MongoClient(settings.mongodb_uri)
    try:
        yield client[settings.mongodb_db_name][collection_name]
    finally:
        client.close()


__all__ = [
    "QUEUE_NEWS_BIAS",
    "QUEUE_NEWS_CRAWL_TRIGGER",
    "QUEUE_KEYWORD_SEARCH",
    "QUEUE_NEWS_EVALUATED",
    "QUEUE_NEWS_FINAL",
    "QUEUE_NEWS_NOTIFICATIONS",
    "QUEUE_NEWS_PROCESSED",
    "QUEUE_NEWS_RAW",
    "QUEUE_NEWS_READY",
    "QUEUE_AI_TASKS",
    "QUEUE_NEWS_SUMMARIZED",
    "QueueClient",
    "mongo_collection",
]
