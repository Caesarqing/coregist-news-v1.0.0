from __future__ import annotations

from datetime import datetime
import logging
import re
from typing import Any, Dict, List
from urllib.parse import quote_plus, urlparse

import feedparser
from bs4 import BeautifulSoup
import requests
import urllib3
from ai.file_registry import load_file_agents, load_file_skills
from services.shared.python.agent_registry import Agent, AgentRegistry, AgentType
from services.shared.python.llm import LLMProvider
from services.shared.python.rss import fetch_rss_entries, list_rss_sources
from services.shared.python.rss_adapters import clean_article_text, resolve_adapter_for_url
from services.shared.python.settings import settings
from services.shared.python.queue import mongo_collection
from services.shared.python.skillset import Skill, Skillset

from pipeline.scrapers.RequestsScraper import fetch_content as fetch_via_requests
from pipeline.scrubbers.HTMLConvertor import html_content_converter
from pipeline.scrubbers.UnicodeSanitizer import sanitize_unicode_string

logger = logging.getLogger(__name__)

MAX_RSS_SEARCH_SOURCES = 20
MAX_RSS_ITEMS_PER_SOURCE = 3
MAX_WEB_SEARCH_RESULTS = 10


def _query_language_hint(query: str) -> str:
    text = query or ""
    zh_chars = sum(1 for char in text if "\u4e00" <= char <= "\u9fff")
    if zh_chars >= max(1, len(text.strip()) // 4):
        return "zh"
    return "en"


def _select_search_sources(query: str):
    language_hint = _query_language_hint(query)
    scored_sources = []
    for source in list_rss_sources():
        score = source.priority
        source_language = (source.language or '').lower()
        source_region = (source.region or '').lower()
        if language_hint == 'zh':
            if source_language.startswith('zh'):
                score -= 200
            elif source_region in {'cn', 'hk', 'tw', 'sg'}:
                score -= 120
            else:
                score += 20
        else:
            if source_language.startswith('en'):
                score -= 80
        scored_sources.append((score, source.publisher_id, source.id, source))
    scored_sources.sort(key=lambda item: (item[0], item[1], item[2]))
    return [item[-1] for item in scored_sources[:MAX_RSS_SEARCH_SOURCES]]


def _http_get_no_proxy(url: str, *, timeout: int = 8, allow_redirects: bool = True) -> requests.Response:
    session = requests.Session()
    session.trust_env = False
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    response = session.get(
        url,
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=timeout,
        allow_redirects=allow_redirects,
        verify=False,
    )
    response.raise_for_status()
    return response


def _fallback_extract_text(html: str) -> str:
    if not html:
        return ""
    soup = BeautifulSoup(html, "lxml")
    for selector in ["script", "style", "nav", "footer", "aside", "noscript", "svg", "form"]:
        for tag in soup.select(selector):
            tag.decompose()
    text = soup.get_text("\n", strip=True)
    return sanitize_unicode_string(text, max_length=12000) or ""


def _plain_text_snippet(value: str) -> str:
    if not value:
        return ""
    return " ".join(BeautifulSoup(value, "lxml").get_text(" ", strip=True).split())


def _resolve_result_url(url: str) -> str:
    if not url:
        return ""
    try:
        hostname = (urlparse(url).hostname or "").lower()
        if hostname != "news.google.com":
            return url
        response = _http_get_no_proxy(url, timeout=5, allow_redirects=True)
        return response.url or url
    except Exception as exc:
        logger.warning("search result url resolve failed for %s: %s", url, exc)
        return url


def _score_scrape_result(content: str, errors: List[str]) -> tuple[int, int]:
    cleaned = (content or "").strip()
    # Prefer longer extracted content, then fewer errors.
    return (len(cleaned), -len(errors or []))


def _search_cached_discovery(query: str) -> List[Dict[str, str]]:
    keywords = [part.strip() for part in query.replace("，", ",").split(",") if part.strip()]
    if not keywords:
        keywords = [query.strip()]
    regexes = [re.compile(re.escape(item), re.I) for item in keywords if item]
    if not regexes:
        return []
    with mongo_collection("discovery_news") as collection:
        rows = list(collection.find({
            "$or": [
                {"title": {"$in": regexes}},
                {"snippet": {"$in": regexes}},
                {"source_name_en": {"$in": regexes}},
                {"source_name_zh": {"$in": regexes}},
            ]
        }).sort("updatedAt", -1).limit(MAX_WEB_SEARCH_RESULTS))
    normalized = []
    seen_urls = set()
    for row in rows:
        url = row.get("url") or ""
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        published_at = row.get("published_at") or ""
        if hasattr(published_at, "isoformat"):
            published_at = published_at.isoformat()
        normalized.append({
            "title": row.get("title") or query,
            "url": url,
            "snippet": row.get("snippet", ""),
            "source": row.get("source_name_zh") or row.get("source_name_en") or row.get("feed_name") or "",
            "published_at": published_at,
        })
    return normalized


def _mock_web_search(query: str) -> List[Dict[str, str]]:
    cached_results = _search_cached_discovery(query)
    if cached_results:
        return cached_results

    keywords = [part.strip().lower() for part in query.replace("，", ",").split(",") if part.strip()]
    if not keywords:
        keywords = [query.strip().lower()]

    seen_urls = set()
    rss_results: List[Dict[str, str]] = []
    sources = _select_search_sources(query)

    for source in sources:
        try:
            entries = fetch_rss_entries(source, max_items=MAX_RSS_ITEMS_PER_SOURCE)
        except Exception as exc:
            logger.warning("RSS search fetch failed for %s: %s", source.id, exc)
            continue

        for entry in entries:
            title = (entry.get("title") or "").strip()
            snippet = _plain_text_snippet(entry.get("summary") or entry.get("description") or entry.get("snippet") or "")
            url = _resolve_result_url((entry.get("url") or "").strip())
            haystack = f"{title} {snippet}".lower()
            if not url or url in seen_urls:
                continue
            if not any(keyword and keyword in haystack for keyword in keywords):
                continue
            seen_urls.add(url)
            rss_results.append({
                "title": title or query,
                "url": url,
                "snippet": snippet,
                "source": source.feed_name,
                "published_at": entry.get("published_at", "") or "",
            })
            if len(rss_results) >= MAX_WEB_SEARCH_RESULTS:
                return rss_results

    if rss_results:
        return rss_results

    encoded = quote_plus(query)
    feed_url = f"https://news.google.com/rss/search?q={encoded}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans"
    try:
        feed_response = _http_get_no_proxy(feed_url, timeout=5, allow_redirects=True)
        parsed = feedparser.parse(feed_response.content)
    except Exception as exc:
        logger.warning("google news fallback failed for %s: %s", query, exc)
        parsed = feedparser.parse([])
    results: List[Dict[str, str]] = []
    for entry in getattr(parsed, "entries", [])[:MAX_WEB_SEARCH_RESULTS]:
        link = getattr(entry, "link", "") or ""
        source = ""
        if getattr(entry, "source", None):
            source = getattr(entry.source, "title", "") or ""
        if not source and link:
            try:
                source = urlparse(link).netloc
            except Exception:
                source = ""
        resolved_link = _resolve_result_url(link)
        results.append({
            "title": getattr(entry, "title", query) or query,
            "url": resolved_link,
            "snippet": _plain_text_snippet(getattr(entry, "summary", "") or ""),
            "source": source,
            "published_at": getattr(entry, "published", "") or "",
        })
    return results


def _content_scraper(url: str) -> Dict[str, Any]:
    adapter = resolve_adapter_for_url(url)

    def _extract_text(html: str) -> str:
        extracted = html_content_converter(
            html,
            selectors=adapter.selectors or ["main", "article", "body"],
            exclude_selectors=adapter.exclude_selectors or ["script", "style", "nav", "footer", "aside"],
            output_format="text",
        ) if html else ""
        cleaned = clean_article_text(extracted, adapter)
        if len(cleaned.strip()) < 120:
            cleaned = clean_article_text(_fallback_extract_text(html), adapter)
        return cleaned.strip()

    request_result = fetch_via_requests(url=url, timeout_ms=10000, proxy=None, format="lxml")
    request_html = request_result.get("content", "")
    best_result = {
        "url": url,
        "raw_html": request_html,
        "content": _extract_text(request_html),
        "errors": list(request_result.get("errors", []) or []),
        "backend": "requests",
    }

    # Only pay the rendered fallback cost when requests gives us very little.
    if len(best_result["content"]) < 200 or adapter.article_backend in {"rendered", "raw"}:
        try:
            from pipeline.scrapers.PlaywrightRenderedScraper import fetch_content as fetch_via_rendered

            rendered_result = fetch_via_rendered(url=url, timeout_ms=15000, proxy=None)
            rendered_html = rendered_result.get("content", "")
            candidate = {
                "url": url,
                "raw_html": rendered_html or request_html,
                "content": _extract_text(rendered_html),
                "errors": list(rendered_result.get("errors", []) or []),
                "backend": "rendered",
            }
            if _score_scrape_result(candidate["content"], candidate["errors"]) > _score_scrape_result(best_result["content"], best_result["errors"]):
                best_result = candidate
        except Exception as exc:
            logger.warning("rendered content fallback failed for %s: %s", url, exc)

    return best_result


def _text_cleaner(text: str) -> str:
    raw = (text or "").replace("\r", "\n")
    lines = []
    noise_tokens = (
        "相关阅读",
        "推荐阅读",
        "延伸阅读",
        "点击查看",
        "来源：",
        "原标题：",
        "责任编辑",
        "广告",
        "免责声明",
        "copyright",
        "all rights reserved",
    )
    for line in raw.splitlines():
        cleaned = " ".join(line.split()).strip()
        if not cleaned:
            continue
        lower = cleaned.lower()
        if any(token in lower for token in noise_tokens):
            continue
        if len(cleaned) <= 2:
            continue
        lines.append(cleaned)
    return "\n".join(lines).strip()


def _language_detector(text: str) -> str:
    text = text or ""
    zh_chars = sum(1 for char in text if "\u4e00" <= char <= "\u9fff")
    latin_chars = sum(1 for char in text if ("a" <= char.lower() <= "z"))
    script_chars = max(1, zh_chars + latin_chars)
    zh_ratio = zh_chars / script_chars
    if zh_ratio >= 0.45:
        return "zh-CN"
    if latin_chars > 0:
        return "en"
    return "unknown"


def _fact_checker(text: str) -> Dict[str, Any]:
    return {"status": "unverified", "confidence": 0.35, "notes": "当前为占位实现，后续可对接事实核查 API。"}


def _sentiment_analyzer(text: str) -> Dict[str, Any]:
    text = (text or "").lower()
    positive = any(word in text for word in ["improve", "growth", "record", "增长", "突破"])
    negative = any(word in text for word in ["risk", "loss", "decline", "下跌", "亏损"])
    if positive and not negative:
        sentiment = "positive"
    elif negative and not positive:
        sentiment = "negative"
    else:
        sentiment = "neutral"
    return {"sentiment": sentiment}


def _knowledge_graph_query(query: str) -> Dict[str, Any]:
    return {"query": query[:100], "matched": False, "notes": "当前为占位实现，后续可接知识图谱或向量检索。"}


def _social_media_monitor(news_id: str) -> Dict[str, Any]:
    return {"news_id": news_id, "impact_score": 5, "notes": "当前为占位实现，后续可接社交媒体数据源。"}


def _url_monitor(url: str, interval: int) -> Dict[str, Any]:
    return {"url": url, "interval": interval, "status": "scheduled"}


def _email_sender(to: str, subject: str, body: str) -> Dict[str, Any]:
    print(f"[Notification] to={to} subject={subject} body={body[:120]}")
    return {"status": "logged", "to": to, "subject": subject}


def _app_notifier(user_id: str, content: str) -> Dict[str, Any]:
    print(f"[AppNotifier] user_id={user_id} content={content[:120]}")
    return {"status": "logged", "user_id": user_id}


def _runtime_default_agents() -> List[Agent]:
    return [
        Agent(
        id="search_agent",
        name="新闻搜索代理",
        description="负责拉取候选新闻链接和原始内容。",
        agent_type=AgentType.SEARCH,
        llm_config={"model": "mock-search"},
        prompt_template="请根据查询抓取相关新闻：{query}",
        available_skills=["web_search", "content_scraper"],
        ),
        Agent(
        id="preprocessing_agent",
        name="内容预处理代理",
        description="负责清洗文本、提取正文和识别语言。",
        agent_type=AgentType.PREPROCESSING,
        llm_config={"model": "mock-preprocess"},
        prompt_template="请清洗并标准化以下新闻内容：{content}",
        available_skills=["text_cleaner", "language_detector"],
        ),
        Agent(
        id="summarization_agent",
        name="内容结构化代理",
        description="负责生成标题与摘要提纯结果。",
        agent_type=AgentType.SUMMARIZATION,
        llm_config={
            "model": settings.ai_content_model,
            "remote_model": settings.ai_content_remote_model,
            "base_url": settings.ai_content_base_url,
            "api_key": settings.ai_content_api_key,
            "max_tokens": settings.ai_content_max_tokens,
            "temperature": settings.ai_content_temperature,
            "response_format_json": settings.ai_content_json_mode,
        },
        prompt_template=(
            "请阅读以下新闻正文，输出结构化 JSON，只包含 title_zh、summary_zh、title_en、summary_en。"
            "不要输出标签、分类、评分。新闻正文：{content}"
        ),
        ),
        Agent(
        id="bias_detection_agent",
        name="偏向性分析代理",
        description="保留兼容，用于承接历史配置。",
        agent_type=AgentType.BIAS_DETECTION,
        llm_config={
            "model": settings.ai_review_model,
            "remote_model": settings.ai_review_remote_model,
            "base_url": settings.ai_review_base_url,
            "api_key": settings.ai_review_api_key,
            "max_tokens": settings.ai_review_max_tokens,
            "temperature": settings.ai_review_temperature,
            "response_format_json": settings.ai_review_json_mode,
        },
        prompt_template="请分析以下新闻的偏向性、事实完整性与情绪倾向：{content}",
        available_skills=["fact_checker", "sentiment_analyzer"],
        ),
        Agent(
        id="evaluation_agent",
        name="多维评价代理",
        description="保留兼容，用于承接历史配置。",
        agent_type=AgentType.EVALUATION,
        llm_config={
            "model": settings.ai_review_model,
            "remote_model": settings.ai_review_remote_model,
            "base_url": settings.ai_review_base_url,
            "api_key": settings.ai_review_api_key,
            "max_tokens": settings.ai_review_max_tokens,
            "temperature": settings.ai_review_temperature,
            "response_format_json": settings.ai_review_json_mode,
        },
        prompt_template="请从信息密度、真实性、影响力、传播范围为新闻打分：{content}",
        available_skills=["knowledge_graph_query", "social_media_monitor"],
        ),
        Agent(
        id="review_agent",
        name="分析复核代理",
        description="负责偏向分析、评分和最终复核。",
        agent_type=AgentType.REVIEW,
        llm_config={
            "model": settings.ai_review_model,
            "remote_model": settings.ai_review_remote_model,
            "base_url": settings.ai_review_base_url,
            "api_key": settings.ai_review_api_key,
            "max_tokens": settings.ai_review_max_tokens,
            "temperature": settings.ai_review_temperature,
            "response_format_json": settings.ai_review_json_mode,
        },
        prompt_template=(
            "请结合新闻摘要、事实核查、情绪、知识图谱和传播参考，"
            "输出 JSON，包含偏向分析、评分和最终复核结论：{payload}"
        ),
        ),
        Agent(
        id="scheduler_agent",
        name="调度代理",
        description="负责任务编排和定时触发。",
        agent_type=AgentType.SCHEDULER,
        llm_config={"model": "mock-scheduler"},
        prompt_template="请根据说明安排任务：{task_description}",
        available_skills=["trigger_news_crawl", "monitor_url", "send_notification"],
        ),
        Agent(
        id="notification_agent",
        name="通知代理",
        description="负责用户通知与推送。",
        agent_type=AgentType.NOTIFICATION,
        llm_config={"model": "mock-notification"},
        prompt_template="请根据以下内容生成通知：{notification_content}",
        available_skills=["email_sender", "app_notifier"],
        ),
    ]


def build_default_agent_registry() -> AgentRegistry:
    registry = AgentRegistry()
    try:
        file_agents = load_file_agents()
    except Exception:
        file_agents = []

    if file_agents:
        for item in file_agents:
            registry.register_agent(Agent.from_dict(item))
        return registry

    for agent in _runtime_default_agents():
        registry.register_agent(agent)
    return registry


def _runtime_default_skills() -> List[Skill]:
    return [
        Skill(
        id="web_search",
        name="网页搜索",
        description="获取候选新闻链接。",
        parameters={"query": {"type": "str", "required": True}},
        returns={"results": {"type": "list"}},
        implementation=_mock_web_search,
        ),
        Skill(
        id="content_scraper",
        name="内容抓取",
        description="抓取网页正文。",
        parameters={"url": {"type": "str", "required": True}},
        returns={"content": {"type": "dict"}},
        implementation=_content_scraper,
        ),
        Skill(
        id="text_cleaner",
        name="文本清洗",
        description="清洗文本格式。",
        parameters={"text": {"type": "str", "required": True}},
        returns={"text": {"type": "str"}},
        implementation=_text_cleaner,
        ),
        Skill(
        id="language_detector",
        name="语言检测",
        description="识别文本语言。",
        parameters={"text": {"type": "str", "required": True}},
        returns={"language": {"type": "str"}},
        implementation=_language_detector,
        ),
        Skill(
        id="fact_checker",
        name="事实核查",
        description="核查文本中的事实性陈述。",
        parameters={"text": {"type": "str", "required": True}},
        returns={"fact_check_result": {"type": "dict"}},
        implementation=_fact_checker,
        ),
        Skill(
        id="sentiment_analyzer",
        name="情绪分析",
        description="识别文本倾向。",
        parameters={"text": {"type": "str", "required": True}},
        returns={"sentiment": {"type": "dict"}},
        implementation=_sentiment_analyzer,
        ),
        Skill(
        id="knowledge_graph_query",
        name="知识图谱查询",
        description="查询知识库验证信息。",
        parameters={"query": {"type": "str", "required": True}},
        returns={"result": {"type": "dict"}},
        implementation=_knowledge_graph_query,
        ),
        Skill(
        id="social_media_monitor",
        name="社交媒体监控",
        description="估计外部传播影响力。",
        parameters={"news_id": {"type": "str", "required": True}},
        returns={"impact": {"type": "dict"}},
        implementation=_social_media_monitor,
        ),
        Skill(
        id="monitor_url",
        name="URL 监控",
        description="创建 URL 监控任务。",
        parameters={"url": {"type": "str", "required": True}, "interval": {"type": "int", "required": True}},
        returns={"status": {"type": "dict"}},
        implementation=_url_monitor,
        ),
        Skill(
        id="email_sender",
        name="邮件发送",
        description="发送邮件通知。",
        parameters={
            "to": {"type": "str", "required": True},
            "subject": {"type": "str", "required": True},
            "body": {"type": "str", "required": True},
        },
        returns={"status": {"type": "dict"}},
        implementation=_email_sender,
        ),
        Skill(
        id="app_notifier",
        name="应用通知",
        description="发送应用内通知。",
        parameters={
            "user_id": {"type": "str", "required": True},
            "content": {"type": "str", "required": True},
        },
        returns={"status": {"type": "dict"}},
        implementation=_app_notifier,
        ),
    ]


def build_default_skillset(llm_provider: LLMProvider | None = None) -> Skillset:
    del llm_provider
    skillset = Skillset()
    runtime_skills = {skill.id: skill for skill in _runtime_default_skills()}

    try:
        file_skills = {item["id"]: item for item in load_file_skills()}
    except Exception:
        file_skills = {}

    for skill_id, skill in runtime_skills.items():
        override = file_skills.get(skill_id)
        if override:
            metadata = dict(skill.metadata)
            metadata.update(override.get("metadata") or {})
            skill = Skill(
                id=skill.id,
                name=override.get("name", skill.name),
                description=override.get("description", skill.description),
                parameters=override.get("parameters", skill.parameters),
                returns=override.get("returns", skill.returns),
                implementation=skill.implementation,
                metadata=metadata,
            )
        skillset.register_skill(skill)
    return skillset
