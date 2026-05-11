import unittest
from unittest.mock import patch

from pipeline.scrapers.RequestsScraper import _configured_verify_ssl
from services.shared.python import rss_adapters
from services.shared.python.rss_adapters import classify_fetch_errors, extract_article
from services.shared.python.rss_registry import RssSource


def make_source():
    return RssSource(
        id="test:source",
        publisher_id="test",
        source_en="Test Source",
        source_zh="测试源",
        feed_name="Test Feed",
        feed_url="https://example.com/rss.xml",
        adapter_id="generic_news",
    )


class RssFetchPolicyTest(unittest.TestCase):
    def test_classifies_common_failures(self):
        self.assertEqual(classify_fetch_errors(["403 Client Error"]), "http_403")
        self.assertEqual(classify_fetch_errors(["HTTP response: 429"]), "http_429")
        self.assertEqual(classify_fetch_errors(["Read timed out"]), "timeout")
        self.assertEqual(classify_fetch_errors(["Page.goto: Timeout exceeded"], backend="rendered"), "browser_timeout")
        self.assertEqual(classify_fetch_errors(["SSLError certificate verify failed"]), "ssl_error")

    def test_ssl_verify_defaults_on_and_honors_allowlist(self):
        with patch("pipeline.scrapers.RequestsScraper.settings") as mocked_settings:
            mocked_settings.rss_verify_ssl = True
            mocked_settings.rss_allow_insecure_hosts = ("insecure.example.com",)

            self.assertTrue(_configured_verify_ssl("https://secure.example.com/rss.xml"))
            self.assertFalse(_configured_verify_ssl("https://insecure.example.com/rss.xml"))
            self.assertFalse(_configured_verify_ssl("https://feeds.insecure.example.com/rss.xml"))

    def test_article_uses_rss_description_fallback_on_403(self):
        source = make_source()

        def fake_fetcher(*_args, **_kwargs):
            return {"content": "", "errors": ["http_403"]}

        entry = {
            "title": "Blocked article",
            "url": "https://example.com/blocked",
            "description": "This summary came from the RSS feed and is long enough to be useful.",
            "published_at": "2026-05-11T00:00:00+00:00",
            "media": [],
            "feed_errors": [],
        }

        with patch.object(rss_adapters, "_import_fetcher", return_value=fake_fetcher):
            article = extract_article(source, entry)

        self.assertEqual(article["raw_content"], entry["description"])
        self.assertEqual(article["content_quality"], "rss_summary_only")
        self.assertEqual(article["scrape_error_type"], "http_403")


if __name__ == "__main__":
    unittest.main()
