from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[3] / ".env", override=True)


def bool_from_env(name: str, fallback: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return fallback
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def timezone_from_env(name: str, fallback: str) -> str:
    value = (os.getenv(name) or fallback).strip() or fallback
    try:
        ZoneInfo(value)
        return value
    except ZoneInfoNotFoundError:
        return fallback


def csv_from_env(name: str, fallback: str = "") -> tuple[str, ...]:
    raw = os.getenv(name, fallback)
    return tuple(item.strip().lower() for item in raw.split(",") if item.strip())


@dataclass(slots=True)
class ServiceSettings:
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/coregistnews")
    mongodb_db_name: str = os.getenv("MONGODB_DB_NAME", "coregistnews")
    rabbitmq_url: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
    search_default_query: str = os.getenv("SEARCH_DEFAULT_QUERY", "AI Agent 最新进展")
    scheduler_default_query: str = os.getenv(
        "SCHEDULER_DEFAULT_QUERY",
        os.getenv("SEARCH_DEFAULT_QUERY", "AI Agent 最新进展"),
    )
    scheduler_interval_minutes: int = int(os.getenv("SCHEDULER_INTERVAL_MINUTES", "30"))
    rss_max_items_per_feed: int = int(os.getenv("RSS_MAX_ITEMS_PER_FEED", "20"))
    rss_max_items_per_feed_hard_limit: int = int(os.getenv("RSS_MAX_ITEMS_PER_FEED_HARD_LIMIT", "50"))
    rss_source_batch_size: int = int(os.getenv("RSS_SOURCE_BATCH_SIZE", "8"))
    rss_source_min_interval_seconds: int = int(os.getenv("RSS_SOURCE_MIN_INTERVAL_SECONDS", "900"))
    rss_domain_min_interval_seconds: int = int(os.getenv("RSS_DOMAIN_MIN_INTERVAL_SECONDS", "300"))
    rss_source_error_backoff_seconds: int = int(os.getenv("RSS_SOURCE_ERROR_BACKOFF_SECONDS", "1800"))
    rss_rotation_state_collection: str = os.getenv("RSS_ROTATION_STATE_COLLECTION", "rss_crawl_state")
    rss_verify_ssl: bool = bool_from_env("RSS_VERIFY_SSL", True)
    rss_allow_insecure_hosts: tuple[str, ...] = csv_from_env("RSS_ALLOW_INSECURE_HOSTS", "")
    rss_request_timeout_seconds: int = int(os.getenv("RSS_REQUEST_TIMEOUT_SECONDS", "10"))
    rss_feed_timeout_ms: int = int(os.getenv("RSS_FEED_TIMEOUT_MS", "8000"))
    rss_browser_timeout_ms: int = int(os.getenv("RSS_BROWSER_TIMEOUT_MS", "12000"))
    rss_timeout_backoff_seconds: int = int(os.getenv("RSS_TIMEOUT_BACKOFF_SECONDS", "1800"))
    rss_browser_timeout_backoff_seconds: int = int(os.getenv("RSS_BROWSER_TIMEOUT_BACKOFF_SECONDS", "3600"))
    rss_http_limited_backoff_seconds: int = int(os.getenv("RSS_HTTP_LIMITED_BACKOFF_SECONDS", "21600"))
    rss_timeout_quarantine_threshold: int = int(os.getenv("RSS_TIMEOUT_QUARANTINE_THRESHOLD", "5"))
    rss_http_limited_quarantine_threshold: int = int(os.getenv("RSS_HTTP_LIMITED_QUARANTINE_THRESHOLD", "3"))
    rss_timeout_quarantine_seconds: int = int(os.getenv("RSS_TIMEOUT_QUARANTINE_SECONDS", "21600"))
    rss_http_limited_quarantine_seconds: int = int(os.getenv("RSS_HTTP_LIMITED_QUARANTINE_SECONDS", "86400"))
    rss_quarantine_repeats_to_disable: int = int(os.getenv("RSS_QUARANTINE_REPEATS_TO_DISABLE", "3"))
    rss_disable_after_failures: int = int(os.getenv("RSS_DISABLE_AFTER_FAILURES", "12"))
    llm_provider: str = os.getenv("LLM_PROVIDER", "openai-compatible")
    llm_base_url: str = os.getenv("LLM_BASE_URL", "")
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_model: str = os.getenv("LLM_MODEL", "")
    llm_json_mode: bool = bool_from_env("LLM_JSON_MODE", True)
    llm_token_field: str = os.getenv("LLM_TOKEN_FIELD", "max_tokens")
    llm_top_p: str = os.getenv("LLM_TOP_P", "")
    llm_extra_body_json: str = os.getenv("LLM_EXTRA_BODY_JSON", "")
    llm_timeout_seconds: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "45"))
    rabbitmq_heartbeat_seconds: int = int(os.getenv("RABBITMQ_HEARTBEAT_SECONDS", "300"))
    rabbitmq_blocked_connection_timeout_seconds: int = int(os.getenv("RABBITMQ_BLOCKED_CONNECTION_TIMEOUT_SECONDS", "360"))
    news_raw_queue_max_messages: int = int(os.getenv("NEWS_RAW_QUEUE_MAX_MESSAGES", "5000"))
    ai_tasks_queue_max_messages: int = int(os.getenv("AI_TASKS_QUEUE_MAX_MESSAGES", "1000"))
    rss_skip_when_backlogged: bool = bool_from_env("RSS_SKIP_WHEN_BACKLOGGED", True)
    news_ingestion_lock_hours: int = int(os.getenv("NEWS_INGESTION_LOCK_HOURS", "24"))
    ai_content_model: str = os.getenv("AI_CONTENT_MODEL", llm_provider)
    ai_content_remote_model: str = os.getenv("AI_CONTENT_LLM_MODEL", llm_model)
    ai_content_base_url: str = os.getenv("AI_CONTENT_BASE_URL", llm_base_url)
    ai_content_api_key: str = os.getenv("AI_CONTENT_API_KEY", llm_api_key)
    ai_content_max_tokens: int = int(os.getenv("AI_CONTENT_MAX_TOKENS", "900"))
    ai_content_char_limit: int = int(os.getenv("AI_CONTENT_CHAR_LIMIT", "4500"))
    ai_content_temperature: float = float(os.getenv("AI_CONTENT_TEMPERATURE", "0"))
    ai_content_json_mode: bool = bool_from_env("AI_CONTENT_JSON_MODE", llm_json_mode)
    content_classification_llm_enabled: bool = bool_from_env("CONTENT_CLASSIFICATION_LLM_ENABLED", False)
    ai_review_model: str = os.getenv("AI_REVIEW_MODEL", llm_provider)
    ai_review_remote_model: str = os.getenv("AI_REVIEW_LLM_MODEL", llm_model)
    ai_review_base_url: str = os.getenv("AI_REVIEW_BASE_URL", llm_base_url)
    ai_review_api_key: str = os.getenv("AI_REVIEW_API_KEY", llm_api_key)
    ai_review_max_tokens: int = int(os.getenv("AI_REVIEW_MAX_TOKENS", "1200"))
    ai_review_char_limit: int = int(os.getenv("AI_REVIEW_CHAR_LIMIT", "3500"))
    ai_review_temperature: float = float(os.getenv("AI_REVIEW_TEMPERATURE", "0.1"))
    ai_review_json_mode: bool = bool_from_env("AI_REVIEW_JSON_MODE", llm_json_mode)
    notification_email: str = os.getenv("NOTIFICATION_EMAIL", "user@example.com")
    push_timezone: str = timezone_from_env("PUSH_TIMEZONE", "Asia/Shanghai")
    push_due_window_minutes: int = int(os.getenv("PUSH_DUE_WINDOW_MINUTES", "5"))
    push_existing_news_lookback_hours: int = int(os.getenv("PUSH_EXISTING_NEWS_LOOKBACK_HOURS", "72"))
    push_batch_completion_timeout_minutes: int = int(os.getenv("PUSH_BATCH_COMPLETION_TIMEOUT_MINUTES", "30"))
    push_max_enrichment_per_batch: int = int(os.getenv("PUSH_MAX_ENRICHMENT_PER_BATCH", "20"))
    tracking_default_frequency_minutes: int = int(os.getenv("TRACKING_DEFAULT_FREQUENCY_MINUTES", "30"))
    tracking_min_frequency_minutes: int = int(os.getenv("TRACKING_MIN_FREQUENCY_MINUTES", "15"))
    tracking_default_remaining_count: int = int(os.getenv("TRACKING_DEFAULT_REMAINING_COUNT", "5"))
    tracking_max_remaining_count: int = int(os.getenv("TRACKING_MAX_REMAINING_COUNT", "10"))
    fcm_server_key: str = os.getenv("FCM_SERVER_KEY", "")
    
    # AI worker and retry configuration
    ai_worker_concurrency: int = int(os.getenv("AI_WORKER_CONCURRENCY", "5"))
    retry_max_retries: int = int(os.getenv("RETRY_MAX_RETRIES", "3"))
    retry_base_delay_ms: int = int(os.getenv("RETRY_BASE_DELAY_MS", "60000"))
    retry_max_delay_ms: int = int(os.getenv("RETRY_MAX_DELAY_MS", "1800000"))
    retry_exponential_base: int = int(os.getenv("RETRY_EXPONENTIAL_BASE", "3"))


settings = ServiceSettings()

__all__ = ["ServiceSettings", "settings"]
