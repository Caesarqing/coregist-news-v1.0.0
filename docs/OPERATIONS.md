# 运维排查

## 常用状态命令

```bash
pm2 list
pm2 logs coregist-gateway --lines 80 --nostream
pm2 logs coregist-user --lines 80 --nostream
pm2 logs coregist-news-service --lines 80 --nostream
pm2 logs coregist-search-service --lines 80 --nostream
pm2 logs coregist-scheduler --lines 80 --nostream
pm2 logs coregist-news-scraper --lines 80 --nostream
pm2 logs coregist-content-processing --lines 80 --nostream
pm2 logs coregist-ai-dispatcher --lines 80 --nostream
pm2 logs coregist-ai-analysis --lines 120 --nostream
```

## 新闻不更新

按顺序检查：

1. `pm2 list` 确认 worker 在线。
2. RabbitMQ 是否监听 `5672`。
3. Scheduler 是否持续报错。
4. News Scraper 是否只是在某些来源上 401 / 403。
5. Content Processing / AI Analysis 是否连续 `LLM invoke failed`。
6. MongoDB 是否可连接。
7. 手动发布一次 RSS 触发任务。

手动触发见 [NEWS_PIPELINE.md](NEWS_PIPELINE.md)。

## 登录后没有新闻

先区分是鉴权问题还是数据问题：

```bash
curl -i 'https://coregist-news.com/api/news?page=1&limit=1'
```

未带 token 返回 401 是正常的。登录后浏览器仍无数据时：

- 打开浏览器开发者工具看 `/api/news` 是否 200。
- 检查 access token 是否存在并随请求发送。
- 检查 News Service 和 Search Service 日志。
- 检查最终新闻集合是否有最近入库记录。

## LLM 失败

```bash
cd /root/coregist-news/backend

python3 - <<'PY'
from services.shared.python.settings import settings
print("provider:", settings.llm_provider)
print("base_url:", settings.llm_base_url)
print("model:", settings.llm_model)
print("json mode:", settings.llm_json_mode)
PY
```

如果配置正确但供应商返回 500、402、524 等错误，问题通常在模型网关、额度、模型名或服务负载。

## 清空日志

```bash
pm2 flush coregist-content-processing
pm2 flush coregist-ai-analysis
```

清空后再触发任务，可以避免旧错误干扰判断。

## 安全提醒

如果任何真实密钥已经出现在聊天、文档或提交历史里，应轮换：

- MongoDB 用户密码。
- `JWT_SECRET` / `JWT_REFRESH_SECRET`。
- LLM API key。
- Firebase / OAuth 相关密钥。
