from services.shared.python.rss_adapters import RssFetchError, classify_fetch_errors, extract_article, fetch_rss_entries
from services.shared.python.rss_registry import RssSource, list_rss_sources


def run_rss_ingestion(*args, **kwargs):
    from services.shared.python.rss_ingestion import run_rss_ingestion as _run_rss_ingestion

    return _run_rss_ingestion(*args, **kwargs)

__all__ = [
    "RssSource",
    "RssFetchError",
    "classify_fetch_errors",
    "extract_article",
    "fetch_rss_entries",
    "list_rss_sources",
    "run_rss_ingestion",
]
