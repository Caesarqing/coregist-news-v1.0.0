from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime

from pipeline.llm.news_prompt import NEWS_CATEGORY_SCHEMA, build_taxonomy_text
from services.shared.python.agent_runtime import build_default_agent_registry, build_default_skillset
from services.shared.python.llm import LLMProvider
from services.shared.python.queue import QUEUE_NEWS_RAW, QUEUE_NEWS_READY, QueueClient, mongo_collection
from services.shared.python.repositories.raw_news_repository import RawNewsRepository
from services.shared.python.settings import settings
from services.shared.python.trackers.news_status_tracker import NewsStatusTracker


CANDIDATE_LIMIT = 5
MODEL_CONFIDENCE_THRESHOLD = 0.62
RULE_FALLBACK_SCORE_THRESHOLD = 8
RULE_FALLBACK_MARGIN_THRESHOLD = 3

CATEGORY_RULES = [
    {
        "level1_code": "military_defense",
        "level2_code": "intl_security_arms_control",
        "keywords": [
            "核战力", "核武器", "核军控", "军控", "核扩散", "不扩散", "安全保障",
            "npt", "nuclear", "arms control", "non-proliferation", "security",
            "核戦力", "核兵器", "核軍縮", "核拡散", "安全保障", "防衛", "軍備",
        ],
        "source_categories": ["defense", "military", "security"],
        "topic_tags": ["国际安全", "军控"],
    },
    {
        "level1_code": "science_technology",
        "level2_code": "it_internet_ai",
        "keywords": ["ai", "人工智能", "大模型", "芯片", "半导体", "算力", "机器人", "算法", "云计算", "科技", "软件", "technology", "semiconductor"],
        "source_categories": ["technology", "tech", "science", "ai"],
        "topic_tags": ["人工智能", "科技"],
    },
    {
        "level1_code": "finance_business",
        "level2_code": "financial_markets",
        "keywords": ["股市", "美股", "a股", "港股", "债券", "基金", "汇率", "加息", "通胀", "银行", "保险", "原油", "油价", "期货", "大宗商品", "finance", "market", "oil", "crude", "futures", "commodities", "volatility"],
        "source_categories": ["business", "markets", "finance", "economy"],
        "topic_tags": ["财经", "金融市场"],
    },
    {
        "level1_code": "finance_business",
        "level2_code": "industry_corporate",
        "keywords": ["利润", "营收", "财报", "季度", "业绩", "公司", "大众汽车", "volkswagen", "profit", "earnings", "revenue", "quarter", "tariff", "关税"],
        "source_categories": ["business", "companies", "company news"],
        "topic_tags": ["企业", "产业经济"],
    },
    {
        "level1_code": "finance_business",
        "level2_code": "trade_investment",
        "keywords": ["关税", "贸易", "投资", "出口", "进口", "供应链", "tariff", "trade", "investment", "export", "import", "supply chain"],
        "source_categories": ["business", "economy", "trade"],
        "topic_tags": ["贸易", "投资"],
    },
    {
        "level1_code": "current_affairs",
        "level2_code": "policy_laws",
        "keywords": ["政策", "国务院", "部委", "法规", "法案", "会议", "规划", "治理", "书记", "主席", "总理"],
        "source_categories": ["politics", "policy", "government"],
        "topic_tags": ["政策", "时政"],
    },
    {
        "level1_code": "international_affairs",
        "level2_code": "geopolitics_conflict",
        "keywords": ["外交", "冲突", "战争", "停火", "制裁", "联合国", "峰会", "欧盟", "北约", "geopolitics", "conflict", "diplomacy", "sanctions"],
        "source_categories": ["world", "international", "global"],
        "topic_tags": ["国际", "地缘政治"],
    },
    {
        "level1_code": "international_affairs",
        "level2_code": "region_europe",
        "keywords": ["欧洲", "欧盟", "英国", "法国", "德国", "西班牙", "europe", "eu", "france", "germany", "spain", "uk"],
        "source_categories": ["europe", "france", "germany"],
        "topic_tags": ["欧洲"],
    },
    {
        "level1_code": "international_affairs",
        "level2_code": "region_americas",
        "keywords": ["美国", "加拿大", "拉美", "美洲", "usa", "u.s.", "america", "canada", "latin america"],
        "source_categories": ["americas", "us & canada", "usa"],
        "topic_tags": ["美洲"],
    },
    {
        "level1_code": "economy_society",
        "level2_code": "consumption_market",
        "keywords": ["消费", "零售", "房价", "就业", "人口", "民生", "教育", "交通", "物价", "经济社会"],
        "source_categories": ["society", "lifestyle", "consumer"],
        "topic_tags": ["民生", "社会"],
    },
    {
        "level1_code": "livelihood_services",
        "level2_code": "transport_travel",
        "keywords": ["交通", "高速", "铁路", "航班", "出行", "旅游", "transport", "travel", "railway", "flight", "traffic"],
        "source_categories": ["transport", "travel"],
        "topic_tags": ["交通出行"],
    },
    {
        "level1_code": "culture_sports_entertainment",
        "level2_code": "sports_events",
        "keywords": ["比赛", "联赛", "冠军", "奥运", "电影", "音乐", "演唱会", "游戏", "sports", "entertainment"],
        "source_categories": ["sports", "entertainment", "culture"],
        "topic_tags": ["文体娱乐"],
    },
    {
        "level1_code": "law_society",
        "level2_code": "public_security",
        "keywords": ["法院", "检察院", "判决", "警方", "诈骗", "案件", "拘捕", "法治", "cybersecurity"],
        "source_categories": ["law", "crime", "security"],
        "topic_tags": ["法治", "社会安全"],
    },
    {
        "level1_code": "healthcare",
        "level2_code": "public_health",
        "keywords": ["医院", "医疗", "疫苗", "药品", "疾病", "癌症", "健康", "health", "hospital", "vaccine", "medicine", "disease", "cancer"],
        "source_categories": ["health", "healthcare", "science"],
        "topic_tags": ["健康", "医疗"],
    },
    {
        "level1_code": "education_talent",
        "level2_code": "higher_education",
        "keywords": ["教育", "学校", "大学", "高考", "招生", "学生", "教师", "education", "school", "university", "student"],
        "source_categories": ["education"],
        "topic_tags": ["教育"],
    },
    {
        "level1_code": "opinion_commentary",
        "level2_code": "in_depth_analysis",
        "keywords": ["评论", "观点", "专栏", "分析", "解读", "opinion", "analysis", "commentary", "editorial"],
        "source_categories": ["analysis", "opinion"],
        "topic_tags": ["观点", "分析"],
    },
]


def _validate_category_rules() -> None:
    for rule in CATEGORY_RULES:
        level1_code = rule["level1_code"]
        level2_code = rule["level2_code"]
        level1 = NEWS_CATEGORY_SCHEMA.get(level1_code)
        if not level1 or level2_code not in (level1.get("sub") or {}):
            raise ValueError(f"Invalid category rule: {level1_code}/{level2_code}")


_validate_category_rules()

ENTITY_PATTERNS = [
    r"[\u4e00-\u9fff]{2,12}(?:公司|集团|银行|证券|大学|医院|政府|法院|检察院|委员会|研究院|实验室|协会|部|局|厅|院)",
    r"(?:OpenAI|Google|Microsoft|Meta|Apple|NVIDIA|Tesla|TSMC|Intel|AMD|Amazon|Anthropic|DeepMind|xAI|阿里巴巴|腾讯|字节跳动|百度|华为|小米|英伟达)",
]
SUMMARY_BLACKLIST = (
    "相关阅读",
    "推荐阅读",
    "点击查看",
    "来源：",
    "原标题",
    "广告",
    "免责声明",
    "分享",
)


class ContentProcessingService:
    def __init__(self) -> None:
        self.registry = build_default_agent_registry()
        self.skillset = build_default_skillset()
        self.queue = QueueClient()
        self.preprocessing_agent = self.registry.get_agent("preprocessing_agent")
        self.classification_agent = self.registry.get_agent("summarization_agent")
        self.llm = LLMProvider()
        self.raw_news_repo = RawNewsRepository()
        self.status_tracker = NewsStatusTracker()

    @staticmethod
    def _agent_llm_kwargs(agent) -> dict:
        config = dict(getattr(agent, "llm_config", {}) or {})
        config.pop("model", None)
        return config

    @staticmethod
    def _normalize_content(text: str) -> str:
        lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
        paragraphs = []
        for line in lines:
            cleaned = re.sub(r"\s+", " ", line).strip()
            if not cleaned:
                continue
            paragraphs.append(cleaned)
        return "\n".join(paragraphs).strip()

    @staticmethod
    def _strip_structural_noise(text: str) -> str:
        lines = []
        for raw_line in (text or "").splitlines():
            line = re.sub(r"\s+", " ", raw_line).strip()
            if not line:
                continue
            lower = line.lower()
            if any(token.lower() in lower for token in SUMMARY_BLACKLIST):
                continue
            if len(line) <= 2:
                continue
            if re.fullmatch(r"[\W_]+", line):
                continue
            lines.append(line)
        return "\n".join(lines).strip()

    @staticmethod
    def _detect_language_profile(text: str) -> dict:
        content = text or ""
        zh_chars = sum(1 for char in content if "\u4e00" <= char <= "\u9fff")
        latin_chars = sum(1 for char in content if ("a" <= char.lower() <= "z"))
        ja_chars = sum(1 for char in content if ("\u3040" <= char <= "\u30ff"))
        ko_chars = sum(1 for char in content if ("\uac00" <= char <= "\ud7af"))
        script_total = max(1, zh_chars + latin_chars + ja_chars + ko_chars)
        ratios = {
            "zh": zh_chars / script_total,
            "en": latin_chars / script_total,
            "ja": ja_chars / script_total,
            "ko": ko_chars / script_total,
        }
        if ja_chars >= 8 and (ja_chars / max(1, zh_chars + ja_chars)) >= 0.12:
            primary_language = "ja"
        else:
            primary_language = max(ratios, key=ratios.get)
        mapped = {
            "zh": "zh-CN",
            "en": "en",
            "ja": "ja",
            "ko": "ko",
        }.get(primary_language, "unknown")
        mixed_segments = [
            segment for segment in content.splitlines()
            if segment.strip()
            and re.search(r"[\u4e00-\u9fff]", segment)
            and re.search(r"[A-Za-z]{3,}", segment)
        ]
        return {
            "source_language": mapped,
            "primary_language_ratio": round(ratios.get(primary_language, 0.0), 4),
            "secondary_language_ratio": round(sorted(ratios.values(), reverse=True)[1], 4),
            "mixed_language_segments": mixed_segments[:10],
        }

    @staticmethod
    def _resolve_category_names(level1_code: str, level2_codes: list[str]) -> dict:
        level1 = NEWS_CATEGORY_SCHEMA.get(level1_code) or {}
        level2_schema = level1.get("sub") or {}
        level2_names_zh = []
        level2_names_en = []
        for code in level2_codes:
            meta = level2_schema.get(code) or {}
            level2_names_zh.append(meta.get("zh", "其他"))
            level2_names_en.append(meta.get("en", "Other"))
        return {
            "level1_name_zh": level1.get("name_zh", "综合"),
            "level1_name_en": level1.get("name_en", "General"),
            "level2_names_zh": level2_names_zh,
            "level2_names_en": level2_names_en,
        }

    @staticmethod
    def _is_valid_category(level1_code: str, level2_codes: list[str]) -> bool:
        level1 = NEWS_CATEGORY_SCHEMA.get(level1_code)
        if not level1:
            return False
        allowed_level2 = level1.get("sub") or {}
        return bool(level2_codes) and all(code in allowed_level2 for code in level2_codes)

    @staticmethod
    def _normalize_confidence(value) -> float:
        try:
            confidence = float(value)
        except Exception:
            return 0.0
        if confidence > 1:
            confidence = confidence / 100
        return max(0.0, min(1.0, confidence))

    @staticmethod
    def _normalize_evidence(value) -> list[str]:
        if isinstance(value, str):
            items = [value]
        elif isinstance(value, list):
            items = [str(item) for item in value]
        else:
            items = []
        return [item.strip() for item in items if item.strip()][:5]

    @staticmethod
    def _extract_entity_tags(title: str, content: str) -> list[str]:
        corpus = "\n".join(filter(None, [title, content]))
        results: list[str] = []
        for pattern in ENTITY_PATTERNS:
            for match in re.findall(pattern, corpus):
                cleaned = str(match).strip(" \n\t:：，,。；;（）()[]")
                if cleaned and cleaned not in results:
                    results.append(cleaned)
        return results[:5]

    @classmethod
    def _build_rule_candidates(cls, *, payload: dict, title: str, normalized: str) -> list[dict]:
        source_categories = [str(item).strip().lower() for item in payload.get("categories", []) if str(item).strip()]
        title_lower = (title or "").lower()
        content_lower = (normalized or "").lower()
        candidates = []

        for rule in CATEGORY_RULES:
            score = 0
            keywords = rule["keywords"]
            source_hints = rule["source_categories"]
            keyword_hits = []
            for keyword in keywords:
                if keyword.lower() in title_lower:
                    score += 4
                    keyword_hits.append(keyword)
                elif keyword.lower() in content_lower:
                    score += 1
                    keyword_hits.append(keyword)
            for source_hint in source_hints:
                if source_hint.lower() in source_categories:
                    score += 3
            if score <= 0:
                continue
            level1_code = rule["level1_code"]
            level2_codes = [rule["level2_code"]]
            resolved = cls._resolve_category_names(level1_code, level2_codes)
            candidates.append({
                "level1_code": level1_code,
                "level1_name_zh": resolved["level1_name_zh"],
                "level1_name_en": resolved["level1_name_en"],
                "level2_codes": level2_codes,
                "level2_names_zh": resolved["level2_names_zh"],
                "level2_names_en": resolved["level2_names_en"],
                "score": score,
                "matched_keywords": list(dict.fromkeys(keyword_hits))[:10],
                "source_category_hits": [hint for hint in source_hints if hint.lower() in source_categories],
                "topic_tags": list(rule.get("topic_tags", [])),
            })

        candidates.sort(key=lambda item: item["score"], reverse=True)
        return candidates[:CANDIDATE_LIMIT]

    def _classify_with_model(self, *, payload: dict, title: str, normalized: str, language_profile: dict, candidates: list[dict]) -> dict | None:
        if not candidates:
            return None
        prompt_payload = {
            "taxonomy": build_taxonomy_text(),
            "candidates": candidates,
            "source": {
                "name_en": payload.get("source_name_en", ""),
                "name_zh": payload.get("source_name_zh", ""),
                "rss_categories": payload.get("categories", []),
                "language": language_profile.get("source_language", "unknown"),
            },
            "title": title,
            "snippet": payload.get("snippet", ""),
            "content_excerpt": (normalized or "")[: min(settings.ai_content_char_limit, 2400)],
        }
        prompt = (
            "你是新闻分类编辑。请根据正文事实判断最合适的新闻分类。\n"
            "优先从 candidates 中选择；如果 candidates 都明显不合适，才允许从 taxonomy 中选择更合适的 code。\n"
            "只能输出 JSON，字段固定为：level1_code, level2_codes, confidence, evidence, reasoning_short。\n"
            "level2_codes 必须属于所选 level1_code；confidence 为 0 到 1；evidence 必须引用标题或正文中的事实词。\n\n"
            f"{json.dumps(prompt_payload, ensure_ascii=False)}"
        )
        try:
            result = self.llm.invoke_json(
                self.classification_agent.llm_config.get("model", "mock"),
                prompt,
                default={},
                strict=True,
                **self._agent_llm_kwargs(self.classification_agent),
            )
        except Exception:
            return None

        level1_code = str(result.get("level1_code", "")).strip()
        raw_level2 = result.get("level2_codes", [])
        if isinstance(raw_level2, str):
            level2_codes = [raw_level2.strip()] if raw_level2.strip() else []
        elif isinstance(raw_level2, list):
            level2_codes = [str(item).strip() for item in raw_level2 if str(item).strip()]
        else:
            level2_codes = []

        if not self._is_valid_category(level1_code, level2_codes):
            return None
        resolved = self._resolve_category_names(level1_code, level2_codes)
        return {
            "level1_code": level1_code,
            "level2_codes": level2_codes,
            **resolved,
            "classification_confidence": self._normalize_confidence(result.get("confidence", 0)),
            "classification_evidence": self._normalize_evidence(result.get("evidence", [])),
            "classification_reasoning": str(result.get("reasoning_short", "")).strip()[:500],
            "classification_method": "model",
        }

    def _classify_content(self, *, payload: dict, title: str, normalized: str, language_profile: dict) -> dict:
        candidates = self._build_rule_candidates(payload=payload, title=title, normalized=normalized)
        model_result = self._classify_with_model(
            payload=payload,
            title=title,
            normalized=normalized,
            language_profile=language_profile,
            candidates=candidates,
        )
        if model_result and model_result["classification_confidence"] >= MODEL_CONFIDENCE_THRESHOLD:
            classification = {
                **model_result,
                "classification_status": "confirmed",
                "classification_candidates": candidates,
            }
        else:
            top = candidates[0] if candidates else None
            second_score = candidates[1]["score"] if len(candidates) > 1 else 0
            can_rule_fallback = bool(
                top
                and top["score"] >= RULE_FALLBACK_SCORE_THRESHOLD
                and (top["score"] - second_score) >= RULE_FALLBACK_MARGIN_THRESHOLD
            )
            if can_rule_fallback:
                classification = {
                    "level1_code": top["level1_code"],
                    "level2_codes": top["level2_codes"],
                    "level1_name_zh": top["level1_name_zh"],
                    "level1_name_en": top["level1_name_en"],
                    "level2_names_zh": top["level2_names_zh"],
                    "level2_names_en": top["level2_names_en"],
                    "classification_status": "confirmed",
                    "classification_method": "rule_fallback",
                    "classification_confidence": min(0.85, top["score"] / 14),
                    "classification_evidence": top.get("matched_keywords", [])[:5],
                    "classification_reasoning": "High-confidence rule fallback after model classification was unavailable or low-confidence.",
                    "classification_candidates": candidates,
                }
            else:
                classification = {
                    "level1_code": "",
                    "level2_codes": [],
                    "level1_name_zh": "",
                    "level1_name_en": "",
                    "level2_names_zh": [],
                    "level2_names_en": [],
                    "classification_status": "needs_review" if candidates else "failed",
                    "classification_method": "model_low_confidence" if model_result else "unclassified",
                    "classification_confidence": model_result.get("classification_confidence", 0) if model_result else 0,
                    "classification_evidence": model_result.get("classification_evidence", []) if model_result else [],
                    "classification_reasoning": model_result.get("classification_reasoning", "No reliable classification candidate.") if model_result else "No reliable classification candidate.",
                    "classification_candidates": candidates,
                }

        level1_code = classification.get("level1_code", "")
        level2_codes = classification.get("level2_codes", [])
        resolved = self._resolve_category_names(level1_code, level2_codes)
        topic_tags = []
        if classification.get("classification_status") == "confirmed":
            for candidate in candidates:
                if candidate.get("level1_code") == level1_code:
                    for item in candidate.get("topic_tags", []):
                        if item not in topic_tags:
                            topic_tags.append(item)
                    for item in candidate.get("matched_keywords", []):
                        if re.fullmatch(r"[A-Za-z0-9 ._-]+", item):
                            continue
                        if item not in topic_tags:
                            topic_tags.append(item)
                    break
        entity_tags = self._extract_entity_tags(title, normalized)
        tags_zh = []
        for item in [*topic_tags, *entity_tags]:
            cleaned = str(item).strip()
            if cleaned and cleaned not in tags_zh:
                tags_zh.append(cleaned)

        return {
            **classification,
            "level1_name_zh": resolved["level1_name_zh"] if level1_code else "",
            "level1_name_en": resolved["level1_name_en"] if level1_code else "",
            "level2_names_zh": resolved["level2_names_zh"] if level1_code else [],
            "level2_names_en": resolved["level2_names_en"] if level1_code else [],
            "topic_tags": topic_tags[:5],
            "entity_tags": entity_tags[:5],
            "tags_zh": tags_zh[:8],
            "tags_en": [],
            "source_language": language_profile["source_language"],
            "display_language": "zh-CN",
        }

    @staticmethod
    def _build_quality_metrics(text: str, language_profile: dict) -> dict:
        original = (text or "").strip()
        normalized = " ".join(original.split()).strip()
        paragraphs = [segment.strip() for segment in original.splitlines() if segment.strip()]
        words = [segment for segment in normalized.split() if segment.strip()]
        lines = [segment.strip() for segment in original.splitlines() if segment.strip()]
        unique_lines = {segment for segment in lines if segment}
        duplicate_line_ratio = 0.0
        if lines:
            duplicate_line_ratio = max(0.0, 1 - (len(unique_lines) / len(lines)))
        noise_markers = (
            "copyright",
            "all rights reserved",
            "相关阅读",
            "推荐阅读",
            "分享到",
            "责任编辑",
            "广告",
            "免责声明",
        )
        noisy_lines = sum(
            1
            for segment in lines
            if len(segment) <= 120 and any(marker in segment.lower() for marker in noise_markers)
        )
        noise_ratio = (noisy_lines / len(lines)) if lines else 0.0
        return {
            "char_count": len(normalized),
            "word_count": len(words),
            "paragraph_count": len(paragraphs),
            "line_count": len(lines),
            "duplicate_line_ratio": round(duplicate_line_ratio, 4),
            "noise_ratio": round(noise_ratio, 4),
            "primary_language_ratio": language_profile.get("primary_language_ratio", 0.0),
            "secondary_language_ratio": language_profile.get("secondary_language_ratio", 0.0),
            "mixed_language_segment_count": len(language_profile.get("mixed_language_segments", [])),
            "source_language": language_profile.get("source_language", "unknown"),
        }

    @staticmethod
    def _passes_quality_gate(metrics: dict) -> bool:
        return (
            metrics.get("char_count", 0) >= 80
            and metrics.get("word_count", 0) >= 20
            and metrics.get("paragraph_count", 0) >= 1
            and metrics.get("duplicate_line_ratio", 1) <= 0.45
            and metrics.get("noise_ratio", 1) <= 0.35
            and metrics.get("primary_language_ratio", 0) >= 0.5
            and metrics.get("mixed_language_segment_count", 99) <= 6
        )

    def process_news(self, payload: dict, *, publish: bool = True) -> dict:
        cleaned = self.skillset.get_skill("text_cleaner").execute(text=payload.get("raw_content", ""))
        cleaned = self._strip_structural_noise(cleaned)
        normalized = self._normalize_content(cleaned)
        language_profile = self._detect_language_profile(normalized or cleaned)
        quality_metrics = self._build_quality_metrics(cleaned, language_profile)
        language = language_profile.get("source_language") or self.skillset.get_skill("language_detector").execute(text=cleaned)
        classification = self._classify_content(
            payload=payload,
            title=payload.get("title", ""),
            normalized=normalized,
            language_profile=language_profile,
        )
        feed_snapshot = {
            "query": payload.get("query", ""),
            "title": payload.get("title", ""),
            "url": payload.get("url", ""),
            "snippet": payload.get("snippet", ""),
            "source_name_en": payload.get("source_name_en", ""),
            "source_name_zh": payload.get("source_name_zh", ""),
            "posted_at": payload.get("posted_at"),
            "keywords": payload.get("keywords", []),
        }
        crawl_snapshot = {
            "backend": payload.get("scrape_backend", ""),
            "crawled_at": payload.get("crawled_at"),
            "raw_html_length": len(payload.get("raw_html", "") or ""),
            "raw_content_length": len(payload.get("raw_content", "") or ""),
            "errors": payload.get("errors", []),
        }
        extracted_content = {
            "title": payload.get("title", ""),
            "body": cleaned,
            "language": language,
        }
        
        # Build raw news document with all content
        raw_doc = {
            **payload,
            "processed_content": cleaned,
            "normalized_content": normalized,
            "content_quality": quality_metrics,
            "feed_snapshot": feed_snapshot,
            "crawl_snapshot": crawl_snapshot,
            "extracted_content": extracted_content,
            "raw_html": payload.get("raw_html", ""),
            "language": language,
            "source_language": classification.get("source_language", language),
            "display_language": classification.get("display_language", "zh-CN"),
            "primary_language_ratio": language_profile.get("primary_language_ratio", 0.0),
            "secondary_language_ratio": language_profile.get("secondary_language_ratio", 0.0),
            "mixed_language_segments": language_profile.get("mixed_language_segments", []),
            "level1_code": classification.get("level1_code", ""),
            "level1_name_zh": classification.get("level1_name_zh", ""),
            "level1_name_en": classification.get("level1_name_en", ""),
            "level2_codes": classification.get("level2_codes", []),
            "level2_names_zh": classification.get("level2_names_zh", []),
            "level2_names_en": classification.get("level2_names_en", []),
            "topic_tags": classification.get("topic_tags", []),
            "entity_tags": classification.get("entity_tags", []),
            "tags_zh": classification.get("tags_zh", []),
            "tags_en": classification.get("tags_en", []),
            "classification_status": classification.get("classification_status", "failed"),
            "classification_method": classification.get("classification_method", ""),
            "classification_confidence": classification.get("classification_confidence", 0),
            "classification_evidence": classification.get("classification_evidence", []),
            "classification_reasoning": classification.get("classification_reasoning", ""),
            "classification_candidates": classification.get("classification_candidates", []),
            "image_link": payload.get("image_link", ""),
            "image_confidence": payload.get("image_confidence", "none"),
            "image_source_type": payload.get("image_source_type", "none"),
            "image_fallback_type": payload.get("image_fallback_type", ""),
            "source_logo_url": payload.get("source_logo_url", ""),
            "processing_status": "pending",
            "processed_at": datetime.utcnow().isoformat(),
            "agent_id": self.preprocessing_agent.id,
            "search_job_id": payload.get("search_job_id", ""),
            "discovery_id": payload.get("discovery_id", ""),
            "user_id": payload.get("user_id", ""),
            "keywords": payload.get("keywords", []),
        }
        
        # Persist to raw_news collection
        news_id = self.raw_news_repo.upsert(raw_doc)

        if not self._passes_quality_gate(quality_metrics):
            failure_reason = "Content quality gate failed"
            self.raw_news_repo.update_status(news_id, {
                "processing_status": "failed",
                "last_error": failure_reason,
            })
            self.status_tracker.update_status(news_id, {
                "status": "failed",
                "stage": "cleaning",
                "error": failure_reason,
            })
            if payload.get("discovery_id"):
                with mongo_collection("user_discovery_news") as collection:
                    collection.update_one(
                        {"discovery_id": payload.get("discovery_id")},
                        {
                            "$set": {
                                "status": "enrichment_failed",
                                "error": failure_reason,
                                "updatedAt": datetime.utcnow(),
                            },
                        },
                    )
            return {"news_id": news_id, "status": "failed", "error": failure_reason}
        
        # Create status tracking record
        try:
            self.status_tracker.create_status(news_id, {
                "status": "pending",
                "stage": "cleaning",
            })
        except Exception:
            # Status might already exist, update instead
            self.status_tracker.update_status(news_id, {
                "status": "pending",
                "stage": "cleaning",
            })
        
        # Update status to ready after successful persistence
        self.raw_news_repo.update_status(news_id, {"processing_status": "ready"})
        self.status_tracker.update_status(news_id, {
            "status": "ready",
            "stage": "cleaning",
        })
        
        if payload.get("discovery_id"):
            with mongo_collection("user_discovery_news") as collection:
                collection.update_one(
                    {"discovery_id": payload.get("discovery_id")},
                    {"$set": {"status": "ready_for_ai", "updatedAt": datetime.utcnow()}},
                )

        if publish:
            processed_payload = {
                "news_id": news_id,
                "search_job_id": payload.get("search_job_id", ""),
                "discovery_id": payload.get("discovery_id", ""),
                "user_id": payload.get("user_id", ""),
                "keywords": payload.get("keywords", []),
            }
            self.queue.publish(QUEUE_NEWS_READY, processed_payload)
        
        return {"news_id": news_id, "status": "ready"}

    def consume(self) -> None:
        self.queue.consume(QUEUE_NEWS_RAW, self.process_news)


if __name__ == "__main__":
    ContentProcessingService().consume()
