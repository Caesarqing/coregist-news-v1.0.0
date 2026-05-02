# CrawTasks

This directory is no longer the primary ingestion path.

Canonical documentation now lives at:

- [docs/backend/PIPELINE_CRAWTASKS.md](/Users/qingpeng/全公司项目/7-人工智能/新闻AI项目/coregist-news/docs/backend/PIPELINE_CRAWTASKS.md)

Short version:

- `legacy/`: archived standalone crawlers kept for reference and rollback
- top-level wrappers: compatibility entrypoints for the unified RSS registry pipeline
- recommended path: `rss_registry.py` + `rss_adapters.py` + `rss_ingestion.py` + `news_scraper_service.py`
