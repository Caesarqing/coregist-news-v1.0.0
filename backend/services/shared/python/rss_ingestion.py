from __future__ import annotations

from typing import Sequence

from services.ai_analysis.service import AIAnalysisService
from services.content_processing.service import ContentProcessingService
from services.news_scraper.service import NewsScraperService


def run_rss_ingestion(
    *,
    source_ids: Sequence[str] | None = None,
    publisher_ids: Sequence[str] | None = None,
    limit_per_feed: int | None = None,
) -> dict:
    scraper = NewsScraperService()
    processor = ContentProcessingService()
    analyzer = AIAnalysisService()

    raw_items = scraper.crawl_rss_sources(
        source_ids=list(source_ids or []),
        publisher_ids=list(publisher_ids or []),
        limit_per_feed=limit_per_feed,
        publish=False,
    )

    processed = 0
    for raw_item in raw_items:
        processed_payload = processor.process_news(raw_item, publish=False)
        analyzer.process(processed_payload, publish=False)
        processed += 1

    return {
        "raw_items": len(raw_items),
        "processed_items": processed,
        "source_ids": list(source_ids or []),
        "publisher_ids": list(publisher_ids or []),
        "limit_per_feed": limit_per_feed,
    }
