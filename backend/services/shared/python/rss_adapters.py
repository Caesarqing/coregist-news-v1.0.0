from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from time import struct_time
from typing import Any, Callable, Dict, Iterable, List
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from pipeline.tools.RSSFetcher import fetch_feed
from pipeline.scrubbers.HTMLConvertor import html_content_converter
from pipeline.scrubbers.UnicodeSanitizer import sanitize_unicode_string
from services.shared.python.rss_registry import RssSource
from services.shared.python.settings import settings

Fetcher = Callable[..., Dict[str, Any]]


@dataclass(frozen=True, slots=True)
class AdapterConfig:
    id: str
    feed_backend: str = "requests"
    article_backend: str = "requests"
    selectors: Any = "article, main, body"
    exclude_selectors: Any = None
    noise_exact: List[str] = field(default_factory=list)
    noise_contains: List[str] = field(default_factory=list)
    max_length: int = 12000


DEFAULT_ADAPTER = AdapterConfig(id="generic_news")


class RssFetchError(RuntimeError):
    def __init__(self, message: str, *, error_type: str = "request_error"):
        super().__init__(message)
        self.error_type = error_type


def _normalize_errors(errors: Any) -> list[str]:
    if not errors:
        return []
    if isinstance(errors, str):
        return [errors]
    if isinstance(errors, (list, tuple, set)):
        return [str(item) for item in errors if item]
    return [str(errors)]


def classify_fetch_errors(errors: Any, *, backend: str = "") -> str:
    normalized = " ".join(_normalize_errors(errors)).lower()
    if not normalized:
        return ""
    if "http_403" in normalized or "http response: 403" in normalized or "403 client error" in normalized:
        return "http_403"
    if "http_429" in normalized or "http response: 429" in normalized or "429 client error" in normalized:
        return "http_429"
    if "ssl_error" in normalized or ("ssl" in normalized and ("certificate" in normalized or "wrong version" in normalized)):
        return "ssl_error"
    if "timeout" in normalized or "timed out" in normalized:
        return "browser_timeout" if backend in {"raw", "rendered"} else "timeout"
    if "empty feed content" in normalized or "emtpy feed content" in normalized:
        return "empty_feed"
    if "parse" in normalized or "bozo" in normalized or "syntax error" in normalized:
        return "parse_error"
    if "http_" in normalized or "http response:" in normalized or "client error" in normalized:
        return "http_error"
    return "request_error"



URL_ADAPTER_HINTS: list[tuple[str, str]] = [
    ("chinanews.com.cn", "chinanews"),
    ("aa.com.tr", "aa"),
    ("abc.net.au", "abc"),
    ("aljazeera.com", "aljazeera"),
    ("bbc.co.uk", "bbc"),
    ("bbc.com", "bbc"),
    ("cbc.ca", "cbc"),
    ("dw.com", "dw"),
    ("elpais.com", "elpais"),
    ("investing.com", "investing"),
    ("nhk.or.jp", "nhk"),
    ("rfi.fr", "rfi"),
    ("voanews.com", "voa"),
]


def resolve_adapter_for_url(url: str) -> AdapterConfig:
    hostname = (urlparse(url).hostname or '').lower()
    for pattern, adapter_id in URL_ADAPTER_HINTS:
        if pattern in hostname:
            return ADAPTERS.get(adapter_id, DEFAULT_ADAPTER)
    return DEFAULT_ADAPTER


def clean_article_text(text: str, config: AdapterConfig) -> str:
    cleaned = sanitize_unicode_string(text or '', max_length=config.max_length) or ''
    cleaned = _remove_noise_lines(cleaned, config)
    return cleaned.strip()


ADAPTERS: Dict[str, AdapterConfig] = {
    "aa": AdapterConfig("aa", article_backend="rendered", selectors=['div[class="detay-icerik"]'], noise_exact=["paylaş", "share", "save"]),
    "abc": AdapterConfig("abc", article_backend="raw", selectors=['div[class*="ArticleHeadlineTitle_container"]', 'div[class*="ArticleWeb_article"]'], noise_exact=["share", "save", "print"], noise_contains=["getty images", "abc news"]),
    "aljazeera": AdapterConfig("aljazeera", selectors='main#main-content-area', noise_exact=["share", "save", "print"], noise_contains=["getty images", "afp"]),
    "bbc": AdapterConfig("bbc", selectors='main[id="main-content"]', noise_exact=["share", "save"], noise_contains=["getty images", "image source", "video caption", "correspondent"], max_length=8000),
    "cbc": AdapterConfig("cbc", selectors='div[data-cy="storyWrapper"]', noise_exact=["share", "save", "print"], noise_contains=["getty images", "cbc news"]),
    "chinanews": AdapterConfig("chinanews", article_backend="rendered", selectors=['div.left_zw', 'div.content_desc', 'div#cont_1_1_2'], noise_exact=["分享", "收藏"]),
    "dw": AdapterConfig("dw", selectors=['main', 'article', '.rich-text'], noise_exact=["share", "save", "print"], noise_contains=["dw.com", "deutsche welle"]),
    "elpais": AdapterConfig("elpais", article_backend="rendered", selectors=['article[id="main-content"]'], noise_exact=["compartir", "guardar", "imprimir", "share", "save"], noise_contains=["getty images", "efe"]),
    "investing": AdapterConfig("investing", article_backend="rendered", selectors='div[id="article"]', noise_exact=["share", "save", "print", "tweet"], noise_contains=["getty images", "shutterstock"]),
    "nhk": AdapterConfig("nhk", selectors='article, main, .article-body, .content', noise_exact=["シェア", "share", "保存", "save"], max_length=10240),
    "rfi": AdapterConfig("rfi", article_backend="rendered", selectors='article.t-content__article-wrapper', noise_exact=["partager", "partagez", "share", "save"]),
    "voa": AdapterConfig("voa", article_backend="rendered", selectors=['.title.pg-title', 'div.published', 'div.wsw, div.m-t-md'], noise_exact=["share", "save", "print"], noise_contains=["getty images", "ap photo", "image source", "photo:", "caption:", "video caption", "correspondent", "reporter"], max_length=10240),
    "guardian": AdapterConfig("guardian", selectors=['main', 'article', '.article-body-commercial-selector'], noise_exact=["share", "save", "print"], noise_contains=["supported by", "the guardian"]),
    "nyt": AdapterConfig("nyt", selectors=['section[name="articleBody"]', 'article', 'main'], noise_exact=["share full article", "advertisement"], noise_contains=["supported by", "share this article"]),
    "ft": AdapterConfig("ft", selectors=['article', 'main', '.article__content-body'], noise_exact=["share", "save"], noise_contains=["ft edit", "follow the topics in this article"]),
    "npr": AdapterConfig("npr", selectors=['article', 'main', '.storytext'], noise_exact=["share", "save"], noise_contains=["copyright npr", "listen"]),
    "politico": AdapterConfig("politico", selectors=['article', 'main', '.story-text'], noise_exact=["share", "save", "print"]),
    "techcrunch": AdapterConfig("techcrunch", selectors=['article', 'main', '.entry-content'], noise_exact=["share this article"], noise_contains=["image credits"]),
    "cnbc": AdapterConfig("cnbc", selectors=['article', 'main', '.ArticleBody-articleBody'], noise_exact=["watch live", "share"], noise_contains=["cnbc tv"]),
    "marketwatch": AdapterConfig("marketwatch", selectors=['article', 'main', '.article__body'], noise_exact=["share", "save", "listen"], noise_contains=["marketwatch photo illustration"]),
    "economist": AdapterConfig("economist", selectors=['article', 'main', '.article__body-text'], noise_exact=["share", "save"], noise_contains=["subscriber only", "listen to this story"]),
    "un_news": AdapterConfig("un_news", selectors=['article', 'main', '.story-body'], noise_exact=["share", "save", "print"], noise_contains=["un photo", "audio credit"]),
    "mit_tech_review": AdapterConfig("mit_tech_review", selectors=['article', 'main', '.article-body', '.body__inner-container'], noise_exact=["share", "save"], noise_contains=["advertisement", "newsletter"]),
    "ars": AdapterConfig("ars", selectors=['article', 'main', '.article-content'], noise_exact=["share", "save"], noise_contains=["ars video", "promo code"]),
    "register": AdapterConfig("register", selectors=['article', 'main', '#body'], noise_exact=["share", "save"], noise_contains=["bootnote", "read more"]),
    "nature": AdapterConfig("nature", selectors=['article', 'main', '.c-article-body'], noise_exact=["share this article"], noise_contains=["nature briefing", "related stories"]),
    "nasa": AdapterConfig("nasa", selectors=['article', 'main', '.entry-content'], noise_exact=["share", "save"], noise_contains=["image article", "credit: nasa"]),
    "stat_news": AdapterConfig("stat_news", selectors=['article', 'main', '.entry-content'], noise_exact=["share", "save"], noise_contains=["advertisement"]),
    "foreign_policy": AdapterConfig("foreign_policy", selectors=['article', 'main', '.post-content'], noise_exact=["share", "save"], noise_contains=["newsletter", "recommended reading"]),
    "euronews": AdapterConfig("euronews", selectors=['article', 'main', '.c-article-content'], noise_exact=["share", "save"], noise_contains=["video", "read more"]),
}


def _import_fetcher(backend: str) -> Fetcher:
    if backend == "raw":
        try:
            from pipeline.scrapers.PlaywrightRawScraper import fetch_content as fetcher
            return fetcher
        except Exception:
            pass
    if backend == "rendered":
        try:
            from pipeline.scrapers.PlaywrightRenderedScraper import fetch_content as fetcher
            return fetcher
        except Exception:
            pass
    from pipeline.scrapers.RequestsScraper import fetch_content as fetcher
    return fetcher


def get_adapter(source: RssSource) -> AdapterConfig:
    return ADAPTERS.get(source.adapter_id, DEFAULT_ADAPTER)


def _normalize_published(value: Any) -> str | None:
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, struct_time):
        dt = datetime(*value[:6], tzinfo=timezone.utc)
    elif isinstance(value, str):
        try:
            dt = parsedate_to_datetime(value)
        except Exception:
            try:
                dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            except Exception:
                parsed = None
                for fmt in ("%b %d, %Y %H:%M %Z", "%B %d, %Y %H:%M %Z"):
                    try:
                        parsed = datetime.strptime(value, fmt)
                        break
                    except ValueError:
                        continue
                if parsed is None:
                    return None
                dt = parsed.replace(tzinfo=timezone.utc)
    else:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def _entry_published_at(entry: Any) -> str | None:
    for attr in ("published", "updated", "created", "date"):
        normalized = _normalize_published(getattr(entry, attr, None))
        if normalized:
            return normalized
    for attr in ("published_parsed", "updated_parsed", "created_parsed"):
        normalized = _normalize_published(getattr(entry, attr, None))
        if normalized:
            return normalized
    return None


def _remove_noise_lines(text: str, config: AdapterConfig) -> str:
    lines = [line.strip() for line in (text or "").splitlines()]
    filtered: List[str] = []
    exact = {item.lower() for item in config.noise_exact}
    contains = [item.lower() for item in config.noise_contains]
    for line in lines:
        if not line:
            continue
        lower = line.lower()
        if lower in exact:
            continue
        if any(token in lower for token in contains):
            continue
        filtered.append(line)
    return "\n".join(filtered).strip()


def _build_source_logo_url(*urls: str) -> str | None:
    for candidate in urls:
        hostname = (urlparse(candidate or "").hostname or "").strip().lower()
        if hostname:
            return f"https://www.google.com/s2/favicons?domain={hostname}&sz=128"
    return None


def _is_low_confidence_image(url: str | None) -> bool:
    lower = (url or "").strip().lower()
    if not lower:
        return True
    bad_tokens = (
        "logo",
        "icon",
        "sprite",
        "banner",
        "avatar",
        "placeholder",
        "share",
        "wechat",
        "weibo",
        "twitter",
        "facebook",
        "qrcode",
        "qr",
        "ads",
        "advert",
        "pixel",
        "favicon",
    )
    if any(token in lower for token in bad_tokens):
        return True
    return False


def _image_candidate(url: str | None, confidence: str, source_type: str) -> Dict[str, str] | None:
    if not url or _is_low_confidence_image(url):
        return None
    return {
        "url": url,
        "confidence": confidence,
        "source_type": source_type,
    }


def _extract_cover_image(html: str, page_url: str, entry_media: Any = None) -> Dict[str, str]:
    soup = BeautifulSoup(html or "", "lxml")
    source_logo_url = _build_source_logo_url(page_url)
    for selector, confidence, source_type in [
        (("meta", {"property": "og:image"}, "content"), "high", "og:image"),
        (("meta", {"name": "twitter:image"}, "content"), "medium", "twitter:image"),
    ]:
        tag = soup.find(selector[0], attrs=selector[1])
        if tag and tag.get(selector[2]):
            candidate = _image_candidate(urljoin(page_url, tag[selector[2]].strip()), confidence, source_type)
            if candidate:
                candidate["source_logo_url"] = source_logo_url or ""
                candidate["fallback_type"] = ""
                return candidate

    if isinstance(entry_media, list):
        for item in entry_media:
            if isinstance(item, dict) and item.get("url"):
                candidate = _image_candidate(item["url"], "medium", "rss_media")
                if candidate:
                    candidate["source_logo_url"] = source_logo_url or ""
                    candidate["fallback_type"] = ""
                    return candidate

    main = soup.find("main") or soup.find("article") or soup.body
    img = main.find("img") if main else soup.find("img")
    if img:
        src = img.get("src") or img.get("data-src")
        if src:
            candidate = _image_candidate(urljoin(page_url, src.strip()), "low", "body_image")
            if candidate:
                candidate["source_logo_url"] = source_logo_url or ""
                candidate["fallback_type"] = ""
                return candidate

    return {
        "url": "",
        "confidence": "none",
        "source_type": "none",
        "source_logo_url": source_logo_url or "",
        "fallback_type": "source_logo",
    }


def fetch_rss_entries(source: RssSource, max_items: int = 10) -> List[Dict[str, Any]]:
    config = get_adapter(source)
    feed_fetcher = _import_fetcher(config.feed_backend)
    feed = fetch_feed(
        source.feed_url,
        fetch_content=feed_fetcher,
        proxy=None,
        headless=True,
        timeout_ms=settings.rss_feed_timeout_ms,
    )
    if getattr(feed, "fatal", False):
        error_type = classify_fetch_errors(getattr(feed, "errors", []), backend=config.feed_backend) or "request_error"
        raise RssFetchError(
            f"RSS feed fetch failed for {source.id}: {'; '.join(_normalize_errors(getattr(feed, 'errors', []))) or error_type}",
            error_type=error_type,
        )
    items: List[Dict[str, Any]] = []
    for entry in list(feed.entries or [])[:max_items]:
        items.append({
            "title": getattr(entry, "title", "") or source.feed_name,
            "url": getattr(entry, "link", ""),
            "description": getattr(entry, "description", ""),
            "published_at": _entry_published_at(entry),
            "media": getattr(entry, "media", None),
            "feed_name": source.feed_name,
            "feed_url": source.feed_url,
            "feed_meta_title": getattr(feed.meta, "title", ""),
            "feed_errors": list(getattr(feed, "errors", []) or []),
        })
    if not items and getattr(feed, "errors", None):
        error_type = classify_fetch_errors(getattr(feed, "errors", []), backend=config.feed_backend) or "empty_feed"
        raise RssFetchError(
            f"RSS feed returned no usable entries for {source.id}: {'; '.join(_normalize_errors(getattr(feed, 'errors', [])))}",
            error_type=error_type,
        )
    return items


def extract_article(source: RssSource, entry: Dict[str, Any]) -> Dict[str, Any]:
    config = get_adapter(source)
    article_fetcher = _import_fetcher(config.article_backend)
    timeout_ms = (
        settings.rss_browser_timeout_ms
        if config.article_backend in {"raw", "rendered"}
        else settings.rss_request_timeout_seconds * 1000
    )
    result = article_fetcher(entry["url"], timeout_ms=timeout_ms, proxy=None, format="lxml", headless=True)
    html = result.get("content", "") or ""
    result_errors = _normalize_errors(result.get("errors", []))
    scrape_error_type = classify_fetch_errors(result_errors, backend=config.article_backend)
    extracted = html_content_converter(
        html,
        selectors=config.selectors,
        exclude_selectors=config.exclude_selectors,
        output_format="text",
    ) if html else entry.get("description", "")
    cleaned_text = clean_article_text(extracted or entry.get("description", ""), config)
    if not cleaned_text:
        cleaned_text = (entry.get("description") or "").strip()
    content_quality = "full" if html and len(cleaned_text) >= 120 else "rss_summary_only"
    if not cleaned_text:
        raise RssFetchError(
            f"RSS article skipped for {source.id}: no extractable content from {entry.get('url', '')}",
            error_type=scrape_error_type or "empty_feed",
        )
    image_meta = _extract_cover_image(html, entry.get("url", ""), entry.get("media"))
    return {
        "title": entry.get("title") or source.feed_name,
        "url": entry.get("url", ""),
        "snippet": entry.get("description", ""),
        "raw_content": cleaned_text,
        "raw_html": html,
        "image_link": image_meta.get("url", ""),
        "image_confidence": image_meta.get("confidence", "none"),
        "image_source_type": image_meta.get("source_type", "none"),
        "image_fallback_type": image_meta.get("fallback_type", ""),
        "source_logo_url": image_meta.get("source_logo_url", ""),
        "published_at": entry.get("published_at"),
        "errors": result_errors + list(entry.get("feed_errors", []) or []),
        "content_quality": content_quality,
        "scrape_error_type": scrape_error_type,
        "feed_name": source.feed_name,
        "feed_url": source.feed_url,
        "source_id": source.id,
        "publisher_id": source.publisher_id,
        "source_name_en": source.source_en,
        "source_name_zh": source.source_zh,
        "categories": list(source.categories or []),
        "language": source.language,
        "region": source.region,
        "adapter_id": source.adapter_id,
    }

__all__ = [
    "AdapterConfig",
    "DEFAULT_ADAPTER",
    "ADAPTERS",
    "RssFetchError",
    "classify_fetch_errors",
    "get_adapter",
    "resolve_adapter_for_url",
    "clean_article_text",
    "fetch_rss_entries",
    "extract_article",
]
