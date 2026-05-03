# Contabo News Recovery Checklist

Use this checklist when deploying fixes for an empty News Center on the Contabo server.

## Files Changed

Upload these project changes:

- `frontend/.env.production`
- `backend/services/shared/python/queue.py`
- `backend/services/shared/python/llm.py`
- `backend/scripts/start-local-backend.sh`
- `docs/frontend/DOMAIN_SETUP_GUIDE.md`
- `docs/backend/CONTABO_NEWS_RECOVERY_CHECKLIST.md`

Do not overwrite production secrets or runtime data:

- `backend/.env`
- `.env`
- `backend/.runtime/`
- MongoDB data volumes
- `node_modules/`
- `.git/`

## Pre-Deploy Checks On Server

```bash
cd /path/to/coregist-news
docker compose ps
docker compose logs --tail=100 scheduler-service
docker compose logs --tail=100 news-scraper-service
docker compose logs --tail=100 content-processing-service
docker compose logs --tail=100 ai-dispatcher-service
docker compose logs --tail=100 ai-analysis-service
```

Confirm API and pipeline services use the same database:

```bash
docker compose exec news-service env | grep -E 'MONGODB|DMAX|OPENROUTER|AI_CONTENT|AI_REVIEW'
docker compose exec ai-analysis-service env | grep -E 'MONGODB|DMAX|OPENROUTER|AI_CONTENT|AI_REVIEW'
```

At least one LLM path must be configured for AI analysis:

- `DMAX_API`, or
- `OPENROUTER_API_KEY` plus `OPENROUTER_MODEL`

## Deploy

```bash
docker compose up -d --build gateway news-service search-service scheduler-service news-scraper-service content-processing-service ai-dispatcher-service ai-analysis-service
```

## Verify

```bash
curl https://coregist-news.com/api/health
curl https://coregist-news.com/api/search/public-health
curl 'https://coregist-news.com/api/news?page=1&limit=5&lang=zh-CN'
```

Expected:

- `/api/health` is `ok` or only unrelated services are degraded.
- `news_count` is greater than `0`.
- `/api/news` returns non-empty `items`.

## Notes

The frontend production build should use same-origin API proxying:

```env
VITE_API_BASE_URL=/api
```

Do not set it to `https://api.coregist-news.com` unless DNS and SSL are configured for that subdomain.
