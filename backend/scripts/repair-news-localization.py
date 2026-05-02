#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.ai_analysis.service import AIAnalysisService
from services.content_processing.service import ContentProcessingService
from services.shared.python.queue import mongo_collection


def _needs_localization_repair(news: dict[str, Any]) -> bool:
    return not (
        AIAnalysisService._has_valid_chinese_fields(news)
        and AIAnalysisService._has_valid_english_fields(news)
    )


def _build_repair_payload(raw: dict[str, Any]) -> dict[str, Any]:
    content = raw.get("normalized_content") or raw.get("processed_content") or raw.get("raw_content") or ""
    language_profile = ContentProcessingService._detect_language_profile(content)
    classification = ContentProcessingService()._classify_content(
        payload=raw,
        title=raw.get("title", ""),
        normalized=content,
        language_profile=language_profile,
    )
    return {
        **raw,
        "normalized_content": content,
        "source_language": classification.get("source_language", raw.get("source_language") or raw.get("language") or "unknown"),
        "language": classification.get("source_language", raw.get("language") or "unknown"),
        "display_language": "zh-CN",
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
    }


def _image_update_from_raw(raw: dict[str, Any]) -> dict[str, Any]:
    image_link = raw.get("image_link") or ""
    if not image_link:
        return {
            "image_link": "",
            "image_confidence": raw.get("image_confidence", "none"),
            "image_source_type": raw.get("image_source_type", "none"),
            "image_fallback_type": raw.get("image_fallback_type", "source_logo"),
            "source_logo_url": raw.get("source_logo_url", ""),
        }
    return {
        "image_link": image_link,
        "image_confidence": raw.get("image_confidence") if raw.get("image_confidence") not in ("", "none", None) else "high",
        "image_source_type": raw.get("image_source_type") if raw.get("image_source_type") not in ("", "none", None) else "original",
        "image_fallback_type": "",
        "source_logo_url": raw.get("source_logo_url", ""),
    }


def repair(limit: int, translate: bool, dry_run: bool) -> None:
    service = AIAnalysisService()
    with mongo_collection("news") as news_collection, mongo_collection("raw_news") as raw_collection:
        cursor = news_collection.find(
            {"raw_news_id": {"$exists": True, "$ne": ""}},
        ).sort([("postedAt", -1), ("crawledAt", -1)]).limit(limit)
        repaired = 0
        for news in cursor:
            raw = raw_collection.find_one({"news_id": news.get("raw_news_id")})
            if not raw:
                continue

            update: dict[str, Any] = {}
            image_update = _image_update_from_raw(raw)
            if image_update.get("image_link") and image_update.get("image_link") != news.get("image_link"):
                update.update(image_update)

            needs_translation = _needs_localization_repair(news)
            if translate and needs_translation:
                try:
                    payload = _build_repair_payload(raw)
                    metadata = service._generate_content_metadata(payload)
                    update.update({
                        "title_en": metadata.get("title_en") or news.get("title_en", ""),
                        "title_zh": metadata.get("title_zh") or news.get("title_zh", ""),
                        "summary_en": metadata.get("summary_en") or news.get("summary_en", ""),
                        "summary_zh": metadata.get("summary_zh") or news.get("summary_zh", ""),
                        "level1_code": metadata.get("level1_code") or payload.get("level1_code", ""),
                        "level1_name_zh": metadata.get("level1_name_zh") or payload.get("level1_name_zh", ""),
                        "level1_name_en": metadata.get("level1_name_en") or payload.get("level1_name_en", ""),
                        "level2_codes": metadata.get("level2_codes") or payload.get("level2_codes", []),
                        "level2_names_zh": metadata.get("level2_names_zh") or payload.get("level2_names_zh", []),
                        "level2_names_en": metadata.get("level2_names_en") or payload.get("level2_names_en", []),
                        "topic_tags": metadata.get("topic_tags") or payload.get("topic_tags", []),
                        "entity_tags": metadata.get("entity_tags") or payload.get("entity_tags", []),
                        "tags_zh": metadata.get("tags_zh") or payload.get("tags_zh", []),
                        "tags_en": metadata.get("tags_en") or payload.get("tags_en", []),
                        "source_language": metadata.get("source_language") or payload.get("source_language", ""),
                        "language": payload.get("language", ""),
                        "display_language": "zh-CN",
                        **AIAnalysisService._build_search_fields(payload, metadata),
                    })
                except Exception as exc:
                    print(f"skip {news.get('_id')}: localization failed: {exc}")

            if not update:
                continue

            repaired += 1
            print(f"{'DRY ' if dry_run else ''}repair {news.get('_id')}: translate={translate and needs_translation}, image={bool(image_update.get('image_link'))}")
            if dry_run:
                continue
            update["processed_at"] = datetime.utcnow()
            news_collection.update_one({"_id": news["_id"]}, {"$set": update})
            raw_collection.update_one({"news_id": raw["news_id"]}, {"$set": {k: v for k, v in update.items() if k in raw or k.startswith("image_")}})
        print(f"candidates repaired: {repaired}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Repair localized news title/summary fields and original image links.")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--translate", action="store_true", help="Call the configured LLM to regenerate zh/en title and summary.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    repair(limit=max(1, args.limit), translate=args.translate, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
