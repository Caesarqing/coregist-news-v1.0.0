from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
from uuid import uuid4

from services.shared.python.agent_runtime import build_default_agent_registry, build_default_skillset
from services.shared.python.news_identity import build_news_identity, build_news_lookup_query
from services.shared.python.queue import (
    QUEUE_KEYWORD_SEARCH,
    QUEUE_NEWS_CRAWL_TRIGGER,
    QUEUE_NEWS_RAW,
    QueueClient,
    mongo_collection,
)
from services.shared.python.rss import extract_article, fetch_rss_entries, list_rss_sources
from services.shared.python.settings import settings

logger = logging.getLogger(__name__)
MAX_ENRICHMENT_PER_SEARCH_JOB = 3
MAX_INGEST_AGE_DAYS = 7


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
    ) -> None:
        if not user_id or not news_object_id:
            return
        with mongo_collection("user_news_maps") as collection:
            collection.update_one(
                {"userId": user_id, "newsId": news_object_id},
                {
                    "$set": {
                        "search_job_id": search_job_id,
                        "query": query,
                        "keywords": keywords,
                        "origin": origin,
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
                        )
                        continue

                    if enrichment_attempted_count >= MAX_ENRICHMENT_PER_SEARCH_JOB:
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
                        "scrape_backend": scraped.get("backend", ""),
                    })
                except Exception as exc:
                    enrichment_failed_count += 1
                    logger.exception("keyword search item failed job=%s query=%s url=%s", job_id, query, result.get("url"))
                    continue

            self.publish_raw_payloads(payloads)
            self._upsert_search_job(job_id, {
                "status": "processing" if payloads else "completed",
                "finished_at": datetime.utcnow() if not payloads else None,
                "discovered_count": discovered_count,
                "existing_count": existing_count,
                "enrichment_failed_count": enrichment_failed_count,
                "enrichment_attempted_count": enrichment_attempted_count,
                "queued_for_ai_count": len(payloads),
            })
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
            return []

    def publish_raw_payloads(self, payloads: list[dict]) -> int:
        count = 0
        for payload in payloads:
            self.queue.publish(QUEUE_NEWS_RAW, payload)
            count += 1
        return count

    def _resolve_feed_limit(self, limit_per_feed: int | None) -> int:
        requested = int(limit_per_feed) if limit_per_feed else settings.rss_max_items_per_feed
        return max(1, min(requested, settings.rss_max_items_per_feed_hard_limit))

    def collect_rss_news(
        self,
        *,
        source_ids: list[str] | None = None,
        publisher_ids: list[str] | None = None,
        limit_per_feed: int | None = None,
        source_limit: int | None = None,
        on_item=None,
    ) -> list[dict]:
        items: list[dict] = []
        seen_urls: set[str] = set()
        max_items = self._resolve_feed_limit(limit_per_feed)
        sources = list_rss_sources(source_ids=source_ids, publisher_ids=publisher_ids)
        sources = sorted(sources, key=lambda source: getattr(source, "priority", 50))
        if source_limit:
            sources = sources[: max(1, int(source_limit))]
        with mongo_collection("news") as collection:
            for source in sources:
                for entry in fetch_rss_entries(source, max_items=max_items):
                    url = (entry.get("url") or "").strip()
                    if not url or url in seen_urls:
                        continue
                    seen_urls.add(url)
                    article = extract_article(source, entry)
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
        return items

    def crawl_rss_sources(
        self,
        *,
        source_ids: list[str] | None = None,
        publisher_ids: list[str] | None = None,
        limit_per_feed: int | None = None,
        source_limit: int | None = None,
        publish: bool = False,
    ) -> list[dict]:
        payloads = self.collect_rss_news(
            source_ids=source_ids,
            publisher_ids=publisher_ids,
            limit_per_feed=limit_per_feed,
            source_limit=source_limit,
            on_item=(lambda payload: self.queue.publish(QUEUE_NEWS_RAW, payload)) if publish else None,
        )
        return payloads

    def consume_triggers(self) -> None:
        def _handle_crawl(payload: dict) -> None:
            mode = (payload.get("mode") or "rss").strip().lower()
            if mode == "search":
                self.crawl_news(payload.get("query") or settings.search_default_query)
                return

            source_ids = [str(item).strip() for item in payload.get("source_ids", []) if str(item).strip()]
            publisher_ids = [str(item).strip() for item in payload.get("publisher_ids", []) if str(item).strip()]
            limit_per_feed = payload.get("limit_per_feed")
            source_limit = payload.get("source_limit")
            self.crawl_rss_sources(
                source_ids=source_ids or None,
                publisher_ids=publisher_ids or None,
                limit_per_feed=self._resolve_feed_limit(int(limit_per_feed)) if limit_per_feed else None,
                source_limit=max(1, int(source_limit)) if source_limit else None,
                publish=bool(payload.get("publish_raw", False)),
            )

        def _handle_keyword_search(payload: dict) -> None:
            query = (payload.get("query") or "").strip() or settings.search_default_query
            self.crawl_news(query, keyword_payload=payload)

        self.queue.consume_many({
            QUEUE_NEWS_CRAWL_TRIGGER: _handle_crawl,
            QUEUE_KEYWORD_SEARCH: _handle_keyword_search,
        })


if __name__ == "__main__":
    service = NewsScraperService()
    service.consume_triggers()
