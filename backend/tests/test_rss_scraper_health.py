import unittest
from contextlib import contextmanager
from unittest.mock import Mock, patch

from services.news_scraper.service import NewsScraperService
from services.shared.python.rss import RssFetchError
from services.shared.python.rss_registry import RssSource


class RssScraperHealthTest(unittest.TestCase):
    def test_http_limited_article_stops_remaining_source_items(self):
        service = object.__new__(NewsScraperService)
        source = RssSource(
            id="blocked:main",
            publisher_id="blocked",
            source_en="Blocked",
            source_zh="Blocked",
            feed_name="Main",
            feed_url="https://blocked.example/feed",
            adapter_id="generic_news",
        )
        entries = [
            {"url": "https://blocked.example/a", "title": "A", "description": "A"},
            {"url": "https://blocked.example/b", "title": "B", "description": "B"},
        ]

        @contextmanager
        def fake_mongo_collection(_name):
            yield Mock()

        service._load_rss_rotation_state = Mock(return_value={})
        service._save_rss_rotation_cursor = Mock()
        service._mark_rss_source_attempt = Mock()
        service._mark_rss_source_error = Mock()
        service._mark_rss_source_success = Mock()

        with (
            patch("services.news_scraper.service.list_rss_sources", return_value=[source]),
            patch("services.news_scraper.service.fetch_rss_entries", return_value=entries),
            patch(
                "services.news_scraper.service.extract_article",
                side_effect=RssFetchError("blocked", error_type="http_403"),
            ) as extract_article,
            patch("services.news_scraper.service.mongo_collection", fake_mongo_collection),
        ):
            items = service.collect_rss_news(rotate_sources=True, source_limit=1)

        self.assertEqual(items, [])
        self.assertEqual(extract_article.call_count, 1)
        service._mark_rss_source_error.assert_called_once()
        service._mark_rss_source_success.assert_not_called()


if __name__ == "__main__":
    unittest.main()
