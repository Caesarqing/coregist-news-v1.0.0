# 仓库整理状态

更新时间：2026-04-10

## 已完成

- 文档主入口已统一到 `docs/`
- 架构审计文档已归档到 `docs/architecture/`
- Legacy 与微服务路由对照表已补齐
- CrawTasks 说明已收口到 `docs/backend/PIPELINE_CRAWTASKS.md`
- 前端共享层已落地并开始被真实消费：
  - `packages/contracts/`
  - `packages/design-tokens/`
  - `frontend/src/shared/i18n/`
  - `frontend/src/features/news-data/`
- 前端目录已明显收口：
  - `frontend/src/shared/components/`
  - `frontend/src/shared/layouts/`
  - `frontend/src/shared/ui/`
  - `frontend/src/shared/providers/`
- 前端空壳目录已清理：
  - `frontend/src/layouts`
  - `frontend/src/routes`
- 后端旧单体已降级到 `backend/legacy/server.js`
- 后端 Python 共享层已翻正为主承载：
  - `services/shared/python/settings.py`
  - `services/shared/python/queue.py`
  - `services/shared/python/llm.py`
  - `services/shared/python/news_identity.py`
  - `services/shared/python/agent_registry.py`
  - `services/shared/python/skillset.py`
  - `services/shared/python/agent_runtime.py`
  - `services/shared/python/rss_registry.py`
  - `services/shared/python/rss_adapters.py`
  - `services/shared/python/rss_ingestion.py`
- 后端抓取与处理基础库已迁入 `backend/pipeline/`
- Python 服务实现已归位到 `backend/services/<name>/service.py`
- 前端嵌套元数据目录已清理：
  - `frontend/.git`
  - `frontend/.github`
  - `frontend/.cursor`
  - `frontend/.codex`
- 后端运行产物目录已清理：
  - `backend/.runtime`
  - `backend/.runlogs`
- 前端 `Browserslist` 数据已刷新，构建告警已清除
- 已修复 Python 历史 `SyntaxWarning`：
  - `pipeline/scrapers/PlaywrightRenderedScraper.py`
  - `pipeline/tools/AiServiceBalanceQuery.py`
- 调度服务依赖 `APScheduler` 当前环境已可导入

## 当前仍待处理

当前没有阻塞主结构的遗留项。

后续属于常规维护，而不是本轮改造未完成项：

1. 按需周期性刷新 `Browserslist` 数据
2. 新增 Python 模块时继续遵守 `services/shared/python` 与 `pipeline/` 的归位约束
3. 后续扩展 agent/skill 时优先走 `backend/ai/` 文件库

## 当前判断

仓库结构改造与环境收尾已经完成，当前仓库可以按既定主线继续开发。
