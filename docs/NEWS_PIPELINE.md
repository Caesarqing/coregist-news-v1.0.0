# 新闻流水线

## 目标链路

```text
Scheduler or manual trigger
  -> news_crawl_trigger_queue
  -> News Scraper
  -> news_raw_queue
  -> Content Processing
  -> ai_tasks_queue
  -> AI Analysis
  -> MongoDB final news
  -> Search Service / News Service
  -> Frontend
```

## 手动触发 RSS 抓取

```bash
cd /root/coregist-news/backend

python3 - <<'PY'
from services.shared.python.queue import QueueClient, QUEUE_NEWS_CRAWL_TRIGGER
from services.shared.python.settings import settings

QueueClient().publish(QUEUE_NEWS_CRAWL_TRIGGER, {
    "mode": "rss",
    "publish_raw": True,
    "limit_per_feed": min(settings.rss_max_items_per_feed, 2),
    "source_limit": 8,
})
print("published")
PY
```

## 状态检查

需要登录 token 的公网 API 会返回 401；本地排查可以看 worker 日志和数据库状态。

```bash
pm2 list
pm2 logs coregist-scheduler --lines 80 --nostream
pm2 logs coregist-news-scraper --lines 80 --nostream
pm2 logs coregist-content-processing --lines 80 --nostream
pm2 logs coregist-ai-dispatcher --lines 80 --nostream
pm2 logs coregist-ai-analysis --lines 120 --nostream
```

常见指标：

- `news_count`: 最终可见新闻数量。
- `raw_ready_count`: 等待内容处理的 raw news。
- `raw_processing_count`: 正在处理的 raw news。
- `discovery_count`: 抓取发现但未全部完成的记录。
- `last_completed_news_at`: 最近完成时间。

## 常见问题

### RabbitMQ 不通

表现为 `pika.exceptions.AMQPConnectionError`。检查 RabbitMQ 是否以 Docker、系统服务或其他方式运行：

```bash
ss -lntp | grep 5672
docker ps | grep rabbit
```

### Playwright 浏览器缺失

表现为 `BrowserType.launch: Executable doesn't exist`。安装浏览器：

```bash
python3 -m playwright install chromium
```

### LLM 不可用

表现为 content-processing 或 ai-analysis 日志持续出现 `LLM invoke failed`。检查 [LLM.md](LLM.md) 的通用配置和模型可用性。

### 来源 401 / 403

部分媒体会阻止抓取，这是来源侧限制。流水线应继续处理其他来源，不应因为单个来源失败而整体停止。
