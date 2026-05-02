# CoreGist Backend

## Current Backend Shape

This backend now has two layers:

1. Online API services
- `gateway/`: single public entrypoint that proxies frontend requests.
- `services/user-service/`: auth, profile, settings, tracking topics.
- `services/news-service/`: news query, detail, state update, AI search.

2. Offline AI agent pipeline
- `news_scraper_service.py`: produce raw news tasks.
- `content_processing_service.py`: clean and normalize raw news.
- `ai_analysis_service.py`: summarization, bias detection, evaluation, review.
- `scheduler_service.py`: periodic crawl trigger and URL monitoring jobs.
- `notification_service.py`: consume notification tasks and fan out delivery.
- `agent_config_service.py`: CRUD for Agent configs stored in MongoDB.
- `skill_config_service.py`: CRUD for Skill configs stored in MongoDB.

Shared runtime modules:
- `agent_registry.py`: Agent / AgentRegistry definitions.
- `skillset.py`: Skill / Skillset definitions.
- `agent_runtime.py`: default built-in agents and skills.
- `rss_registry.py`: centralized RSS source registry.
- `rss_adapters.py`: site adapter layer for publisher-specific extraction.
- `rss_ingestion.py`: local one-shot RSS ingestion runner.
- `llm_provider.py`: LLM abstraction.
- `queue_utils.py`: RabbitMQ and Mongo helpers.
- `service_settings.py`: Python service env parsing.
- `services/shared/node/`: shared Node auth/db/helper modules.

Legacy code kept for rollback only:
- `server.js`: old monolithic backend entrypoint.

## Request Flow

Frontend -> `gateway` -> `user-service` / `news-service`

Crawler / scheduler -> RabbitMQ -> content processing -> AI analysis -> MongoDB / notifications

RSS path:
`rss_registry.py` -> `rss_adapters.py` -> `news_scraper_service.py` -> `content_processing_service.py` -> `ai_analysis_service.py` -> MongoDB

## Recommended Entrypoints

Local Node entrypoints:
- `npm start` -> gateway
- `npm run start:user-service`
- `npm run start:news-service`
- `npm run start:legacy` -> old monolith only for rollback/debugging

Docker entrypoint:
- `docker compose up --build`

## Directory Rules

Keep these boundaries clear:
- user domain code only in `services/user-service/`
- news query code only in `services/news-service/`
- shared Node helpers only in `services/shared/node/`
- Python service runtime modules stay at project root unless promoted to a shared package
- service container definitions stay in `services/<service>/Dockerfile`

## What Was Cleaned Up

- default runtime switched away from `server.js`
- Docker build context now excludes secrets and caches via `.dockerignore`
- config services can now expose and bootstrap built-in default agents / skills
- RabbitMQ consumer flow now uses manual ack/nack instead of auto-ack
- legacy standalone crawler scripts moved under `CrawTasks/legacy/`
- `CrawTasks/*.py` now act as compatibility wrappers over the unified RSS ingestion path

## Local Run

- Start local MongoDB + RabbitMQ + core services + pipeline workers:
  - `bash /Users/qingpeng/全公司项目/7-人工智能/新闻AI项目/coregist-news/backend/scripts/start-local-backend.sh`
- Stop locally started services:
  - `bash /Users/qingpeng/全公司项目/7-人工智能/新闻AI项目/coregist-news/backend/scripts/stop-local-backend.sh`
- Local health check:
  - `http://127.0.0.1:3000/api/health`
- For local pipeline verification, `.env` currently uses `AI_CONTENT_MODEL=mock` and `AI_REVIEW_MODEL=mock`.
  Switch them back to a real provider when a working self-hosted or cloud model is available.
