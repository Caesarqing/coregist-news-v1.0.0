# Final Repo Closure Checklist

## Scope
This checklist captures the final closure state for the CoreGist News repository after the search-pipeline refactor, repository cleanup, and model-provider consolidation work.

## 1. Architecture Closure
- Frontend remains `React + Vite`.
- Backend mainline remains `gateway + microservices`.
- Legacy monolith is preserved only as compatibility fallback:
  - `backend/legacy/server.js`
- Search is now handled by a dedicated service:
  - `backend/services/search-service`
- Python processing path is split into:
  - `news_scraper`
  - `content_processing`
  - `ai_dispatcher`
  - `ai_analysis`

## 2. Search Pipeline Closure
- Unified search entry is in place:
  - `POST /api/search/query`
  - `GET /api/search/jobs/:jobId`
  - `POST /api/search/jobs/:jobId/retry`
- Compatibility routes remain available:
  - `GET /api/news/search`
  - `POST /api/ai-search`
- Search flow now follows:
  - `discovery_news`
  - `user_discovery_news`
  - `raw_news`
  - `news_status`
  - `news`
  - `user_news_maps`
- RSS is discovery-first.
- Fulltext enrichment is on-demand.
- AI processing is asynchronous.
- User-visible search results are based on completed content.

## 3. Cleaning And Quality Gate Closure
- Content processing now persists layered artifacts:
  - `feed_snapshot`
  - `crawl_snapshot`
  - `extracted_content`
  - `normalized_content`
  - `content_quality`
- Quality gate now checks at least:
  - character count
  - word count
  - paragraph count
  - duplicate line ratio
  - noise ratio
- Low-quality content does not enter final `news`.

## 4. User Visibility Closure
- User-private search ownership is enforced through:
  - `user_news_maps`
- Existing globally processed content can be reused without rerunning AI.
- Tracking-topic jobs and push-settings jobs now share the same scheduling rhythm.

## 5. LLM Provider Closure
External model calls now go through the Python provider adapter:
- OpenAI-compatible `/chat/completions` APIs, including DMAX, OpenRouter, Ollama `/v1`, and compatible hosted gateways.
- Anthropic native `/v1/messages`.

Removed or disabled provider paths:
- Gemini
- Poe
- Node.js model client path

Key files:
- `backend/services/shared/python/llm.py`
- `backend/services/shared/python/settings.py`
- `backend/env.example`
- `backend/docker-compose.yml`

Deleted model-specific leftovers:
- `backend/docker-compose.llm.yml`
- `backend/pipeline/llm/summarize_with_gemini.py`
- `backend/pipeline/llm/summarize_with_gpt.py`
- `backend/pipeline/llm/summarize_with_ollama.py`
- `backend/pipeline/llm/summarize_with_poe.py`

## 6. Repository Cleanup Closure

**Status:** ✅ **Completed on 2026-04-27**

Comprehensive codebase cleanup has been executed and verified. See [CLEANUP_REPORT.md](../CLEANUP_REPORT.md) for full details.

### Removed Files (34 total)
- **Python Re-export Files (10)**: Removed redundant re-export layer
  - `backend/agent_registry.py`, `agent_runtime.py`, `llm_provider.py`, etc.
- **Duplicate Entry Points (1)**: `backend/server.js` (legacy monolith preserved at `backend/legacy/server.js`)
- **Old Crawler Files (13)**: Removed outdated crawler implementations from `backend/CrawTasks/`
- **Service Startup Scripts (7)**: Removed duplicate service scripts
  - `backend/agent_config_service.py`, `ai_analysis_service.py`, etc.
- **Frontend Config Files (3)**: Removed unused deployment configs
  - `frontend/netlify.toml`, `vercel.json`, `Dockerfile`

### Documentation Consolidation
- **Unified Architecture Doc**: Created `docs/ARCHITECTURE.md` consolidating:
  - `PROJECT_INTEGRATION_AUDIT.md`
  - `LEGACY_TO_MICROSERVICES_ROUTE_MATRIX.md`
  - `REPO_CLEANUP_STATUS.md`
- **Archived Old Docs**: Moved to `docs/archive/`

### Configuration Updates
- Created `backend/.env.example` template
- Updated `.gitignore` with cleanup-related entries
- Updated `backend/package.json` (removed references to deleted files)

### Verification Results
- ✅ All Python services verified (8 services)
- ✅ All Node.js services verified (3 services)
- ✅ Startup scripts functional
- ✅ Health endpoints responding
- ✅ No references to deleted files remain

### Backup
All deleted files backed up to: `.cleanup-backup/20260427_160256/`

---

**Previous cleanup items:**

Removed repository leftovers and migration artifacts include:
- `frontend/dist`
- Python `__pycache__`
- Python `*.pyc`
- `.DS_Store`
- `frontend/design-system/...`
- `backend/CrawTasks/legacy/*`
- historical LLM compatibility directories removed in previous cleanup rounds

Runtime folders were also cleared after verification:
- `backend/.runtime`
- `backend/.runlogs`

## 7. MongoDB Test Data Cleanup
Removed test data created during integration and search-pipeline verification.

Deleted entities included:
- test users with `plansearch_*.example.com`
- related `user_search_jobs`
- related `user_discovery_news`
- related `user_news_maps`
- related `raw_news`
- related `news_status`
- related `agent_news_analyses`
- related final `news`
- related `discovery_news`

Cleanup result:
- target users removed
- related jobs removed
- related pipeline records removed
- related final news records removed

## 8. Validation Summary
Validated during final closure:
- backend syntax check passed
- Python compile checks passed for touched modules
- frontend type check passed
- frontend production build passed
- unified search path executed end-to-end
- compatibility search endpoints still worked
- DMAX provider invocation succeeded in Node and Python paths
- repository runtime folders removed after shutdown

## 9. Intentional Preservations
The following were intentionally preserved because they are not LLM-provider residue:
- Google / Firebase auth integration
- Google login controller and OAuth client usage
- frontend Firebase login flow
- analytics / non-LLM third-party integrations unless separately requested

## 10. Optional Next Steps
These are not closure blockers, only future work options:
- tune DMAX prompts for better multilingual title/summary quality
- add a new provider beside `dmxapi` and `openrouter`
- add domain-specific extraction rules for more sources
- add stronger dedupe/index rules for `discovery_news`
- export this checklist into project management / handoff docs if needed
