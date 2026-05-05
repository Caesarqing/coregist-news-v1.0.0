# CoreGist News 文档

本文档目录只保留当前有效的项目说明、部署说明和运维手册。历史修复记录、一次性迁移记录和重复指南已合并删除。

## 核心文档

- [ARCHITECTURE.md](ARCHITECTURE.md): 系统架构、服务边界、请求链路。
- [BACKEND.md](BACKEND.md): 后端服务、环境变量、队列和本地运行。
- [FRONTEND.md](FRONTEND.md): 前端结构、路由、API 客户端和构建。
- [AUTH.md](AUTH.md): 登录、Firebase、JWT、路由保护和 API 访问控制。
- [NEWS_PIPELINE.md](NEWS_PIPELINE.md): RSS 抓取、内容处理、AI 分析、搜索入库和排查。
- [LLM.md](LLM.md): OpenAI-compatible / Anthropic / Ollama 等通用 LLM 接口配置。
- [DEPLOYMENT.md](DEPLOYMENT.md): 生产部署、域名、PM2、Docker Compose 和回滚。
- [OPERATIONS.md](OPERATIONS.md): 常用排查命令、日志、新闻不更新处理流程。
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md): 第三方素材和组件 attribution。
- [ai-library/README.md](ai-library/README.md): 文件化 Agent / Skill 资源库说明。

## 文档维护规则

- 新增功能优先更新上述稳定文档，不再新增一次性“修复完成报告”。
- 临时排查记录应进入 issue、PR 或运维日志，确认长期有效后再整理进文档。
- 不在文档中写入真实密钥、数据库密码、JWT secret 或第三方 token。
- 过期文档直接删除，不保留重复版本。
