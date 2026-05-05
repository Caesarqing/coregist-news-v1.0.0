# 后端说明

## 服务组成

后端由在线 API 服务和离线 worker 两部分组成。

在线 API：

- `backend/gateway/app.js`
- `backend/services/user-service/app.js`
- `backend/services/news-service/app.js`
- `backend/services/search-service/app.js`
- `backend/services/agent_config/app.py`
- `backend/services/skill_config/app.py`

离线 worker：

- `backend/services/scheduler/app.py`
- `backend/services/news_scraper/app.py`
- `backend/services/content_processing/app.py`
- `backend/services/ai_dispatcher/app.py`
- `backend/services/ai_analysis/app.py`
- `backend/services/notification/app.py`

## 本地运行

完整开发入口：

```bash
npm run dev
```

仅检查后端语法：

```bash
npm --prefix backend run check
python3 -m py_compile \
  backend/services/shared/python/settings.py \
  backend/services/shared/python/llm.py \
  backend/services/content_processing/service.py \
  backend/services/ai_analysis/service.py
```

本地后端脚本：

```bash
bash backend/scripts/start-local-backend.sh
bash backend/scripts/stop-local-backend.sh
```

## 环境变量

必需基础配置：

```env
MONGODB_URI=mongodb://127.0.0.1:27017/coregistnews
MONGODB_DB_NAME=coregistnews
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me
```

服务端口：

```env
GATEWAY_PORT=3000
USER_SERVICE_PORT=3001
NEWS_SERVICE_PORT=3002
AGENT_CONFIG_PORT=3003
SKILL_CONFIG_PORT=3004
SEARCH_SERVICE_PORT=3005
```

服务 URL：

```env
USER_SERVICE_URL=http://127.0.0.1:3001
NEWS_SERVICE_URL=http://127.0.0.1:3002
SEARCH_SERVICE_URL=http://127.0.0.1:3005
AGENT_CONFIG_SERVICE_URL=http://127.0.0.1:3003
SKILL_CONFIG_SERVICE_URL=http://127.0.0.1:3004
```

LLM 配置见 [LLM.md](LLM.md)。

## 代码边界

- 用户域代码放在 `services/user-service/`。
- 新闻查询代码放在 `services/news-service/`。
- 搜索聚合代码放在 `services/search-service/`。
- Node 共享模块放在 `services/shared/node/`。
- Python 共享模块放在 `services/shared/python/`。
- `backend/legacy/server.js` 只做兼容和回滚，不作为新功能入口。

## Docker Compose

```bash
cd backend
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 gateway
```

Compose 会启动 MongoDB、RabbitMQ、Redis、Gateway、在线 API 服务和 Python worker。
