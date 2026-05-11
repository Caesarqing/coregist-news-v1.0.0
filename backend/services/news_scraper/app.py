from pathlib import Path
import argparse
import os
import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.news_scraper.service import NewsScraperService


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--worker-mode", default=os.getenv("NEWS_SCRAPER_WORKER_MODE") or "combined")
    args = parser.parse_args()
    service = NewsScraperService()
    worker_mode = args.worker_mode.strip().lower()
    if worker_mode in {"rss", "crawl", "rss-crawl"}:
        service.consume_crawl_triggers()
    elif worker_mode in {"keyword", "search", "keyword-search"}:
        service.consume_keyword_searches()
    else:
        service.consume_triggers()
