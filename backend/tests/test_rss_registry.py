import unittest

from services.shared.python.rss_registry import list_rss_sources


class RssRegistryTest(unittest.TestCase):
    def test_removed_stale_or_blocked_sources(self):
        sources = list_rss_sources()
        ids = {source.id for source in sources}
        publishers = {source.publisher_id for source in sources}

        self.assertNotIn("rfi", publishers)
        self.assertNotIn("voa", publishers)
        self.assertNotIn("marketwatch:marketpulse", ids)
        self.assertNotIn("marketwatch:realtime", ids)

    def test_adds_checked_opml_replacement_sources(self):
        ids = {source.id for source in list_rss_sources()}
        for source_id in [
            "bbc:anyfeeder_top",
            "bbc:anyfeeder_world",
            "businessinsider:main",
            "time:main",
            "theatlantic:main",
            "zerohedge:main",
            "vice:main",
            "daringfireball:main",
            "css_tricks:main",
        ]:
            self.assertIn(source_id, ids)

    def test_adds_checked_ai_and_technology_sources(self):
        ids = {source.id for source in list_rss_sources()}
        for source_id in [
            "openai:news",
            "google_ai:main",
            "arxiv:cs_ai",
            "hackernews:ai",
            "theverge:main",
            "wired:main",
            "ithome:main",
            "cisa:news",
            "cloudflare:blog",
            "github:blog",
            "producthunt:main",
        ]:
            self.assertIn(source_id, ids)

    def test_skips_unhealthy_sources_from_technology_opml(self):
        ids = {source.id for source in list_rss_sources()}
        for source_id in [
            "stability_ai:main",
            "bytebytego:main",
            "supabase:blog",
            "deno:blog",
            "freebuf:main",
            "dribbble:popular",
            "vercel:blog",
        ]:
            self.assertNotIn(source_id, ids)


if __name__ == "__main__":
    unittest.main()
