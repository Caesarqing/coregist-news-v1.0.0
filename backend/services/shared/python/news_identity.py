from __future__ import annotations

import hashlib
import re
from typing import Any, Dict
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


TRACKING_QUERY_PREFIXES = ("utm_", "spm", "fbclid", "gclid", "igshid", "mc_", "yclid")
TRACKING_QUERY_KEYS = {"ref", "ref_src", "ref_url", "source", "campaign", "cmpid"}


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


def canonicalize_url(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        return ""
    parts = urlsplit(raw)
    scheme = (parts.scheme or "https").lower()
    netloc = parts.netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]
    path = re.sub(r"/+", "/", parts.path or "/")
    path = path.rstrip("/") or "/"
    filtered_query = []
    for key, value in parse_qsl(parts.query, keep_blank_values=False):
        lower_key = key.lower()
        if lower_key in TRACKING_QUERY_KEYS:
            continue
        if lower_key.startswith(TRACKING_QUERY_PREFIXES):
            continue
        filtered_query.append((key, value))
    filtered_query.sort()
    query = urlencode(filtered_query)
    return urlunsplit((scheme, netloc, path, query, ""))


def build_title_hash(title: str) -> str:
    normalized = normalize_text(title)
    if not normalized:
        return ""
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def build_news_identity(*, url: str, title: str) -> Dict[str, Any]:
    return {
        "canonical_link": canonicalize_url(url),
        "title_hash": build_title_hash(title),
    }


def build_news_lookup_query(*, link: str = "", canonical_link: str = "", title_hash: str = "", source_id: str = "") -> Dict[str, Any]:
    clauses = []
    if link:
        clauses.append({"link": link})
    if canonical_link:
        clauses.append({"canonical_link": canonical_link})
    if title_hash and source_id:
        clauses.append({"title_hash": title_hash, "sourceId": source_id})
    if not clauses:
        return {}
    if len(clauses) == 1:
        return clauses[0]
    return {"$or": clauses}


__all__ = [
    "TRACKING_QUERY_KEYS",
    "TRACKING_QUERY_PREFIXES",
    "build_news_identity",
    "build_news_lookup_query",
    "build_title_hash",
    "canonicalize_url",
    "normalize_text",
]
