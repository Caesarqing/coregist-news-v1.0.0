# CrawTasks

This directory is no longer the primary ingestion path.

Canonical documentation now lives at:

- [docs/NEWS_PIPELINE.md](../../docs/NEWS_PIPELINE.md)

Short version:

- `legacy/`: archived standalone crawlers kept for reference and rollback
- top-level wrappers: compatibility entrypoints for the unified RSS registry pipeline
- recommended path: `rss_registry.py` + `rss_adapters.py` + `rss_ingestion.py` + `news_scraper_service.py`
