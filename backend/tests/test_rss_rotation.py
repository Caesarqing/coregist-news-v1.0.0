import unittest
from contextlib import contextmanager
from datetime import datetime, timedelta
from unittest.mock import patch

from services.news_scraper.service import NewsScraperService
from services.shared.python.rss_registry import RssSource


def make_source(source_id, *, feed_url=None, priority=50):
    return RssSource(
        id=source_id,
        publisher_id=source_id.split(":")[0],
        source_en=source_id,
        source_zh=source_id,
        feed_name="Main",
        feed_url=feed_url or f"https://{source_id.replace(':', '-')}.example.com/rss.xml",
        adapter_id="generic_news",
        priority=priority,
    )


@contextmanager
def fake_mongo_collection(_name):
    class FakeCollection:
        def find_one(self, *_args, **_kwargs):
            return None

    yield FakeCollection()


class RssRotationTest(unittest.TestCase):
    def test_rotation_advances_cursor_and_wraps(self):
        sources = [
            make_source("source:a", priority=10),
            make_source("source:b", priority=20),
            make_source("source:c", priority=30),
        ]
        now = datetime(2026, 5, 9, 2, 0, 0)

        first, first_cursor = NewsScraperService.select_rotating_sources(
            sources,
            state={"cursor": 0},
            source_limit=2,
            now=now,
        )
        second, second_cursor = NewsScraperService.select_rotating_sources(
            sources,
            state={"cursor": first_cursor},
            source_limit=2,
            now=now,
        )

        self.assertEqual([source.id for source in first], ["source:a", "source:b"])
        self.assertEqual(first_cursor, 2)
        self.assertEqual([source.id for source in second], ["source:c", "source:a"])
        self.assertEqual(second_cursor, 1)

    def test_skips_source_within_min_interval(self):
        sources = [make_source("source:a"), make_source("source:b")]
        now = datetime(2026, 5, 9, 2, 0, 0)
        state = {
            "cursor": 0,
            "sources": {
                "source:a": {
                    "last_attempt_at": now - timedelta(seconds=100),
                },
            },
        }

        selected, cursor = NewsScraperService.select_rotating_sources(
            sources,
            state=state,
            source_limit=2,
            now=now,
            source_min_interval_seconds=900,
        )

        self.assertEqual([source.id for source in selected], ["source:b"])
        self.assertEqual(cursor, 0)

    def test_limits_same_domain_within_batch(self):
        sources = [
            make_source("source:a", feed_url="https://example.com/a.xml"),
            make_source("source:b", feed_url="https://example.com/b.xml"),
            make_source("source:c", feed_url="https://other.example.com/rss.xml"),
        ]

        selected, _cursor = NewsScraperService.select_rotating_sources(
            sources,
            state={"cursor": 0},
            source_limit=3,
            now=datetime(2026, 5, 9, 2, 0, 0),
        )

        self.assertEqual([source.id for source in selected], ["source:a", "source:c"])

    def test_skips_domain_within_min_interval(self):
        sources = [
            make_source("source:a", feed_url="https://example.com/a.xml"),
            make_source("source:b", feed_url="https://other.example.com/rss.xml"),
        ]
        now = datetime(2026, 5, 9, 2, 0, 0)
        state = {
            "cursor": 0,
            "domains": {
                "example__dot__com": {
                    "hostname": "example.com",
                    "last_attempt_at": now - timedelta(seconds=100),
                },
            },
        }

        selected, _cursor = NewsScraperService.select_rotating_sources(
            sources,
            state=state,
            source_limit=2,
            now=now,
            domain_min_interval_seconds=300,
        )

        self.assertEqual([source.id for source in selected], ["source:b"])

    def test_skips_failed_source_during_backoff(self):
        sources = [make_source("source:a"), make_source("source:b")]
        now = datetime(2026, 5, 9, 2, 0, 0)
        state = {
            "cursor": 0,
            "sources": {
                "source:a": {
                    "last_error_at": now - timedelta(seconds=300),
                    "error_count": 2,
                },
            },
        }

        selected, _cursor = NewsScraperService.select_rotating_sources(
            sources,
            state=state,
            source_limit=2,
            now=now,
            source_min_interval_seconds=0,
            source_error_backoff_seconds=1800,
        )

        self.assertEqual([source.id for source in selected], ["source:b"])

    def test_skips_quarantined_source(self):
        sources = [make_source("source:a"), make_source("source:b")]
        now = datetime(2026, 5, 9, 2, 0, 0)
        state = {
            "cursor": 0,
            "sources": {
                "source:a": {
                    "quarantine_until": now + timedelta(hours=1),
                    "last_error_type": "http_403",
                },
            },
        }

        selected, _cursor = NewsScraperService.select_rotating_sources(
            sources,
            state=state,
            source_limit=2,
            now=now,
            source_min_interval_seconds=0,
        )

        self.assertEqual([source.id for source in selected], ["source:b"])

    def test_skips_health_disabled_source(self):
        sources = [make_source("source:a"), make_source("source:b")]
        now = datetime(2026, 5, 9, 2, 0, 0)
        state = {
            "cursor": 0,
            "sources": {
                "source:a": {
                    "disabled_by_health": True,
                },
            },
        }

        selected, _cursor = NewsScraperService.select_rotating_sources(
            sources,
            state=state,
            source_limit=2,
            now=now,
            source_min_interval_seconds=0,
        )

        self.assertEqual([source.id for source in selected], ["source:b"])

    def test_skips_quarantined_domain(self):
        sources = [
            make_source("source:a", feed_url="https://example.com/a.xml"),
            make_source("source:b", feed_url="https://other.example.com/rss.xml"),
        ]
        now = datetime(2026, 5, 9, 2, 0, 0)
        state = {
            "cursor": 0,
            "domains": {
                "example__dot__com": {
                    "hostname": "example.com",
                    "quarantine_until": now + timedelta(hours=1),
                    "last_error_type": "http_429",
                },
            },
        }

        selected, _cursor = NewsScraperService.select_rotating_sources(
            sources,
            state=state,
            source_limit=2,
            now=now,
            domain_min_interval_seconds=0,
        )

        self.assertEqual([source.id for source in selected], ["source:b"])

    def test_explicit_source_filter_does_not_use_rotation(self):
        service = object.__new__(NewsScraperService)
        explicit_source = make_source("source:a")

        with (
            patch("services.news_scraper.service.list_rss_sources", return_value=[explicit_source]) as list_sources,
            patch.object(NewsScraperService, "_load_rss_rotation_state", side_effect=AssertionError("rotation used")),
            patch("services.news_scraper.service.mongo_collection", fake_mongo_collection),
            patch("services.news_scraper.service.fetch_rss_entries", return_value=[]),
        ):
            result = service.collect_rss_news(source_ids=["source:a"], rotate_sources=True)

        self.assertEqual(result, [])
        list_sources.assert_called_once_with(source_ids=["source:a"], publisher_ids=None)


if __name__ == "__main__":
    unittest.main()
