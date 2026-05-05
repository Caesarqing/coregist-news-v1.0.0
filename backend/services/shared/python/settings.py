from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[3] / ".env", override=True)


def bool_from_env(name: str, fallback: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return fallback
    return raw.strip().lower() in {"1", "true", "yes", "on"}


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
    llm_provider: str = os.getenv("LLM_PROVIDER", os.getenv("AI_CONTENT_MODEL", "dmax"))
    llm_base_url: str = os.getenv("LLM_BASE_URL", os.getenv("DMAX_BASE_URL", "https://www.dmxapi.cn/v1"))
    llm_api_key: str = os.getenv("LLM_API_KEY", os.getenv("DMAX_API", ""))
    llm_model: str = os.getenv("LLM_MODEL", os.getenv("DMAX_MODEL", os.getenv("DMAX_REMOTE_MODEL", "Qwen3.5-2B-free")))
    llm_json_mode: bool = bool_from_env("LLM_JSON_MODE", True)
    ai_content_model: str = os.getenv("AI_CONTENT_MODEL", os.getenv("LLM_PROVIDER", "dmax"))
    ai_content_remote_model: str = os.getenv("AI_CONTENT_LLM_MODEL", os.getenv("AI_CONTENT_REMOTE_MODEL", os.getenv("LLM_MODEL", os.getenv("DMAX_MODEL", os.getenv("DMAX_REMOTE_MODEL", "Qwen3.5-2B-free")))))
    ai_content_base_url: str = os.getenv("AI_CONTENT_BASE_URL", os.getenv("LLM_BASE_URL", os.getenv("DMAX_BASE_URL", "https://www.dmxapi.cn/v1")))
    ai_content_api_key: str = os.getenv("AI_CONTENT_API_KEY", os.getenv("LLM_API_KEY", os.getenv("DMAX_API", "")))
    ai_content_max_tokens: int = int(os.getenv("AI_CONTENT_MAX_TOKENS", "900"))
    ai_content_char_limit: int = int(os.getenv("AI_CONTENT_CHAR_LIMIT", "4500"))
    ai_content_temperature: float = float(os.getenv("AI_CONTENT_TEMPERATURE", "0"))
    ai_content_json_mode: bool = bool_from_env("AI_CONTENT_JSON_MODE", llm_json_mode)
    ai_review_model: str = os.getenv("AI_REVIEW_MODEL", os.getenv("LLM_PROVIDER", "dmax"))
    ai_review_remote_model: str = os.getenv("AI_REVIEW_LLM_MODEL", os.getenv("AI_REVIEW_REMOTE_MODEL", os.getenv("LLM_MODEL", os.getenv("DMAX_MODEL", os.getenv("DMAX_REMOTE_MODEL", "Qwen3.5-2B-free")))))
    ai_review_base_url: str = os.getenv("AI_REVIEW_BASE_URL", os.getenv("LLM_BASE_URL", os.getenv("DMAX_BASE_URL", "https://www.dmxapi.cn/v1")))
    ai_review_api_key: str = os.getenv("AI_REVIEW_API_KEY", os.getenv("LLM_API_KEY", os.getenv("DMAX_API", "")))
    ai_review_max_tokens: int = int(os.getenv("AI_REVIEW_MAX_TOKENS", "1200"))
    ai_review_char_limit: int = int(os.getenv("AI_REVIEW_CHAR_LIMIT", "3500"))
    ai_review_temperature: float = float(os.getenv("AI_REVIEW_TEMPERATURE", "0.1"))
    ai_review_json_mode: bool = bool_from_env("AI_REVIEW_JSON_MODE", llm_json_mode)
    notification_email: str = os.getenv("NOTIFICATION_EMAIL", "user@example.com")
    agent_config_port: int = int(os.getenv("AGENT_CONFIG_PORT", "3003"))
    skill_config_port: int = int(os.getenv("SKILL_CONFIG_PORT", "3004"))
    
    # AI worker and retry configuration
    ai_worker_concurrency: int = int(os.getenv("AI_WORKER_CONCURRENCY", "5"))
    retry_max_retries: int = int(os.getenv("RETRY_MAX_RETRIES", "3"))
    retry_base_delay_ms: int = int(os.getenv("RETRY_BASE_DELAY_MS", "60000"))
    retry_max_delay_ms: int = int(os.getenv("RETRY_MAX_DELAY_MS", "1800000"))
    retry_exponential_base: int = int(os.getenv("RETRY_EXPONENTIAL_BASE", "3"))


settings = ServiceSettings()

__all__ = ["ServiceSettings", "settings"]
