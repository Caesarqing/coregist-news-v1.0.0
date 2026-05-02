from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any

from pipeline.llm.news_prompt import build_prompt as build_summary_prompt
from services.shared.python.agent_runtime import build_default_agent_registry, build_default_skillset
from services.shared.python.llm import LLMProvider
from services.shared.python.news_identity import build_news_identity, build_news_lookup_query
from services.shared.python.queue import (
    QUEUE_AI_TASKS,
    QUEUE_NEWS_BIAS,
    QUEUE_NEWS_EVALUATED,
    QUEUE_NEWS_FINAL,
    QUEUE_NEWS_NOTIFICATIONS,
    QUEUE_NEWS_SUMMARIZED,
    QueueClient,
    mongo_collection,
)
from services.shared.python.repositories.raw_news_repository import RawNewsRepository
from services.shared.python.settings import settings
from services.shared.python.trackers.news_status_tracker import NewsStatusTracker


class AIAnalysisService:
    def __init__(self) -> None:
        self.registry = build_default_agent_registry()
        self.skillset = build_default_skillset()
        self.llm = LLMProvider()
        self.queue = QueueClient()
        self.raw_news_repo = RawNewsRepository()
        self.status_tracker = NewsStatusTracker()

    @staticmethod
    def _merge_defaults(result: dict, default: dict) -> dict:
        merged = default.copy()
        if isinstance(result, dict):
            for key, value in result.items():
                if value not in (None, "", [], {}):
                    merged[key] = value
        return merged

    @staticmethod
    def _agent_llm_kwargs(agent: Any) -> dict[str, Any]:
        config = dict(getattr(agent, "llm_config", {}) or {})
        config.pop("model", None)
        return config

    @staticmethod
    def _normalize_list(value: Any, fallback: list[str], *, limit: int = 10) -> list[str]:
        if isinstance(value, str):
            items = [part.strip() for part in value.split(",") if part.strip()]
        elif isinstance(value, list):
            items = [str(part).strip() for part in value if str(part).strip()]
        else:
            items = []
        return (items or list(fallback))[:limit]

    @staticmethod
    def _pick_keys(payload: dict, keys: list[str]) -> dict:
        return {key: payload.get(key) for key in keys if key in payload}

    @staticmethod
    def _clean_title(title: str) -> str:
        text = re.sub(r"\s+", " ", (title or "")).strip()
        text = re.sub(r"\s*[-|｜_]\s*(?:BBC|Reuters|路透社|新华社|中新网|观察者网|央视新闻).*$", "", text, flags=re.I)
        text = re.sub(r"^(?:原标题[:：]\s*)", "", text)
        return text.strip(" -|｜_")

    @staticmethod
    def _contains_mixed_language_noise(text: str) -> bool:
        if not text:
            return False
        return bool(re.search(r"[\u4e00-\u9fff].*[A-Za-z]{4,}", text) and re.search(r"[A-Za-z]{4,}.*[\u4e00-\u9fff]", text))

    @staticmethod
    def _looks_like_chinese_text(text: str, *, min_cjk_chars: int = 2) -> bool:
        value = (text or "").strip()
        if not value:
            return False
        cjk_chars = re.findall(r"[\u4e00-\u9fff]", value)
        kana_chars = re.findall(r"[\u3040-\u30ff]", value)
        if len(cjk_chars) < min_cjk_chars:
            return False
        if kana_chars and (len(kana_chars) / max(1, len(cjk_chars) + len(kana_chars))) >= 0.05:
            return False
        return True

    @classmethod
    def _has_valid_chinese_fields(cls, payload: dict) -> bool:
        return (
            cls._looks_like_chinese_text(payload.get("title_zh", ""), min_cjk_chars=4)
            and cls._looks_like_chinese_text(payload.get("summary_zh", ""), min_cjk_chars=12)
        )

    @staticmethod
    def _looks_like_english_text(text: str, *, min_latin_chars: int = 8) -> bool:
        value = (text or "").strip()
        if not value:
            return False
        latin_chars = re.findall(r"[A-Za-z]", value)
        non_english_script = re.findall(r"[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0600-\u06ff]", value)
        if len(latin_chars) < min_latin_chars:
            return False
        if non_english_script:
            return False
        return True

    @classmethod
    def _has_valid_english_fields(cls, payload: dict) -> bool:
        return (
            cls._looks_like_english_text(payload.get("title_en", ""), min_latin_chars=8)
            and cls._looks_like_english_text(payload.get("summary_en", ""), min_latin_chars=24)
        )

    @staticmethod
    def _ensure_complete_sentence(text: str) -> str:
        value = re.sub(r"\s+", " ", (text or "")).strip()
        if not value:
            return ""
        if value[-1] not in "。！？!?.":
            sentence_parts = re.split(r"(?<=[。！？!?\.])", value)
            completed = [part.strip() for part in sentence_parts if part.strip() and part.strip()[-1] in "。！？!?."]
            if completed:
                return completed[0]
            value = value.rstrip("，,、；;：:")
            return f"{value}。"
        return value

    @staticmethod
    def _build_fallback_summary(content: str, title: str) -> str:
        cleaned = re.sub(r"\s+", " ", (content or "")).strip()
        if not cleaned:
            return AIAnalysisService._ensure_complete_sentence(title)
        pieces = re.split(r"(?<=[。！？!?\.])", cleaned)
        selected = []
        current_length = 0
        for piece in pieces:
            sentence = piece.strip()
            if not sentence:
                continue
            if any(token in sentence.lower() for token in ["相关阅读", "推荐阅读", "点击查看", "source:", "copyright", "广告", "原标题"]):
                continue
            next_length = current_length + len(sentence)
            if next_length > 118 and selected:
                break
            selected.append(sentence)
            current_length = next_length
            if current_length >= 70:
                break
        summary = "".join(selected) or cleaned[:100]
        summary = summary[:120].rstrip("，,、；;：:")
        return AIAnalysisService._ensure_complete_sentence(summary)

    @staticmethod
    def _is_valid_summary(summary: str, content: str) -> bool:
        value = (summary or "").strip()
        if not value:
            return False
        if any(token in value.lower() for token in ["相关阅读", "推荐阅读", "点击查看", "来源：", "原标题", "广告", "免责声明", "share", "copyright"]):
            return False
        if len(value) < 20 or len(value) > 140:
            return False
        if AIAnalysisService._contains_mixed_language_noise(value):
            return False
        if value[-1] not in "。！？!?.":
            return False
        anchors = [segment for segment in re.findall(r"[\u4e00-\u9fffA-Za-z0-9]{2,12}", value) if len(segment) >= 2]
        if not re.search(r"[\u4e00-\u9fff]", content or "") or re.search(r"[\u3040-\u30ff]", content or ""):
            return True
        content_lower = (content or "").lower()
        return any(anchor.lower() in content_lower for anchor in anchors[:8])

    def _generate_content_metadata(self, payload: dict) -> dict:
        agent = self.registry.get_agent("summarization_agent")
        content = payload.get("normalized_content") or payload.get("processed_content", "")
        title = self._clean_title(payload.get("title", ""))
        source_language = payload.get("source_language") or payload.get("language") or "unknown"
        title_en_default = title if source_language == "en" else ""
        summary_en_default = payload.get("snippet", "") if source_language == "en" else ""
        fallback_summary = self._build_fallback_summary(content, title)
        default = {
            "title_en": title_en_default,
            "title_zh": title,
            "summary_en": summary_en_default,
            "summary_zh": fallback_summary,
            "level1_code": payload.get("level1_code", ""),
            "level1_name_zh": payload.get("level1_name_zh", ""),
            "level1_name_en": payload.get("level1_name_en", ""),
            "level2_codes": list(payload.get("level2_codes", [])),
            "level2_names_zh": list(payload.get("level2_names_zh", [])),
            "level2_names_en": list(payload.get("level2_names_en", [])),
            "topic_tags": list(payload.get("topic_tags", [])),
            "entity_tags": list(payload.get("entity_tags", [])),
            "tags_zh": list(payload.get("tags_zh", [])),
            "tags_en": list(payload.get("tags_en", [])),
            "classification_status": payload.get("classification_status", "failed"),
            "classification_method": payload.get("classification_method", ""),
            "classification_confidence": payload.get("classification_confidence", 0),
            "classification_evidence": list(payload.get("classification_evidence", [])),
            "classification_reasoning": payload.get("classification_reasoning", ""),
            "classification_candidates": list(payload.get("classification_candidates", [])),
            "source_language": source_language,
            "display_language": payload.get("display_language", "zh-CN"),
            "image_confidence": payload.get("image_confidence", "none"),
            "image_source_type": payload.get("image_source_type", "none"),
            "image_fallback_type": payload.get("image_fallback_type", ""),
            "source_logo_url": payload.get("source_logo_url", ""),
        }
        excerpt = (content or "")[: settings.ai_content_char_limit]
        prompt = build_summary_prompt(
            title=title,
            text=excerpt,
            source_name=payload.get("source_name_zh") or payload.get("source_name_en") or "",
            source_language=source_language,
        )
        raw = self.llm.invoke_json(
            agent.llm_config.get("model", "mock"),
            prompt,
            default=default,
            strict=True,
            **self._agent_llm_kwargs(agent),
        )
        merged = self._merge_defaults(raw, default)
        merged["title_zh"] = self._clean_title(merged.get("title_zh") or title)
        merged["summary_zh"] = self._ensure_complete_sentence((merged.get("summary_zh") or "").strip())
        needs_repair = (
            not self._is_valid_summary(merged["summary_zh"], excerpt)
            or not self._has_valid_chinese_fields(merged)
            or not self._has_valid_english_fields(merged)
        )
        if needs_repair:
            repair_prompt = (
                "请重新输出 JSON，只包含 title_zh、summary_zh、title_en、summary_en。"
                "其中 title_zh 和 summary_zh 必须翻译为简体中文，不能保留日文假名、韩文、英文长句或原文标题。"
                "title_en 和 summary_en 必须翻译/改写为自然英文，不能留空，也不能保留非英文原文。"
                "summary_zh 必须是 120 字内的完整中文句子，summary_en 必须是 240 字符内的完整英文句子。"
                "不要包含模板词、来源说明、广告词或截断片段。\n\n"
                f"原始语言：{source_language}\n\n原标题：{title}\n\n新闻正文：{excerpt}"
            )
            repaired = self.llm.invoke_json(
                agent.llm_config.get("model", "mock"),
                repair_prompt,
                default=default,
                strict=True,
                **self._agent_llm_kwargs(agent),
            )
            repaired_summary = self._ensure_complete_sentence((repaired.get("summary_zh") or "").strip())
            repaired_payload = {
                "title_zh": self._clean_title(repaired.get("title_zh") or ""),
                "summary_zh": repaired_summary,
                "title_en": self._clean_title(repaired.get("title_en") or ""),
                "summary_en": (repaired.get("summary_en") or "").strip(),
            }
            if (
                self._is_valid_summary(repaired_summary, excerpt)
                and self._has_valid_chinese_fields(repaired_payload)
                and self._has_valid_english_fields(repaired_payload)
            ):
                merged["summary_zh"] = repaired_summary
                merged["title_zh"] = repaired_payload["title_zh"]
                merged["title_en"] = repaired_payload["title_en"]
                merged["summary_en"] = repaired_payload["summary_en"]
            else:
                raise ValueError("LLM did not return valid Simplified Chinese and English title/summary fields")
        merged["summary_en"] = (merged.get("summary_en") or summary_en_default or "").strip()
        merged["title_en"] = (merged.get("title_en") or title_en_default or "").strip()
        return self._pick_keys(
            merged,
            [
                "title_en",
                "title_zh",
                "summary_en",
                "summary_zh",
                "level1_code",
                "level1_name_zh",
                "level1_name_en",
                "level2_codes",
                "level2_names_zh",
                "level2_names_en",
                "topic_tags",
                "entity_tags",
                "tags_en",
                "tags_zh",
                "classification_status",
                "classification_method",
                "classification_confidence",
                "classification_evidence",
                "classification_reasoning",
                "classification_candidates",
                "source_language",
                "display_language",
                "image_confidence",
                "image_source_type",
                "image_fallback_type",
                "source_logo_url",
            ],
        )

    def _generate_review_bundle(self, payload: dict, metadata: dict) -> dict:
        agent = self.registry.get_agent("review_agent")
        content = payload.get("processed_content", "")
        news_id = payload.get("news_id", "")
        fact_result = self.skillset.get_skill("fact_checker").execute(text=content)
        sentiment_result = self.skillset.get_skill("sentiment_analyzer").execute(text=content)
        kg_result = self.skillset.get_skill("knowledge_graph_query").execute(query=content)
        social_result = self.skillset.get_skill("social_media_monitor").execute(news_id=news_id)
        default = {
            "bias_level": "unknown",
            "analysis_text": "",
            "information_density": 5,
            "credibility": 5,
            "impact": 5,
            "reach": 5,
            "overall_score": 5,
            "reasoning": "",
            "final_review": "",
            "review_label": "needs_attention",
            "fact_check": fact_result,
            "sentiment": sentiment_result,
            "knowledge_graph": kg_result,
            "social_impact": social_result,
        }
        compact_payload = {
            "title": metadata.get("title_zh") or payload.get("title") or "",
            "summary_zh": metadata.get("summary_zh", ""),
            "topic_tags": metadata.get("topic_tags", []),
            "entity_tags": metadata.get("entity_tags", []),
            "tags_zh": metadata.get("tags_zh", []),
            "level1_code": metadata.get("level1_code", ""),
            "level1_name_zh": metadata.get("level1_name_zh", ""),
            "level2_codes": metadata.get("level2_codes", []),
            "level2_names_zh": metadata.get("level2_names_zh", []),
            "content_excerpt": content[: settings.ai_review_char_limit],
            "fact_check": fact_result,
            "sentiment": sentiment_result,
            "knowledge_graph": kg_result,
            "social_impact": social_result,
        }
        prompt = (
            f"{agent.prompt_template.format(payload=json.dumps(compact_payload, ensure_ascii=False))}\n"
            "请严格输出 JSON，字段包括："
            "bias_level,analysis_text,information_density,credibility,impact,reach,overall_score,reasoning,final_review,review_label。"
        )
        raw = self.llm.invoke_json(
            agent.llm_config.get("model", "mock"),
            prompt,
            default=default,
            **self._agent_llm_kwargs(agent),
        )
        merged = self._merge_defaults(raw, default)
        merged["fact_check"] = fact_result
        merged["sentiment"] = sentiment_result
        merged["knowledge_graph"] = kg_result
        merged["social_impact"] = social_result
        return self._pick_keys(
            merged,
            [
                "bias_level",
                "analysis_text",
                "information_density",
                "credibility",
                "impact",
                "reach",
                "overall_score",
                "reasoning",
                "final_review",
                "review_label",
                "fact_check",
                "sentiment",
                "knowledge_graph",
                "social_impact",
            ],
        )

    @staticmethod
    def _build_search_fields(payload: dict, metadata: dict) -> dict:
        def _clean_parts(parts: list[Any]) -> list[str]:
            return [str(item).strip() for item in parts if str(item or "").strip()]

        zh_parts = _clean_parts([
            metadata.get("title_zh"),
            metadata.get("summary_zh"),
            " ".join(metadata.get("tags_zh", [])),
            " ".join(metadata.get("topic_tags", [])),
            " ".join(metadata.get("entity_tags", [])),
            payload.get("source_name_zh"),
            payload.get("source_name_en"),
            metadata.get("level1_name_zh"),
            " ".join(metadata.get("level2_names_zh", [])),
        ])
        en_parts = _clean_parts([
            metadata.get("title_en"),
            metadata.get("summary_en"),
            " ".join(metadata.get("tags_en", [])),
            payload.get("source_name_en"),
            payload.get("source_name_zh"),
            metadata.get("level1_name_en"),
            " ".join(metadata.get("level2_names_en", [])),
        ])
        return {
            "search_text_zh": " ".join(zh_parts),
            "search_text_en": " ".join(en_parts),
            "search_sources": _clean_parts([payload.get("source_name_zh"), payload.get("source_name_en"), payload.get("source_id")]),
            "search_categories": _clean_parts([
                metadata.get("level1_name_zh"),
                metadata.get("level1_name_en"),
                *metadata.get("level2_names_zh", []),
                *metadata.get("level2_names_en", []),
            ]),
        }

    @staticmethod
    def _build_news_document(payload: dict, metadata: dict, evaluation: dict) -> dict:
        tags_en = list(metadata.get("tags_en", []))[:10]
        tags_zh = list(metadata.get("tags_zh", []))[:10]
        image_confidence = metadata.get("image_confidence", payload.get("image_confidence", "none"))
        image_source_type = metadata.get("image_source_type", payload.get("image_source_type", "none"))
        image_fallback_type = metadata.get("image_fallback_type", payload.get("image_fallback_type", ""))
        image_link = payload.get("image_link") or ""
        if image_fallback_type == "source_logo" or image_source_type == "source_logo":
            image_link = ""
        posted_at = payload.get("posted_at")
        crawled_at = payload.get("crawled_at")
        document = {
            "title_en": metadata.get("title_en") or payload.get("title") or "",
            "title_zh": metadata.get("title_zh") or payload.get("title") or "",
            "summary_en": metadata.get("summary_en") or payload.get("snippet") or "",
            "summary_zh": metadata.get("summary_zh") or payload.get("snippet") or "",
            "link": payload.get("url") or "",
            "canonical_link": payload.get("canonical_link") or "",
            "title_hash": payload.get("title_hash") or "",
            "image_link": image_link,
            "image_confidence": image_confidence,
            "image_source_type": image_source_type,
            "image_fallback_type": image_fallback_type,
            "source_logo_url": metadata.get("source_logo_url", payload.get("source_logo_url", "")),
            "level1_code": metadata.get("level1_code") or payload.get("level1_code", ""),
            "level1_name_zh": metadata.get("level1_name_zh") or payload.get("level1_name_zh", ""),
            "level1_name_en": metadata.get("level1_name_en") or payload.get("level1_name_en", ""),
            "level2_codes": list(metadata.get("level2_codes", payload.get("level2_codes", [])))[:5],
            "level2_names_zh": list(metadata.get("level2_names_zh", payload.get("level2_names_zh", [])))[:5],
            "level2_names_en": list(metadata.get("level2_names_en", payload.get("level2_names_en", [])))[:5],
            "topic_tags": list(metadata.get("topic_tags", payload.get("topic_tags", [])))[:5],
            "entity_tags": list(metadata.get("entity_tags", payload.get("entity_tags", [])))[:5],
            "tags_en": tags_en,
            "tags_zh": tags_zh,
            "classification_status": metadata.get("classification_status", payload.get("classification_status", "failed")),
            "classification_method": metadata.get("classification_method", payload.get("classification_method", "")),
            "classification_confidence": metadata.get("classification_confidence", payload.get("classification_confidence", 0)),
            "classification_evidence": list(metadata.get("classification_evidence", payload.get("classification_evidence", [])))[:5],
            "classification_reasoning": metadata.get("classification_reasoning", payload.get("classification_reasoning", "")),
            "classification_candidates": list(metadata.get("classification_candidates", payload.get("classification_candidates", [])))[:5],
            "sourceId": payload.get("source_id") or payload.get("publisher_id") or "",
            "source_en": payload.get("source_name_en") or "",
            "source_zh": payload.get("source_name_zh") or payload.get("source_name_en") or "",
            **AIAnalysisService._build_search_fields(payload, metadata),
            "postedAt": posted_at,
            "crawledAt": crawled_at,
            "language": payload.get("language") or "en",
            "source_language": metadata.get("source_language", payload.get("source_language", payload.get("language") or "en")),
            "display_language": metadata.get("display_language", payload.get("display_language", "zh-CN")),
        }
        return document

    @classmethod
    def _validate_news_document_for_publish(cls, document: dict) -> None:
        if not cls._has_valid_chinese_fields(document):
            raise ValueError("Refusing to publish news with non-Chinese title_zh/summary_zh")
        if not cls._has_valid_english_fields(document):
            raise ValueError("Refusing to publish news with non-English title_en/summary_en")
        if document.get("image_fallback_type") == "source_logo" and document.get("image_link"):
            raise ValueError("Refusing to store source logo as news image_link")
        if document.get("classification_status") == "confirmed" and not document.get("level1_code"):
            raise ValueError("Refusing to publish confirmed classification without level1_code")

    @staticmethod
    def _sync_user_search_job(search_job_id: str) -> None:
        if not search_job_id:
            return
        with mongo_collection("user_discovery_news") as collection:
            rows = list(collection.aggregate([
                {"$match": {"search_job_id": search_job_id}},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            ]))
        counts = {row["_id"]: row["count"] for row in rows}
        total = sum(counts.values())
        if total == 0:
            return
        status = "processing"
        if (counts.get("completed", 0) + counts.get("failed", 0) + counts.get("enrichment_failed", 0)) >= total:
            status = "completed"
        with mongo_collection("user_search_jobs") as collection:
            collection.update_one(
                {"job_id": search_job_id},
                {
                    "$set": {
                        "status": status,
                        "finished_at": datetime.utcnow() if status == "completed" else None,
                        "updatedAt": datetime.utcnow(),
                    },
                },
            )

    def process(self, task: dict, *, publish: bool = True) -> dict:
        payload = None
        if isinstance(task, dict) and isinstance(task.get("payload"), dict):
            payload = task.get("payload")
        elif isinstance(task, dict) and task.get("news_id"):
            payload = self.raw_news_repo.find_by_id(task["news_id"])
        else:
            payload = task
        if not payload:
            raise ValueError("AI task payload is missing")
        news_id = payload.get("news_id", "")
        if payload.get("discovery_id"):
            with mongo_collection("user_discovery_news") as collection:
                collection.update_one(
                    {"discovery_id": payload.get("discovery_id")},
                    {"$set": {"status": "ai_processing", "updatedAt": datetime.utcnow()}},
                )
        self.raw_news_repo.update_status(news_id, {"processing_status": "processing"})
        self.status_tracker.update_status(news_id, {
            "status": "processing",
            "stage": "ai_analysis",
            "started_at": datetime.utcnow(),
        })
        try:
            metadata = self._generate_content_metadata(payload)
            review_bundle = self._generate_review_bundle(payload, metadata)

            bias = {
                "bias_level": review_bundle.get("bias_level", "unknown"),
                "analysis_text": review_bundle.get("analysis_text", ""),
                "fact_check": review_bundle.get("fact_check", {}),
                "sentiment": review_bundle.get("sentiment", {}),
            }
            evaluation = {
                "information_density": review_bundle.get("information_density", 5),
                "credibility": review_bundle.get("credibility", 5),
                "impact": review_bundle.get("impact", 5),
                "reach": review_bundle.get("reach", 5),
                "overall_score": review_bundle.get("overall_score", 5),
                "reasoning": review_bundle.get("reasoning", ""),
                "knowledge_graph": review_bundle.get("knowledge_graph", {}),
                "social_impact": review_bundle.get("social_impact", {}),
            }
            review = {
                "final_review": review_bundle.get("final_review", ""),
                "review_label": review_bundle.get("review_label", "needs_attention"),
            }

            if publish:
                self.queue.publish(QUEUE_NEWS_SUMMARIZED, {"news_id": news_id, "summary": metadata})
                self.queue.publish(QUEUE_NEWS_BIAS, {"news_id": news_id, "bias_analysis": bias})
                self.queue.publish(QUEUE_NEWS_EVALUATED, {"news_id": news_id, "evaluation": evaluation})

            final_payload = {
                **payload,
                "summary": metadata,
                "bias_analysis": bias,
                "evaluation": evaluation,
                "review": review,
                "completed_at": datetime.utcnow().isoformat(),
            }
            if not final_payload.get("canonical_link") or not final_payload.get("title_hash"):
                identity = build_news_identity(
                    url=payload.get("url") or "",
                    title=metadata.get("title_en") or payload.get("title") or "",
                )
                final_payload["canonical_link"] = identity["canonical_link"]
                final_payload["title_hash"] = identity["title_hash"]
            news_document = self._build_news_document(payload, metadata, evaluation)
            if not news_document.get("canonical_link") or not news_document.get("title_hash"):
                identity = build_news_identity(
                    url=news_document.get("link") or "",
                    title=news_document.get("title_en") or news_document.get("title_zh") or "",
                )
                news_document["canonical_link"] = identity["canonical_link"]
                news_document["title_hash"] = identity["title_hash"]
            self._validate_news_document_for_publish(news_document)
            with mongo_collection("agent_news_analyses") as collection:
                collection.update_one({"news_id": news_id}, {"$set": final_payload}, upsert=True)
            stored_news = None
            with mongo_collection("news") as collection:
                lookup_query = build_news_lookup_query(
                    link=news_document.get("link", ""),
                    canonical_link=news_document.get("canonical_link", ""),
                    title_hash=news_document.get("title_hash", ""),
                    source_id=news_document.get("sourceId", ""),
                )
                summarization_agent = self.registry.get_agent("summarization_agent")
                review_agent = self.registry.get_agent("review_agent")
                content_model_used = (
                    summarization_agent.llm_config.get("remote_model")
                    or summarization_agent.llm_config.get("model")
                    or "unknown"
                )
                review_model_used = (
                    review_agent.llm_config.get("remote_model")
                    or review_agent.llm_config.get("model")
                    or "unknown"
                )
                collection.update_one(lookup_query, {"$set": {
                    **news_document,
                    "raw_news_id": news_id,
                    "processed_at": datetime.utcnow(),
                    "processing_version": "search-pipeline-v1",
                    "ai_model_used": content_model_used,
                    "ai_content_model_used": content_model_used,
                    "ai_review_model_used": review_model_used,
                }}, upsert=True)
                stored_news = collection.find_one(lookup_query, {"_id": 1})

            self.raw_news_repo.update_status(news_id, {"processing_status": "completed"})
            self.status_tracker.update_status(news_id, {
                "status": "completed",
                "stage": "completed",
                "completed_at": datetime.utcnow(),
            })

            if payload.get("user_id") and stored_news:
                with mongo_collection("user_news_maps") as collection:
                    collection.update_one(
                        {"userId": payload.get("user_id"), "newsId": stored_news.get("_id")},
                        {
                            "$set": {
                                "search_job_id": payload.get("search_job_id", ""),
                                "query": payload.get("query", ""),
                                "keywords": payload.get("keywords", []),
                                "origin": (
                                    "tracking"
                                    if payload.get("source_type") == "tracking_topic"
                                    else ("search" if payload.get("pipeline_mode") == "search" else payload.get("pipeline_mode", "rss"))
                                ),
                                "visible": True,
                                "updatedAt": datetime.utcnow(),
                            },
                            "$setOnInsert": {
                                "userId": payload.get("user_id"),
                                "newsId": stored_news.get("_id"),
                                "createdAt": datetime.utcnow(),
                            },
                        },
                        upsert=True,
                    )
            if payload.get("discovery_id"):
                with mongo_collection("user_discovery_news") as collection:
                    collection.update_one(
                        {"discovery_id": payload.get("discovery_id")},
                        {
                            "$set": {
                                "status": "completed",
                                "linked_news_id": stored_news.get("_id") if stored_news else None,
                                "updatedAt": datetime.utcnow(),
                            },
                        },
                    )
            self._sync_user_search_job(payload.get("search_job_id", ""))

            if publish:
                self.queue.publish(QUEUE_NEWS_FINAL, final_payload)
                self.queue.publish(QUEUE_NEWS_NOTIFICATIONS, {
                    "user_id": payload.get("user_id", "system"),
                    "content": f"新闻 {payload.get('title', news_id)} 已完成 AI 分析。",
                    "news_id": news_id,
                })
            return final_payload
        except Exception as error:
            self.raw_news_repo.update_status(news_id, {"processing_status": "failed", "last_error": str(error)})
            self.status_tracker.update_status(news_id, {
                "status": "failed",
                "stage": "ai_analysis",
                "error": str(error),
            })
            if payload.get("discovery_id"):
                with mongo_collection("user_discovery_news") as collection:
                    collection.update_one(
                        {"discovery_id": payload.get("discovery_id")},
                        {"$set": {"status": "failed", "error": str(error)[:500], "updatedAt": datetime.utcnow()}},
                    )
            self._sync_user_search_job(payload.get("search_job_id", ""))
            return {
                "news_id": news_id,
                "status": "failed",
                "error": str(error),
            }

    def consume(self) -> None:
        self.queue.consume(QUEUE_AI_TASKS, self.process)


if __name__ == "__main__":
    AIAnalysisService().consume()
