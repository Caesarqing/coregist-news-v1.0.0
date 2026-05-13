from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
from urllib.parse import urlparse
from uuid import uuid4

from bson import ObjectId

from services.shared.python.agent_runtime import build_default_agent_registry, build_default_skillset
from services.shared.python.news_identity import build_news_identity, build_news_lookup_query
from services.shared.python.queue import (
    QUEUE_KEYWORD_SEARCH,
    QUEUE_NEWS_CRAWL_TRIGGER,
    QUEUE_NEWS_NOTIFICATIONS,
    QUEUE_NEWS_RAW,
    QueueClient,
    mongo_collection,
)
from services.shared.python.rss import RssFetchError, classify_fetch_errors, extract_article, fetch_rss_entries, list_rss_sources
from services.shared.python.settings import settings

logger = logging.getLogger(__name__)
MAX_INGEST_AGE_DAYS = 7
RSS_ROTATION_STATE_ID = "default"


class NewsScraperService:
    def __init__(self) -> None:
        self.registry = build_default_agent_registry()
        self.skillset = build_default_skillset()
        self.queue = QueueClient()
        self.search_agent = self.registry.get_agent("search_agent")

    @staticmethod
    def _coerce_datetime(value) -> datetime | None:
        if isinstance(value, datetime):
            parsed = value
            if parsed.tzinfo is not None:
                parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
            return parsed
        if not value:
            return None
        text = str(value).strip()
        if not text:
            return None
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
            if parsed.tzinfo is not None:
                parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
            return parsed
        except ValueError:
            return None

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @classmethod
    def _is_ingestable_posted_at(cls, posted_at, *, now: datetime | None = None) -> bool:
        parsed = cls._coerce_datetime(posted_at)
        if parsed is None:
            return False
        current = now or cls._utc_now()
        return current - timedelta(days=MAX_INGEST_AGE_DAYS) <= parsed <= current + timedelta(minutes=5)

    def _upsert_search_job(self, job_id: str, updates: dict) -> None:
        if not job_id:
            return
        with mongo_collection("user_search_jobs") as collection:
            collection.update_one({"job_id": job_id}, {"$set": {**updates, "updatedAt": datetime.utcnow()}}, upsert=False)

    def _upsert_user_news_map(
        self,
        *,
        user_id: str,
        news_object_id,
        search_job_id: str,
        query: str,
        keywords: list[str],
        origin: str = "search",
        tracking_topic_id: str = "",
    ) -> None:
        if not user_id or not news_object_id:
            return
        tracking_topic_id = str(tracking_topic_id or "")
        with mongo_collection("user_news_maps") as collection:
            collection.update_one(
                {"userId": user_id, "newsId": news_object_id},
                {
                    "$set": {
                        "search_job_id": search_job_id,
                        "query": query,
                        "keywords": keywords,
                        "origin": origin,
                        "tracking_topic_id": tracking_topic_id,
                        "visible": True,
                        "updatedAt": datetime.utcnow(),
                    },
                    "$setOnInsert": {
                        "userId": user_id,
                        "newsId": news_object_id,
                        "createdAt": datetime.utcnow(),
                    },
                },
                upsert=True,
            )
        if tracking_topic_id:
            self._sync_tracking_topic(tracking_topic_id=tracking_topic_id, user_id=user_id)

    def _sync_tracking_topic(self, *, tracking_topic_id: str, user_id: str = "", error: str = "") -> None:
        if not tracking_topic_id:
            return
        try:
            topic_object_id = ObjectId(tracking_topic_id)
        except Exception:
            return
        count_query = {"tracking_topic_id": tracking_topic_id, "visible": True}
        if user_id:
            count_query["userId"] = user_id
        with mongo_collection("user_news_maps") as map_collection:
            matched_count = map_collection.count_documents(count_query)
        update = {
            "matchedCount": matched_count,
            "lastStatus": "failed" if error else "updated",
            "lastError": error[:500] if error else "",
            "updatedAt": datetime.utcnow(),
        }
        with mongo_collection("trackingtopics") as topic_collection:
            topic_collection.update_one({"_id": topic_object_id}, {"$set": update})

    @staticmethod
    def _normalize_push_count(value) -> int:
        try:
            parsed = int(value)
        except Exception:
            parsed = 5
        return max(1, min(parsed, 20))

    def _publish_push_notification_if_ready(self, *, batch: dict, force: bool = False) -> None:
        if not batch or batch.get("notificationId") or batch.get("notificationQueuedAt"):
            return
        news_ids = [item for item in batch.get("matchedNewsIds", []) if item]
        push_count = self._normalize_push_count(batch.get("pushCount"))
        if not force and len(news_ids) < push_count:
            return
        selected_ids = news_ids[:push_count]
        if selected_ids:
            summary = f"根据关键词 {', '.join(batch.get('keywords', []))} 为你找到 {len(selected_ids)} 条相关新闻。"
        else:
            summary = f"根据关键词 {', '.join(batch.get('keywords', []))} 暂未找到符合条件的相关新闻。"
        with mongo_collection("push_batches") as collection:
            collection.update_one(
                {"batchId": batch.get("batchId", "")},
                {
                    "$set": {
                        "status": "ready" if len(selected_ids) >= push_count else ("partial" if selected_ids else "failed"),
                        "notificationQueuedAt": datetime.utcnow(),
                        "updatedAt": datetime.utcnow(),
                    },
                },
            )
        self.queue.publish(QUEUE_NEWS_NOTIFICATIONS, {
            "type": "news_push",
            "user_id": batch.get("userId", ""),
            "title": "新闻推送已更新",
            "summary": summary,
            "content": summary,
            "news_ids": [str(item) for item in selected_ids],
            "push_batch_id": batch.get("batchId", ""),
        })

    def _add_news_to_push_batch(
        self,
        *,
        batch_id: str,
        news_object_id,
        user_id: str,
        search_job_id: str,
        query: str,
        keywords: list[str],
    ) -> None:
        if not batch_id or not news_object_id:
            return
        if user_id:
            self._upsert_user_news_map(
                user_id=user_id,
                news_object_id=news_object_id,
                search_job_id=search_job_id,
                query=query,
                keywords=keywords,
            )
            with mongo_collection("user_news_maps") as collection:
                collection.update_one(
                    {"userId": user_id, "newsId": news_object_id},
                    {"$set": {"push_batch_id": batch_id, "updatedAt": datetime.utcnow()}},
                )
        with mongo_collection("push_batches") as collection:
            collection.update_one(
                {"batchId": batch_id},
                {
                    "$addToSet": {"matchedNewsIds": news_object_id},
                    "$set": {"updatedAt": datetime.utcnow()},
                },
            )
            batch = collection.find_one({"batchId": batch_id}) or {}
            matched_count = len([item for item in batch.get("matchedNewsIds", []) if item])
            collection.update_one(
                {"batchId": batch_id},
                {"$set": {"matchedCount": matched_count, "updatedAt": datetime.utcnow()}},
            )
            batch["matchedCount"] = matched_count
        self._publish_push_notification_if_ready(batch=batch)

    def _remaining_push_capacity(self, payload: dict) -> int:
        batch_id = payload.get("push_batch_id") or ""
        push_count = self._normalize_push_count(payload.get("push_count"))
        remaining = payload.get("remaining_count")
        try:
            requested_remaining = int(remaining) if remaining is not None else push_count
        except Exception:
            requested_remaining = push_count
        if batch_id:
            with mongo_collection("push_batches") as collection:
                batch = collection.find_one({"batchId": batch_id}, {"matchedNewsIds": 1, "pushCount": 1}) or {}
            push_count = self._normalize_push_count(batch.get("pushCount") or push_count)
            matched_count = len([item for item in batch.get("matchedNewsIds", []) if item])
            requested_remaining = max(0, push_count - matched_count)
        return max(0, min(requested_remaining, settings.push_max_enrichment_per_batch))

    def _finish_push_batch_after_search(self, payload: dict, *, queued_for_ai_count: int) -> None:
        batch_id = payload.get("push_batch_id") or ""
        if not batch_id:
            return
        with mongo_collection("push_batches") as collection:
            batch = collection.find_one({"batchId": batch_id}) or {}
            if not batch:
                return
            matched_count = len([item for item in batch.get("matchedNewsIds", []) if item])
            collection.update_one(
                {"batchId": batch_id},
                {
                    "$set": {
                        "matchedCount": matched_count,
                        "searchFinishedAt": datetime.utcnow(),
                        "updatedAt": datetime.utcnow(),
                    },
                },
            )
            batch["matchedCount"] = matched_count
        if queued_for_ai_count == 0:
            self._publish_push_notification_if_ready(batch=batch, force=True)

    def _create_user_discovery_doc(self, *, payload: dict, result: dict, identity: dict) -> str:
        discovery_id = str(uuid4())
        published_at = result.get("published_at")
        published_at_value = None
        if published_at:
            try:
                published_at_value = datetime.fromisoformat(str(published_at).replace("Z", "+00:00"))
            except Exception:
                published_at_value = None
        with mongo_collection("user_discovery_news") as collection:
            collection.insert_one({
                "discovery_id": discovery_id,
                "search_job_id": payload.get("job_id", ""),
                "userId": payload.get("user_id", ""),
                "query": payload.get("query", ""),
                "keyword": (payload.get("keywords") or [""])[0] if payload.get("keywords") else "",
                "source_type": payload.get("source_type", "search_query"),
                "topic_name": payload.get("topic_name", ""),
                "tracking_topic_id": payload.get("tracking_topic_id", ""),
                "title": result.get("title") or payload.get("query") or "",
                "url": result.get("url") or "",
                "canonical_link": identity.get("canonical_link", ""),
                "title_hash": identity.get("title_hash", ""),
                "snippet": result.get("snippet", ""),
                "source": result.get("source", ""),
                "published_at": published_at_value,
                "linked_news_id": None,
                "status": "discovered",
                "error": "",
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow(),
            })
        return discovery_id

    def _upsert_global_discovery_doc(self, *, article: dict, identity: dict, pipeline_mode: str) -> None:
        lookup_query = {
            "canonical_link": identity.get("canonical_link", ""),
            "title_hash": identity.get("title_hash", ""),
            "source_id": article.get("source_id") or article.get("publisher_id") or "",
        }
        if not lookup_query["canonical_link"] and article.get("url"):
            lookup_query = {"url": article.get("url")}

        published_at = article.get("published_at")
        published_at_value = None
        if published_at:
            try:
                published_at_value = datetime.fromisoformat(str(published_at).replace("Z", "+00:00"))
            except Exception:
                published_at_value = None

        with mongo_collection("discovery_news") as collection:
            collection.update_one(
                lookup_query,
                {
                    "$set": {
                        "title": article.get("title") or "",
                        "url": article.get("url") or "",
                        "snippet": article.get("snippet", ""),
                        "source_id": article.get("source_id") or article.get("publisher_id") or "",
                        "source_name_en": article.get("source_name_en") or "",
                        "source_name_zh": article.get("source_name_zh") or article.get("source_name_en") or "",
                        "feed_name": article.get("feed_name") or "",
                        "feed_url": article.get("feed_url") or "",
                        "canonical_link": identity.get("canonical_link", ""),
                        "title_hash": identity.get("title_hash", ""),
                        "published_at": published_at_value,
                        "categories": article.get("categories", []),
                        "language": article.get("language") or "",
                        "image_link": article.get("image_link") or "",
                        "image_confidence": article.get("image_confidence", "none"),
                        "image_source_type": article.get("image_source_type", "none"),
                        "image_fallback_type": article.get("image_fallback_type", ""),
                        "source_logo_url": article.get("source_logo_url", ""),
                        "region": article.get("region") or "",
                        "pipeline_mode": pipeline_mode,
                        "status": "discovered",
                        "updatedAt": datetime.utcnow(),
                    },
                    "$setOnInsert": {
                        "createdAt": datetime.utcnow(),
                    },
                },
                upsert=True,
            )

    def crawl_news(self, query: str, *, keyword_payload: dict | None = None) -> list[dict]:
        keyword_payload = keyword_payload or {}
        job_id = keyword_payload.get("job_id", "")
        payloads: list[dict] = []
        seen_result_keys: set[str] = set()
        discovered_count = 0
        existing_count = 0
        enrichment_failed_count = 0
        enrichment_attempted_count = 0
        enrichment_limit = settings.push_max_enrichment_per_batch if not keyword_payload.get("push_batch_id") else self._remaining_push_capacity(keyword_payload)

        self._upsert_search_job(job_id, {
            "status": "processing",
            "started_at": datetime.utcnow(),
            "error": "",
        })

        try:
            search_results = self.skillset.get_skill("web_search").execute(query=query)
            logger.info("keyword search started job=%s query=%s results=%s", job_id, query, len(search_results))

            for result in search_results:
                if not result.get("url"):
                    continue
                if not self._is_ingestable_posted_at(result.get("published_at")):
                    logger.info(
                        "keyword search skipped stale result job=%s query=%s url=%s published_at=%s",
                        job_id,
                        query,
                        result.get("url"),
                        result.get("published_at"),
                    )
                    continue
                discovered_count += 1
                try:
                    identity = build_news_identity(
                        url=result.get("url") or "",
                        title=result.get("title") or query,
                    )
                    self._upsert_global_discovery_doc(
                        article={
                            "title": result.get("title") or query,
                            "url": result.get("url") or "",
                            "snippet": result.get("snippet", ""),
                            "source_id": result.get("source_id") or "",
                            "publisher_id": result.get("source_id") or "",
                            "source_name_en": result.get("source", ""),
                            "source_name_zh": result.get("source", ""),
                            "feed_name": "skill:web_search",
                            "feed_url": "",
                            "published_at": result.get("published_at", ""),
                            "categories": [],
                            "language": "",
                            "region": "",
                        },
                        identity=identity,
                        pipeline_mode="search",
                    )
                    dedupe_key = identity.get("canonical_link") or result.get("url") or identity.get("title_hash") or result.get("title") or ""
                    if dedupe_key and dedupe_key in seen_result_keys:
                        continue
                    if dedupe_key:
                        seen_result_keys.add(dedupe_key)

                    discovery_id = ""
                    if keyword_payload.get("user_id"):
                        discovery_id = self._create_user_discovery_doc(payload=keyword_payload, result=result, identity=identity)

                    with mongo_collection("news") as collection:
                        existing_news = collection.find_one(
                            build_news_lookup_query(
                                link=result.get("url") or "",
                                canonical_link=identity["canonical_link"],
                                title_hash=identity["title_hash"],
                                source_id=result.get("source_id") or "",
                            ),
                            {"_id": 1},
                        )
                    if existing_news:
                        existing_count += 1
                        if discovery_id:
                            with mongo_collection("user_discovery_news") as collection:
                                collection.update_one(
                                    {"discovery_id": discovery_id},
                                    {
                                        "$set": {
                                            "status": "completed",
                                            "linked_news_id": existing_news.get("_id"),
                                            "updatedAt": datetime.utcnow(),
                                        },
                                    },
                                )
                        self._upsert_user_news_map(
                            user_id=keyword_payload.get("user_id", ""),
                            news_object_id=existing_news.get("_id"),
                            search_job_id=job_id,
                            query=query,
                            keywords=keyword_payload.get("keywords", []),
                            origin="tracking" if keyword_payload.get("source_type") == "tracking_topic" else "search",
                            tracking_topic_id=keyword_payload.get("tracking_topic_id", ""),
                        )
                        self._add_news_to_push_batch(
                            batch_id=keyword_payload.get("push_batch_id", ""),
                            news_object_id=existing_news.get("_id"),
                            user_id=keyword_payload.get("user_id", ""),
                            search_job_id=job_id,
                            query=query,
                            keywords=keyword_payload.get("keywords", []),
                        )
                        continue

                    if enrichment_attempted_count >= enrichment_limit:
                        logger.info(
                            "keyword search capped enrichment job=%s query=%s discovery=%s",
                            job_id,
                            query,
                            discovery_id,
                        )
                        continue

                    if discovery_id:
                        with mongo_collection("user_discovery_news") as collection:
                            collection.update_one(
                                {"discovery_id": discovery_id},
                                {"$set": {"status": "enrichment_processing", "updatedAt": datetime.utcnow()}},
                            )

                    enrichment_attempted_count += 1
                    scraped = self.skillset.get_skill("content_scraper").execute(url=result["url"])
                    if not (scraped.get("content") or "").strip():
                        enrichment_failed_count += 1
                        if discovery_id:
                            with mongo_collection("user_discovery_news") as collection:
                                collection.update_one(
                                    {"discovery_id": discovery_id},
                                    {
                                        "$set": {
                                            "status": "enrichment_failed",
                                            "error": "; ".join(scraped.get("errors", []))[:500],
                                            "updatedAt": datetime.utcnow(),
                                        },
                                    },
                                )
                        continue

                    if discovery_id:
                        with mongo_collection("user_discovery_news") as collection:
                            collection.update_one(
                                {"discovery_id": discovery_id},
                                {"$set": {"status": "enrichment_queued", "updatedAt": datetime.utcnow()}},
                            )

                    payloads.append({
                        "news_id": str(uuid4()),
                        "query": query,
                        "title": result.get("title", query),
                        "url": result["url"],
                        "snippet": result.get("snippet", ""),
                        "raw_content": scraped.get("content", ""),
                        "raw_html": scraped.get("raw_html", ""),
                        "errors": scraped.get("errors", []),
                        "source_name_en": result.get("source", ""),
                        "source_name_zh": result.get("source", ""),
                        "posted_at": result.get("published_at"),
                        "canonical_link": identity["canonical_link"],
                        "title_hash": identity["title_hash"],
                        "crawled_at": datetime.utcnow().isoformat(),
                        "pipeline_mode": "search",
                        "user_id": keyword_payload.get("user_id", ""),
                        "search_job_id": job_id,
                        "discovery_id": discovery_id,
                        "keywords": keyword_payload.get("keywords", []),
                        "source_type": keyword_payload.get("source_type", "search_query"),
                        "topic_name": keyword_payload.get("topic_name", ""),
                        "tracking_topic_id": keyword_payload.get("tracking_topic_id", ""),
                        "push_batch_id": keyword_payload.get("push_batch_id", ""),
                        "push_count": keyword_payload.get("push_count"),
                        "scrape_backend": scraped.get("backend", ""),
                    })
                except Exception as exc:
                    enrichment_failed_count += 1
                    logger.exception("keyword search item failed job=%s query=%s url=%s", job_id, query, result.get("url"))
                    continue

            self.publish_raw_payloads(payloads)
            self._finish_push_batch_after_search(keyword_payload, queued_for_ai_count=len(payloads))
            self._upsert_search_job(job_id, {
                "status": "processing" if payloads else "completed",
                "finished_at": datetime.utcnow() if not payloads else None,
                "discovered_count": discovered_count,
                "existing_count": existing_count,
                "enrichment_failed_count": enrichment_failed_count,
                "enrichment_attempted_count": enrichment_attempted_count,
                "queued_for_ai_count": len(payloads),
            })
            if keyword_payload.get("source_type") == "tracking_topic" and not payloads:
                self._sync_tracking_topic(
                    tracking_topic_id=keyword_payload.get("tracking_topic_id", ""),
                    user_id=keyword_payload.get("user_id", ""),
                )
            logger.info(
                "keyword search finished job=%s query=%s discovered=%s existing=%s queued=%s enrichment_failed=%s",
                job_id,
                query,
                discovered_count,
                existing_count,
                len(payloads),
                enrichment_failed_count,
            )
            return payloads
        except Exception as exc:
            logger.exception("keyword search job failed job=%s query=%s", job_id, query)
            self._upsert_search_job(job_id, {
                "status": "failed",
                "finished_at": datetime.utcnow(),
                "error": str(exc)[:500],
                "discovered_count": discovered_count,
                "existing_count": existing_count,
                "enrichment_failed_count": enrichment_failed_count,
                "enrichment_attempted_count": enrichment_attempted_count,
                "queued_for_ai_count": len(payloads),
            })
            self._finish_push_batch_after_search(keyword_payload, queued_for_ai_count=0)
            if keyword_payload.get("source_type") == "tracking_topic":
                self._sync_tracking_topic(
                    tracking_topic_id=keyword_payload.get("tracking_topic_id", ""),
                    user_id=keyword_payload.get("user_id", ""),
                    error=str(exc),
                )
            return []

    def publish_raw_payloads(self, payloads: list[dict]) -> int:
        count = 0
        for payload in payloads:
            count += self.publish_raw_payload(payload)
        return count

    def publish_raw_payload(self, payload: dict) -> int:
        if not self._acquire_ingestion_lock(payload):
            logger.info("raw payload skipped by ingestion lock url=%s title=%s", payload.get("url"), payload.get("title"))
            return 0
        self.queue.publish(QUEUE_NEWS_RAW, payload)
        return 1

    @staticmethod
    def _ingestion_lock_key(payload: dict) -> str:
        canonical_link = (payload.get("canonical_link") or "").strip()
        if canonical_link:
            return f"canonical:{canonical_link}"
        source_id = (payload.get("source_id") or payload.get("publisher_id") or "").strip()
        title_hash = (payload.get("title_hash") or "").strip()
        if source_id and title_hash:
            return f"title:{source_id}:{title_hash}"
        url = (payload.get("url") or "").strip()
        return f"url:{url}" if url else ""

    def _acquire_ingestion_lock(self, payload: dict, *, now: datetime | None = None) -> bool:
        lock_key = self._ingestion_lock_key(payload)
        if not lock_key:
            return True
        current = now or datetime.utcnow()
        expires_at = current + timedelta(hours=max(1, settings.news_ingestion_lock_hours))
        with mongo_collection("news_ingestion_locks") as collection:
            existing = collection.find_one({"_id": lock_key}, {"expires_at": 1})
            existing_expires_at = self._coerce_datetime((existing or {}).get("expires_at"))
            if existing_expires_at and existing_expires_at > current:
                return False
            collection.update_one(
                {"_id": lock_key},
                {
                    "$set": {
                        "expires_at": expires_at,
                        "updatedAt": current,
                        "canonical_link": payload.get("canonical_link", ""),
                        "source_id": payload.get("source_id") or payload.get("publisher_id") or "",
                        "title_hash": payload.get("title_hash", ""),
                        "url": payload.get("url", ""),
                    },
                    "$setOnInsert": {"createdAt": current},
                },
                upsert=True,
            )
        return True

    def _resolve_feed_limit(self, limit_per_feed: int | None) -> int:
        requested = int(limit_per_feed) if limit_per_feed else settings.rss_max_items_per_feed
        return max(1, min(requested, settings.rss_max_items_per_feed_hard_limit))

    @staticmethod
    def _source_sort_key(source) -> tuple[int, str]:
        return (getattr(source, "priority", 50), getattr(source, "id", ""))

    @staticmethod
    def _rss_domain(source) -> str:
        return (urlparse(getattr(source, "feed_url", "") or "").hostname or "").lower()

    @staticmethod
    def _state_key(value: str) -> str:
        return (value or "").replace(".", "__dot__").replace("$", "__dollar__")

    @classmethod
    def _rotation_state_for_source(cls, state: dict, source_id: str) -> dict:
        return (state.get("sources") or {}).get(cls._state_key(source_id), {}) or {}

    @classmethod
    def _rotation_state_for_domain(cls, state: dict, domain: str) -> dict:
        return (state.get("domains") or {}).get(cls._state_key(domain), {}) or {}

    @staticmethod
    def _rss_error_type(error: Exception | str | None) -> str:
        if isinstance(error, RssFetchError):
            return error.error_type or "request_error"
        return classify_fetch_errors([str(error or "")]) or "request_error"

    @staticmethod
    def _rss_error_policy(error_type: str) -> dict:
        if error_type in {"http_403", "http_429", "ssl_error"}:
            return {
                "backoff_seconds": settings.rss_http_limited_backoff_seconds,
                "quarantine_threshold": settings.rss_http_limited_quarantine_threshold,
                "quarantine_seconds": settings.rss_http_limited_quarantine_seconds,
            }
        if error_type == "browser_timeout":
            return {
                "backoff_seconds": settings.rss_browser_timeout_backoff_seconds,
                "quarantine_threshold": settings.rss_timeout_quarantine_threshold,
                "quarantine_seconds": settings.rss_timeout_quarantine_seconds,
            }
        if error_type == "timeout":
            return {
                "backoff_seconds": settings.rss_timeout_backoff_seconds,
                "quarantine_threshold": settings.rss_timeout_quarantine_threshold,
                "quarantine_seconds": settings.rss_timeout_quarantine_seconds,
            }
        return {
            "backoff_seconds": settings.rss_source_error_backoff_seconds,
            "quarantine_threshold": settings.rss_timeout_quarantine_threshold,
            "quarantine_seconds": settings.rss_timeout_quarantine_seconds,
        }

    @classmethod
    def _is_source_available_for_rotation(
        cls,
        *,
        source,
        state: dict,
        now: datetime,
        source_min_interval_seconds: int | None = None,
        domain_min_interval_seconds: int | None = None,
        source_error_backoff_seconds: int | None = None,
    ) -> bool:
        source_min_interval_seconds = (
            settings.rss_source_min_interval_seconds
            if source_min_interval_seconds is None
            else source_min_interval_seconds
        )
        domain_min_interval_seconds = (
            settings.rss_domain_min_interval_seconds
            if domain_min_interval_seconds is None
            else domain_min_interval_seconds
        )
        source_error_backoff_seconds = (
            settings.rss_source_error_backoff_seconds
            if source_error_backoff_seconds is None
            else source_error_backoff_seconds
        )

        source_state = cls._rotation_state_for_source(state, source.id)
        if source_state.get("disabled_by_health"):
            return False

        source_quarantine_until = cls._coerce_datetime(source_state.get("quarantine_until"))
        if source_quarantine_until and now < source_quarantine_until:
            return False

        last_attempt = cls._coerce_datetime(source_state.get("last_attempt_at"))
        if last_attempt and now - last_attempt < timedelta(seconds=max(0, source_min_interval_seconds)):
            return False

        error_count = int(source_state.get("error_count") or 0)
        last_error = cls._coerce_datetime(source_state.get("last_error_at"))
        error_type = source_state.get("last_error_type") or ""
        backoff_seconds = (
            cls._rss_error_policy(error_type).get("backoff_seconds")
            if error_type
            else source_error_backoff_seconds
        )
        if error_count > 0 and last_error and now - last_error < timedelta(seconds=max(0, backoff_seconds)):
            return False

        domain = cls._rss_domain(source)
        if domain:
            domain_state = cls._rotation_state_for_domain(state, domain)
            domain_quarantine_until = cls._coerce_datetime(domain_state.get("quarantine_until"))
            if domain_quarantine_until and now < domain_quarantine_until:
                return False
            last_domain_attempt = cls._coerce_datetime(domain_state.get("last_attempt_at"))
            if last_domain_attempt and now - last_domain_attempt < timedelta(seconds=max(0, domain_min_interval_seconds)):
                return False

        return True

    @classmethod
    def select_rotating_sources(
        cls,
        sources: list,
        *,
        state: dict | None = None,
        source_limit: int | None = None,
        now: datetime | None = None,
        source_min_interval_seconds: int | None = None,
        domain_min_interval_seconds: int | None = None,
        source_error_backoff_seconds: int | None = None,
    ) -> tuple[list, int]:
        ordered_sources = sorted(sources, key=cls._source_sort_key)
        if not ordered_sources:
            return [], 0

        state = state or {}
        current = now or cls._utc_now()
        batch_size = max(1, int(source_limit or settings.rss_source_batch_size))
        start = int(state.get("cursor") or 0) % len(ordered_sources)
        selected = []
        batch_domains: set[str] = set()

        for offset in range(len(ordered_sources)):
            source = ordered_sources[(start + offset) % len(ordered_sources)]
            domain = cls._rss_domain(source)
            if domain and domain in batch_domains:
                continue
            if not cls._is_source_available_for_rotation(
                source=source,
                state=state,
                now=current,
                source_min_interval_seconds=source_min_interval_seconds,
                domain_min_interval_seconds=domain_min_interval_seconds,
                source_error_backoff_seconds=source_error_backoff_seconds,
            ):
                continue

            selected.append(source)
            if domain:
                batch_domains.add(domain)
            if len(selected) >= batch_size:
                break

        next_cursor = (start + len(ordered_sources)) % len(ordered_sources)
        if selected:
            last_index = ordered_sources.index(selected[-1])
            next_cursor = (last_index + 1) % len(ordered_sources)
        return selected, next_cursor

    def _load_rss_rotation_state(self) -> dict:
        with mongo_collection(settings.rss_rotation_state_collection) as collection:
            return collection.find_one({"_id": RSS_ROTATION_STATE_ID}) or {
                "_id": RSS_ROTATION_STATE_ID,
                "cursor": 0,
                "sources": {},
                "domains": {},
            }

    def _save_rss_rotation_cursor(self, cursor: int) -> None:
        with mongo_collection(settings.rss_rotation_state_collection) as collection:
            collection.update_one(
                {"_id": RSS_ROTATION_STATE_ID},
                {
                    "$set": {
                        "cursor": max(0, int(cursor)),
                        "updatedAt": datetime.utcnow(),
                    },
                    "$setOnInsert": {
                        "sources": {},
                        "domains": {},
                        "createdAt": datetime.utcnow(),
                    },
                },
                upsert=True,
            )

    def _mark_rss_source_attempt(self, source, *, now: datetime | None = None) -> None:
        current = now or self._utc_now()
        domain = self._rss_domain(source)
        set_values = {
            f"sources.{self._state_key(source.id)}.source_id": source.id,
            f"sources.{self._state_key(source.id)}.last_attempt_at": current,
            "updatedAt": datetime.utcnow(),
        }
        if domain:
            set_values[f"domains.{self._state_key(domain)}.hostname"] = domain
            set_values[f"domains.{self._state_key(domain)}.last_attempt_at"] = current
        with mongo_collection(settings.rss_rotation_state_collection) as collection:
            collection.update_one(
                {"_id": RSS_ROTATION_STATE_ID},
                {"$set": set_values, "$setOnInsert": {"createdAt": datetime.utcnow()}},
                upsert=True,
            )

    def _mark_rss_source_success(self, source, *, now: datetime | None = None) -> None:
        current = now or self._utc_now()
        source_key = self._state_key(source.id)
        domain = self._rss_domain(source)
        set_values = {
            f"sources.{source_key}.source_id": source.id,
            f"sources.{source_key}.last_success_at": current,
            f"sources.{source_key}.error_count": 0,
            f"sources.{source_key}.consecutive_failures": 0,
            f"sources.{source_key}.last_error_type": "",
            f"sources.{source_key}.quarantine_until": None,
            f"sources.{source_key}.disabled_by_health": False,
            "updatedAt": datetime.utcnow(),
        }
        if domain:
            domain_key = self._state_key(domain)
            set_values[f"domains.{domain_key}.hostname"] = domain
            set_values[f"domains.{domain_key}.last_error_type"] = ""
            set_values[f"domains.{domain_key}.quarantine_until"] = None
        with mongo_collection(settings.rss_rotation_state_collection) as collection:
            collection.update_one(
                {"_id": RSS_ROTATION_STATE_ID},
                {
                    "$set": set_values,
                    "$setOnInsert": {"createdAt": datetime.utcnow()},
                },
                upsert=True,
            )

    def _mark_rss_source_error(self, source, error: Exception, *, now: datetime | None = None) -> None:
        current = now or self._utc_now()
        source_key = self._state_key(source.id)
        domain = self._rss_domain(source)
        error_type = self._rss_error_type(error)
        policy = self._rss_error_policy(error_type)
        with mongo_collection(settings.rss_rotation_state_collection) as collection:
            state = collection.find_one({"_id": RSS_ROTATION_STATE_ID}) or {}
            source_state = self._rotation_state_for_source(state, source.id)
            consecutive_failures = int(source_state.get("consecutive_failures") or 0) + 1
            error_count = int(source_state.get("error_count") or 0) + 1
            quarantine_count = int(source_state.get("quarantine_count") or 0)
            quarantine_until = None
            disabled_by_health = bool(source_state.get("disabled_by_health"))
            if consecutive_failures >= int(policy["quarantine_threshold"]):
                quarantine_until = current + timedelta(seconds=max(0, int(policy["quarantine_seconds"])))
                quarantine_count += 1
            if (
                quarantine_count >= settings.rss_quarantine_repeats_to_disable
                or consecutive_failures >= settings.rss_disable_after_failures
            ):
                disabled_by_health = True

            set_values = {
                f"sources.{source_key}.source_id": source.id,
                f"sources.{source_key}.last_error_at": current,
                f"sources.{source_key}.last_error": str(error)[:500],
                f"sources.{source_key}.last_error_type": error_type,
                f"sources.{source_key}.consecutive_failures": consecutive_failures,
                f"sources.{source_key}.quarantine_count": quarantine_count,
                f"sources.{source_key}.disabled_by_health": disabled_by_health,
                "updatedAt": datetime.utcnow(),
            }
            if quarantine_until:
                set_values[f"sources.{source_key}.quarantine_until"] = quarantine_until
            if domain:
                domain_key = self._state_key(domain)
                set_values[f"domains.{domain_key}.hostname"] = domain
                set_values[f"domains.{domain_key}.last_error_type"] = error_type
                if quarantine_until:
                    set_values[f"domains.{domain_key}.quarantine_until"] = quarantine_until
            collection.update_one(
                {"_id": RSS_ROTATION_STATE_ID},
                {
                    "$set": set_values,
                    "$inc": {
                        f"sources.{source_key}.error_count": 1,
                    },
                    "$setOnInsert": {"createdAt": datetime.utcnow()},
                },
                upsert=True,
            )

    def collect_rss_news(
        self,
        *,
        source_ids: list[str] | None = None,
        publisher_ids: list[str] | None = None,
        limit_per_feed: int | None = None,
        source_limit: int | None = None,
        rotate_sources: bool = False,
        on_item=None,
    ) -> list[dict]:
        items: list[dict] = []
        seen_urls: set[str] = set()
        max_items = self._resolve_feed_limit(limit_per_feed)
        sources = list_rss_sources(source_ids=source_ids, publisher_ids=publisher_ids)
        sources = sorted(sources, key=self._source_sort_key)
        should_rotate = rotate_sources and not source_ids and not publisher_ids
        if should_rotate:
            state = self._load_rss_rotation_state()
            sources, next_cursor = self.select_rotating_sources(
                sources,
                state=state,
                source_limit=source_limit,
            )
            self._save_rss_rotation_cursor(next_cursor)
            logger.info(
                "rss rotation selected count=%s next_cursor=%s sources=%s",
                len(sources),
                next_cursor,
                [source.id for source in sources],
            )
        elif source_limit:
            sources = sources[: max(1, int(source_limit))]
        with mongo_collection("news") as collection:
            run_stats = {"success_sources": 0, "failed_sources": 0, "skipped_articles": 0}
            for source in sources:
                if should_rotate:
                    self._mark_rss_source_attempt(source)
                source_succeeded = False
                try:
                    entries = fetch_rss_entries(source, max_items=max_items)
                    source_succeeded = True
                    for entry in entries:
                        url = (entry.get("url") or "").strip()
                        if not url or url in seen_urls:
                            continue
                        seen_urls.add(url)
                        try:
                            article = extract_article(source, entry)
                        except RssFetchError as exc:
                            run_stats["skipped_articles"] += 1
                            logger.warning(
                                "rss article skipped source=%s url=%s error_type=%s error=%s",
                                source.id,
                                url,
                                exc.error_type,
                                exc,
                            )
                            continue
                        except Exception as exc:
                            run_stats["skipped_articles"] += 1
                            logger.warning(
                                "rss article skipped source=%s url=%s error_type=%s error=%s",
                                source.id,
                                url,
                                self._rss_error_type(exc),
                                exc,
                            )
                            continue
                        if not self._is_ingestable_posted_at(article.get("published_at")):
                            logger.info(
                                "rss skipped stale article source=%s title=%s published_at=%s",
                                article.get("source_id") or article.get("publisher_id") or source.publisher_id,
                                article.get("title") or source.feed_name,
                                article.get("published_at"),
                            )
                            continue
                        identity = build_news_identity(
                            url=article.get("url") or url,
                            title=article.get("title") or source.feed_name,
                        )
                        lookup_query = build_news_lookup_query(
                            link=article.get("url") or url,
                            canonical_link=identity["canonical_link"],
                            title_hash=identity["title_hash"],
                            source_id=article.get("source_id") or article.get("publisher_id") or "",
                        )
                        if lookup_query and collection.find_one(lookup_query, {"_id": 1}):
                            self._upsert_global_discovery_doc(article=article, identity=identity, pipeline_mode="rss")
                            continue
                        self._upsert_global_discovery_doc(article=article, identity=identity, pipeline_mode="rss")
                        items.append({
                            "news_id": str(uuid4()),
                            "title": article.get("title") or source.feed_name,
                            "url": url,
                            "canonical_link": identity["canonical_link"],
                            "title_hash": identity["title_hash"],
                            "snippet": article.get("snippet", ""),
                            "raw_content": article.get("raw_content", ""),
                            "raw_html": article.get("raw_html", ""),
                            "image_link": article.get("image_link"),
                            "image_confidence": article.get("image_confidence", "none"),
                            "image_source_type": article.get("image_source_type", "none"),
                            "image_fallback_type": article.get("image_fallback_type", ""),
                            "source_logo_url": article.get("source_logo_url", ""),
                            "errors": article.get("errors", []),
                            "content_quality": article.get("content_quality", "full"),
                            "scrape_error_type": article.get("scrape_error_type", ""),
                            "crawled_at": datetime.utcnow().isoformat(),
                            "posted_at": article.get("published_at"),
                            "feed_name": article.get("feed_name"),
                            "feed_url": article.get("feed_url"),
                            "source_id": article.get("source_id"),
                            "publisher_id": article.get("publisher_id"),
                            "source_name_en": article.get("source_name_en"),
                            "source_name_zh": article.get("source_name_zh"),
                            "categories": article.get("categories", []),
                            "language": article.get("language", source.language),
                            "region": article.get("region", source.region),
                            "adapter_id": article.get("adapter_id", source.adapter_id),
                            "pipeline_mode": "rss",
                        })
                        if callable(on_item):
                            on_item(items[-1])
                except Exception as exc:
                    run_stats["failed_sources"] += 1
                    logger.exception("rss source failed source=%s feed_url=%s", source.id, source.feed_url)
                    if should_rotate:
                        self._mark_rss_source_error(source, exc)
                    continue
                if should_rotate and source_succeeded:
                    self._mark_rss_source_success(source)
                if source_succeeded:
                    run_stats["success_sources"] += 1
            if should_rotate:
                logger.info(
                    "rss rotation finished success_sources=%s failed_sources=%s skipped_articles=%s emitted_items=%s",
                    run_stats["success_sources"],
                    run_stats["failed_sources"],
                    run_stats["skipped_articles"],
                    len(items),
                )
        return items

    def crawl_rss_sources(
        self,
        *,
        source_ids: list[str] | None = None,
        publisher_ids: list[str] | None = None,
        limit_per_feed: int | None = None,
        source_limit: int | None = None,
        rotate_sources: bool = False,
        publish: bool = False,
    ) -> list[dict]:
        payloads = self.collect_rss_news(
            source_ids=source_ids,
            publisher_ids=publisher_ids,
            limit_per_feed=limit_per_feed,
            source_limit=source_limit,
            rotate_sources=rotate_sources,
            on_item=(lambda payload: self.publish_raw_payload(payload)) if publish else None,
        )
        return payloads

    def consume_triggers(self) -> None:
        logger.info("news scraper combined consumer is starting")
        self.queue.consume_many({
            QUEUE_NEWS_CRAWL_TRIGGER: self.handle_crawl_trigger,
            QUEUE_KEYWORD_SEARCH: self.handle_keyword_search,
        })

    def handle_crawl_trigger(self, payload: dict) -> None:
        mode = (payload.get("mode") or "rss").strip().lower()
        if mode == "search":
            self.crawl_news(payload.get("query") or settings.search_default_query)
            return

        source_ids = [str(item).strip() for item in payload.get("source_ids", []) if str(item).strip()]
        publisher_ids = [str(item).strip() for item in payload.get("publisher_ids", []) if str(item).strip()]
        limit_per_feed = payload.get("limit_per_feed")
        source_limit = payload.get("source_limit")
        rotate_sources = bool(payload.get("rotate_sources", False))
        self.crawl_rss_sources(
            source_ids=source_ids or None,
            publisher_ids=publisher_ids or None,
            limit_per_feed=self._resolve_feed_limit(int(limit_per_feed)) if limit_per_feed else None,
            source_limit=max(1, int(source_limit)) if source_limit else None,
            rotate_sources=rotate_sources,
            publish=bool(payload.get("publish_raw", False)),
        )

    def handle_keyword_search(self, payload: dict) -> None:
        query = (payload.get("query") or "").strip() or settings.search_default_query
        self.crawl_news(query, keyword_payload=payload)

    def consume_crawl_triggers(self) -> None:
        logger.info("rss crawl consumer is starting")
        self.queue.consume(QUEUE_NEWS_CRAWL_TRIGGER, self.handle_crawl_trigger)

    def consume_keyword_searches(self) -> None:
        logger.info("keyword search consumer is starting")
        self.queue.consume(QUEUE_KEYWORD_SEARCH, self.handle_keyword_search)


if __name__ == "__main__":
    service = NewsScraperService()
    service.consume_triggers()
