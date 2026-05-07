import unittest
from time import struct_time

from pipeline.tools.RSSFetcher import parse_feed
from services.shared.python.rss_adapters import _entry_published_at, _normalize_published


class RssDateParsingTest(unittest.TestCase):
    def test_normalizes_iso_updated_date(self):
        self.assertEqual(
            _normalize_published("2026-05-06T14:23:00Z"),
            "2026-05-06T14:23:00+00:00",
        )

    def test_normalizes_month_name_gmt_date(self):
        self.assertEqual(
            _normalize_published("May 06, 2026 19:35 GMT"),
            "2026-05-06T19:35:00+00:00",
        )

    def test_parse_feed_preserves_raw_published_when_parsed_date_missing(self):
        feed = parse_feed(
            """<?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
              <channel>
                <title>Example</title>
                <item>
                  <title>Market item</title>
                  <link>https://example.com/news</link>
                  <pubDate>May 06, 2026 19:35 GMT</pubDate>
                  <description>Example item</description>
                </item>
              </channel>
            </rss>
            """
        )
        self.assertEqual(len(feed.entries), 1)
        self.assertEqual(_entry_published_at(feed.entries[0]), "2026-05-06T19:35:00+00:00")

    def test_normalizes_struct_time(self):
        value = struct_time((2026, 5, 6, 0, 0, 0, 2, 126, 0))
        self.assertEqual(_normalize_published(value), "2026-05-06T00:00:00+00:00")


if __name__ == "__main__":
    unittest.main()
