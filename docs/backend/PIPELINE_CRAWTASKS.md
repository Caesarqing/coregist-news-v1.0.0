# CrawTasks 与抓取流水线

更新时间：2026-04-10

## 结论

`backend/CrawTasks/` 已经不是当前主抓取链路的核心实现目录。

当前推荐路径是统一 RSS/抓取流水线：

- `backend/rss_registry.py`
- `backend/rss_adapters.py`
- `backend/rss_ingestion.py`
- `backend/news_scraper_service.py`
- `backend/services/news_scraper/service.py`

`backend/CrawTasks/` 目前主要承担两类角色：

1. 历史抓取器保留区
2. 对统一抓取流水线的兼容包装入口

## 当前定位

### 不再推荐

- 直接把新抓取逻辑继续堆到 `backend/CrawTasks/legacy`
- 在 `CrawTasks` 目录下继续扩展新的独立抓取实现

### 当前推荐

- 新的 RSS 来源注册：放到 `rss_registry.py`
- 来源适配：放到 `rss_adapters.py`
- 抓取调度与落库：走 `rss_ingestion.py` / `news_scraper_service.py`
- 更进一步的长期目标：继续向 `backend/pipeline/` 收口

## 运行示例

```bash
python - <<'PY'
from rss_ingestion import run_rss_ingestion
print(run_rss_ingestion(publisher_ids=['bbc'], limit_per_feed=5))
PY
```

## 后续改造建议

1. 将 `CrawTasks` 中的兼容包装入口逐步迁入 `backend/pipeline/sources/`
2. 保留 `legacy/` 仅作回滚参考，不再新增业务逻辑
3. 所有新抓取能力统一走 RSS registry / adapters / ingestion 这条链路
