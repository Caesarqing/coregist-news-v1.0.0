# CoreGist News

CoreGist News 是一个基于微服务架构的AI新闻聚合平台。

## 主线架构

- `frontend/`: React + Vite Web 客户端
- `backend/gateway/`: 唯一 HTTP 网关入口
- `backend/services/`: Node.js / Python 微服务
- `backend/pipeline/`: 抓取、清洗、LLM、工具与来源入口
- `backend/ai/`: 文件为主的 agents / skills 资源库
- `packages/contracts/`: 共享 API 契约
- `packages/design-tokens/`: 共享设计 token
- `docs/`: 架构、运行、后端、前端与 AI 库文档

## 快速开始

### 推荐开发入口

```bash
npm run dev
```

这会：

1. 启动本地后端栈（Gateway + 所有微服务）
2. 启动前端开发服务器

### 常用命令

```bash
npm run dev              # 启动完整开发环境
npm run build            # 构建前端生产版本
npm run check:backend    # 检查后端代码语法
npm --prefix frontend run build  # 仅构建前端
```

## 文档

- **架构文档**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - 完整的系统架构说明
- **清理报告**: [docs/CLEANUP_REPORT.md](docs/CLEANUP_REPORT.md) - 代码库清理和优化报告
- **多语言修复**: [docs/MULTILINGUAL_FIX_REPORT.md](docs/MULTILINGUAL_FIX_REPORT.md) - 多语言支持修复报告
- **登录问题分析**: [docs/LOGIN_ISSUES_ANALYSIS.md](docs/LOGIN_ISSUES_ANALYSIS.md) - Google登录和Token刷新问题分析
- **文档入口**: [docs/README.md](docs/README.md) - 文档导航
- **历史文档**: [docs/archive/](docs/archive/) - 已归档的旧文档

## 技术栈

### 前端
- React 18.2 + TypeScript
- Vite 7.1
- Tailwind CSS + Shadcn UI
- React Router v6

### 后端
- **Node.js**: Express 5.1 + MongoDB (Mongoose 9.0)
- **Python**: Playwright + BeautifulSoup4 + LLM集成
- **数据库**: MongoDB 7
- **消息队列**: RabbitMQ 3
- **缓存**: Redis 7

## 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend | 5173 | Vite开发服务器 |
| Gateway | 3000 | API网关（唯一入口） |
| User Service | 3001 | 用户服务 |
| News Service | 3002 | 新闻服务 |
| Search Service | 3005 | 搜索服务 |
| MongoDB | 27017 | 数据库 |
| RabbitMQ | 5672 | 消息队列 |
| Redis | 6379 | 缓存 |

## 健康检查

```bash
curl http://localhost:3000/api/health
```

## 重要说明

- `backend/legacy/server.js` 仅作回滚与兼容，不再作为主开发入口
- 所有新功能开发应使用微服务架构
- 前端API请求统一通过Gateway (`:3000`)
- **代码库已于2026-04-27完成清理优化**（删除34个冗余文件，详见[清理报告](docs/CLEANUP_REPORT.md)）

## 贡献指南

1. 从 `main` 分支创建功能分支
2. 本地开发和测试
3. 运行健康检查确保服务正常
4. 提交代码并创建Pull Request

## License

[LICENSE](LICENSE)

---

**更多详细信息请查看 [架构文档](docs/ARCHITECTURE.md)**
