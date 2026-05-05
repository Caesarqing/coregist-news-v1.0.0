# CoreGist News

CoreGist News 是一个基于微服务架构的 AI 新闻聚合、搜索、分析和推送平台。

## 当前架构

- `frontend/`: React + TypeScript + Vite Web 客户端。
- `backend/gateway/`: 唯一 HTTP API 网关。
- `backend/services/`: Node.js 在线服务和 Python 后台流水线服务。
- `backend/pipeline/`: 抓取、解析、RSS 来源和兼容任务入口。
- `backend/ai/`: 文件化 agents / skills 资源库。
- `packages/contracts/`: 共享 API 契约。
- `packages/design-tokens/`: 共享设计 token。
- `docs/`: 当前有效的架构、部署和运维文档。

## 快速开始

安装依赖后启动完整开发环境：

```bash
npm run dev
```

常用命令：

```bash
npm run dev
npm run build
npm run check:backend
npm --prefix frontend run build
npm --prefix backend run check
```

健康检查：

```bash
curl http://localhost:3000/api/health
```

## 服务端口

| 服务 | 端口 | 说明 |
| --- | --- | --- |
| Frontend | 5173 | Vite 开发服务器 |
| Gateway | 3000 | API 网关，唯一公开入口 |
| User Service | 3001 | 用户、认证、设置、追踪主题 |
| News Service | 3002 | 新闻查询和详情 |
| Agent Config Service | 3003 | Agent 配置 |
| Skill Config Service | 3004 | Skill 配置 |
| Search Service | 3005 | 搜索、聚合和 AI 搜索入口 |
| MongoDB | 27017 | 数据库 |
| RabbitMQ | 5672 | 消息队列 |
| Redis | 6379 | 缓存 |

## 文档入口

- [文档索引](docs/README.md)
- [系统架构](docs/ARCHITECTURE.md)
- [后端说明](docs/BACKEND.md)
- [前端说明](docs/FRONTEND.md)
- [认证与访问控制](docs/AUTH.md)
- [新闻流水线](docs/NEWS_PIPELINE.md)
- [LLM 配置](docs/LLM.md)
- [部署指南](docs/DEPLOYMENT.md)
- [运维排查](docs/OPERATIONS.md)

## 关键约定

- 新功能默认走微服务架构，`backend/legacy/server.js` 只保留为回滚和对照入口。
- 前端访问后端统一走 Gateway `/api/*`。
- `/home`、`/news`、新闻产品页和所有业务 API 都需要登录。
- Python LLM 调用统一使用通用接口配置：`LLM_PROVIDER`、`LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL`。

## License

[LICENSE](LICENSE)
