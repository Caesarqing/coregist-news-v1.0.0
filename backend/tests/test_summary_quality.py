import unittest
from datetime import datetime

from services.ai_analysis.service import AIAnalysisService
from services.shared.python.llm import LLMProvider


class SummaryQualityTest(unittest.TestCase):
    def test_summary_bounds_by_content_length(self):
        cases = [
            ("短文" * 100, (10, 50)),
            ("中等文章" * 220, (25, 80)),
            ("长篇新闻内容" * 300, (50, 120)),
        ]
        for content, expected in cases:
            self.assertEqual(AIAnalysisService._summary_bounds(content), expected)

    def test_fallback_summary_respects_dynamic_bounds(self):
        cases = [
            "短文" * 100,
            "中等文章" * 220,
            "长篇新闻内容" * 300,
        ]
        for content in cases:
            min_chars, max_chars = AIAnalysisService._summary_bounds(content)
            summary = AIAnalysisService._build_fallback_summary(
                content,
                "测试标题",
                min_chars=min_chars,
                max_chars=max_chars,
            )
            length = AIAnalysisService._summary_length(summary)
            self.assertGreaterEqual(length, min_chars)
            self.assertLessEqual(length, max_chars)
            self.assertTrue(summary.endswith(("。", "！", "？", "!", "?", ".")))

    def test_summary_noise_detection_removes_bylines(self):
        text = "记者：张三\n责任编辑：李四\n当地政府宣布新政策，将影响多地企业运营。"
        self.assertEqual(
            AIAnalysisService._strip_summary_noise_lines(text),
            "当地政府宣布新政策，将影响多地企业运营。",
        )
        self.assertTrue(AIAnalysisService._contains_summary_noise("责任编辑：李四发布消息。"))

    def test_extract_json_object_from_common_model_outputs(self):
        cases = [
            ('{"title_zh":"测试"}', {"title_zh": "测试"}),
            ('```json\n{"title_zh":"测试"}\n```', {"title_zh": "测试"}),
            ('说明文字 {"title_zh":{"nested":"测试"}, "summary_zh":"结果。"} 结束', {"title_zh": {"nested": "测试"}, "summary_zh": "结果。"}),
        ]
        for raw, expected in cases:
            self.assertEqual(LLMProvider._extract_json_object(raw), expected)

    def test_review_bundle_omits_scoring_fields(self):
        service = AIAnalysisService()

        def fake_invoke_json(*_args, **_kwargs):
            return {
                "bias_level": "neutral",
                "analysis_text": "事实表达平衡。",
                "information_density": 9,
                "credibility": 8,
                "impact": 7,
                "reach": 6,
                "overall_score": 8,
                "final_review": "可发布。",
                "review_label": "approved",
            }

        service.llm.invoke_json = fake_invoke_json
        bundle = service._generate_review_bundle(
            {"news_id": "n1", "processed_content": "某地政府宣布新政策，企业将调整运营计划。"},
            {"title_zh": "某地发布新政策", "summary_zh": "某地政府宣布新政策，企业将调整运营计划。"},
        )

        for key in ["information_density", "credibility", "impact", "reach", "overall_score"]:
            self.assertNotIn(key, bundle)
        for key in ["bias_level", "analysis_text", "fact_check", "sentiment", "final_review", "review_label"]:
            self.assertIn(key, bundle)

    def test_news_document_normalizes_sortable_dates(self):
        document = AIAnalysisService._build_news_document(
            {
                "title": "Example",
                "url": "https://example.com/a",
                "posted_at": "2026-05-06T13:51:26.871Z",
                "crawled_at": "",
            },
            {
                "title_en": "Example",
                "title_zh": "示例新闻",
                "summary_en": "Example summary.",
                "summary_zh": "示例摘要。",
            },
        )

        self.assertIsInstance(document["postedAt"], datetime)
        self.assertIsInstance(document["crawledAt"], datetime)


if __name__ == "__main__":
    unittest.main()
