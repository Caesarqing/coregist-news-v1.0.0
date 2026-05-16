# CoreGist News

<p align="center">
  <img src="docs/assets/coregist-logo-512.png" alt="CoreGist News Logo" width="160" height="160">
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a>
</p>

CoreGist News is a GPLv3-licensed AI news application for learning, academic research, and educational demonstrations. It combines a React frontend, Node.js API services, Python news workers, MongoDB, RabbitMQ, and an LLM provider to collect news, clean articles, generate summaries, support search, and prepare personalized news pushes.

<img src="docs/assets/news-showcase.png" alt="CoreGist News showcase" width="100%">

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Download and Installation](#download-and-installation)
- [Project Structure](#project-structure)
- [Services and Ports](#services-and-ports)
- [Configuration](#configuration)
- [News Pipeline](#news-pipeline)
- [API and Authentication](#api-and-authentication)
- [Deployment](#deployment)
- [Operations](#operations)
- [Disclaimer and Compliance](#disclaimer-and-compliance)
- [License](#license)

## Features

- News aggregation from RSS and keyword-based crawl tasks.
- Article cleanup, source normalization, recency filtering, and queue-based processing.
- AI-generated titles, summaries, tags, categories, bias review, fact review, and sentiment signals.
- News search, AI search, tracking topics, and personalized push batches.
- A single Gateway entrypoint for frontend API access and service authentication.

## Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB
- RabbitMQ
- Redis, optional for cache-related workflows
- An OpenAI-compatible, Anthropic, or mock LLM provider

## Download and Installation

Clone the repository:

```bash
git clone https://github.com/Caesarqing/coregist-news-v1.0.0.git
cd coregist-news-v1.0.0
```

Install dependencies:

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

Create the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and provide at least MongoDB, JWT, RabbitMQ, and LLM settings. Start the local development environment:

```bash
npm run dev
```

Run checks:

```bash
npm run check:backend
npm --prefix frontend run build
```

Health check:

```bash
curl http://localhost:3000/api/health
```

## Project Structure

```text
coregist-news-v1.0.0/
├── README.md                       English project guide
├── README.zh-CN.md                 Chinese project guide
├── LICENSE                         GNU GPLv3 license
├── package.json                    Root scripts
├── backend/
│   ├── .env.example                Unified backend environment template
│   ├── docker-compose.yml          Local infrastructure and service compose file
│   ├── gateway/                    API Gateway and request forwarding
│   ├── services/
│   │   ├── user-service/           Users, authentication, settings, tracking topics
│   │   ├── news-service/           News list, detail, category, and display APIs
│   │   ├── search-service/         Search, AI search, and aggregation APIs
│   │   ├── news_scraper/           RSS and keyword crawl workers
│   │   ├── content_processing/     Article cleanup, quality checks, classification
│   │   ├── ai_dispatcher/          AI task dispatch worker
│   │   ├── ai_analysis/            Summary, review, tagging, and final persistence
│   │   ├── notification/           Notification delivery worker
│   │   └── shared/                 Shared Node.js and Python runtime helpers
│   └── scripts/                    Local startup, diagnostics, and repair scripts
├── frontend/
│   ├── public/                     Static icons and public assets
│   └── src/                        React application source
├── packages/
│   └── contracts/                  Shared DTOs, API paths, and TypeScript types
└── docs/
    └── assets/                     README images and documentation assets
```

Directory notes:

- `frontend/src/app/` contains app bootstrap, routing, and providers.
- `frontend/src/pages/` contains user-facing pages.
- `backend/gateway/app.js` is the only public API entrypoint.
- Python workers import shared behavior from `backend/services/shared/python/`.
- Node services import shared behavior from `backend/services/shared/node/`.
- `packages/contracts/` should be updated when public API types or paths change.

## Services and Ports

| Service | Default Port | Environment Variable |
| --- | ---: | --- |
| Frontend | 5173 | `VITE_API_BASE_URL` |
| Gateway | 3000 | `GATEWAY_PORT` |
| User Service | 3001 | `USER_SERVICE_PORT` |
| News Service | 3002 | `NEWS_SERVICE_PORT` |
| Search Service | 3005 | `SEARCH_SERVICE_PORT` |
| MongoDB | 27017 | `MONGODB_URI` |
| RabbitMQ | 5672 | `RABBITMQ_URL` |
| Redis | 6379 | `REDIS_URL` |

In production, expose only the frontend and Gateway. Keep internal services on `127.0.0.1` or a private network.

## Configuration

The only maintained backend environment template is [backend/.env.example](backend/.env.example). Copy it to `backend/.env` and replace placeholder values.

Minimum API service configuration:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/coregistnews
MONGODB_DB_NAME=coregistnews
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me
GATEWAY_PORT=3000
USER_SERVICE_PORT=3001
NEWS_SERVICE_PORT=3002
SEARCH_SERVICE_PORT=3005
USER_SERVICE_URL=http://127.0.0.1:3001
NEWS_SERVICE_URL=http://127.0.0.1:3002
SEARCH_SERVICE_URL=http://127.0.0.1:3005
```

Minimum full news pipeline configuration:

```env
RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5672/
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://your-provider.example/v1
LLM_API_KEY=your-key
LLM_MODEL=your-model
LLM_JSON_MODE=false
AI_CONTENT_MODEL=openai-compatible
AI_REVIEW_MODEL=openai-compatible
AI_CONTENT_JSON_MODE=false
AI_REVIEW_JSON_MODE=false
```

Recommended RSS and queue pressure controls:

```env
RSS_SOURCE_BATCH_SIZE=8
RSS_MAX_ITEMS_PER_FEED=2
RSS_BROWSER_TIMEOUT_MS=8000
RSS_HTTP_LIMITED_BACKOFF_SECONDS=21600
RSS_HTTP_LIMITED_QUARANTINE_THRESHOLD=2
RSS_HTTP_LIMITED_QUARANTINE_SECONDS=86400
NEWS_RAW_QUEUE_MAX_MESSAGES=5000
AI_TASKS_QUEUE_MAX_MESSAGES=1000
RSS_SKIP_WHEN_BACKLOGGED=true
```

Security requirements:

- Use strong random values for `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- Keep `ALLOW_UNVERIFIED_FIREBASE_TOKENS=false` in production.
- Do not commit real `.env` files, API keys, database credentials, JWT secrets, or third-party tokens.
- Rotate any secret that appears in chat logs, shell history, application logs, or Git history.

## News Pipeline

```text
news_crawl_trigger_queue
  -> News Scraper
  -> news_raw_queue
  -> Content Processing
  -> ai_tasks_queue
  -> AI Dispatcher
  -> AI Analysis
  -> MongoDB news
```

| Queue | Purpose |
| --- | --- |
| `news_crawl_trigger_queue` | Crawl trigger tasks |
| `news_raw_queue` | Raw news payloads |
| `ai_tasks_queue` | AI analysis tasks |
| `news_notifications_queue` | Notification tasks |

Trigger a small RSS crawl manually:

```bash
cd backend

python3 - <<'PY'
from services.shared.python.queue import QueueClient, QUEUE_NEWS_CRAWL_TRIGGER
from services.shared.python.settings import settings

QueueClient().publish(QUEUE_NEWS_CRAWL_TRIGGER, {
    "mode": "rss",
    "publish_raw": True,
    "limit_per_feed": min(settings.rss_max_items_per_feed, 2),
    "source_limit": settings.rss_source_batch_size,
    "rotate_sources": True,
})
print("published")
PY
```

Default display behavior:

- News is sorted by `postedAt`, newest first.
- Default home feeds focus on recent news.
- Search can cover a wider historical range.
- Sources with repeated article-page `403` or `429` errors enter backoff or quarantine to avoid crawler spin and memory pressure.

## API and Authentication

```text
Frontend login/register
  -> /api/auth/*
  -> User Service
  -> JWT access token / refresh token
  -> Gateway verifies Bearer token
  -> Protected APIs
```

| Path | Auth Required | Purpose |
| --- | --- | --- |
| `/api/health` | No | Gateway and service health |
| `/api/auth/*` | No | Login, register, refresh token |
| `/api/user/*` | Yes | User settings and profile |
| `/api/users/*` | Yes | User compatibility APIs |
| `/api/tracking/*` | Yes | Tracking topics and pushes |
| `/api/news/*` | Yes | News list, detail, and categories |
| `/api/search/*` | Yes | Search APIs |
| `/api/ai-search/*` | Yes | AI search APIs |

Unauthorized requests return:

```json
{"error":"Unauthorized"}
```

## Deployment

PM2 deployment flow:

```bash
cd /root/coregist-news
git fetch origin
git pull --ff-only origin main

cd backend
npm install --omit=dev

pm2 restart coregist-gateway --update-env
pm2 restart coregist-user --update-env
pm2 restart coregist-news-service --update-env
pm2 restart coregist-search-service --update-env
pm2 restart coregist-scheduler --update-env
pm2 restart coregist-news-rss-worker --update-env
pm2 restart coregist-news-keyword-worker --update-env
pm2 restart coregist-content-processing --update-env
pm2 restart coregist-ai-dispatcher --update-env
pm2 restart coregist-ai-analysis --update-env
pm2 restart coregist-notification --update-env
pm2 save
```

Reverse proxy recommendation:

```text
/api/* -> http://127.0.0.1:3000/api/*
/*     -> frontend/dist SPA fallback
```

Post-deployment checks:

```bash
curl https://coregist-news.com/api/health
curl -i 'https://coregist-news.com/api/news?page=1&limit=1'
curl -i 'https://coregist-news.com/api/search/public-health'
```

A `401` response from news APIs without login is expected. After login, verify that browser requests include the Bearer token and that the Gateway forwards requests correctly.

## Operations

Common diagnostics:

```bash
pm2 list
pm2 logs coregist-gateway --lines 80 --nostream
pm2 logs coregist-news-rss-worker --lines 120 --nostream
pm2 logs coregist-content-processing --lines 120 --nostream
pm2 logs coregist-ai-analysis --lines 120 --nostream
rabbitmqctl list_queues name messages messages_ready messages_unacknowledged
```

If news is not updating:

1. Confirm Gateway, News Service, RSS worker, Content Processing, and AI Analysis are online.
2. Check RabbitMQ queues for backlog.
3. Check scraper logs for repeated `403`, `429`, or timeout errors.
4. Check AI logs for LLM `401`, `402`, `429`, or timeout errors.
5. Verify that MongoDB has recent `raw_news` and `news` records.
6. Confirm logged-in browser requests to `/api/news` return `200`.

Check the latest stored news:

```bash
cd backend

python3 - <<'PY'
import os
from pymongo import MongoClient

client = MongoClient(os.environ["MONGODB_URI"])
db = client[os.environ.get("MONGODB_DB_NAME", "coregistnews")]
row = db.news.find_one(
    {},
    {"_id": 0, "title_zh": 1, "summary_zh": 1, "postedAt": 1, "processed_at": 1, "source_en": 1},
    sort=[("postedAt", -1)],
)
print(row)
client.close()
PY
```

## Disclaimer and Compliance

### General Compliance

- All code, tools, and features in this project are provided for learning, academic research, education, and other uses permitted by the GNU GPLv3.
- Using this project for illegal, non-compliant, abusive, harmful, or rights-infringing activity is prohibited.

### Crawler Disclaimer

- The crawler features are provided only for technical learning and research.
- Users must comply with target websites' `robots.txt`, terms of service, access policies, and applicable laws.
- Users must not perform malicious crawling, excessive scraping, bypassing of access controls, or data abuse.
- Any legal consequence caused by crawler use is the sole responsibility of the user.

### Data Use Disclaimer

- Data analysis features are provided for research, learning, and educational demonstration.
- Analysis results are not professional, legal, financial, medical, investment, or compliance advice.
- Users must ensure that all collected, processed, and analyzed data is lawful and compliant.

### Technical Disclaimer

- This project is provided "as is", without any express or implied warranty.
- The author does not guarantee correctness, reliability, availability, security, fitness for a particular purpose, or non-infringement.
- The author is not liable for direct, indirect, incidental, consequential, or other losses caused by use of this project.

### Limitation of Responsibility

- Users must understand applicable laws and regulations before using this project.
- Users are responsible for ensuring that their use complies with local laws, regulations, website terms, and third-party rights.
- Any consequence arising from illegal or non-compliant use is the sole responsibility of the user.
- By using this project, you confirm that you have read, understood, agreed to, and accepted all terms in this disclaimer.

## License

This project is licensed under the **GNU General Public License v3.0**.

- SPDX-License-Identifier: `GPL-3.0-only`
- You may use, copy, modify, and distribute the software under the GPLv3 terms.
- If you distribute modified versions or derivative works, you must comply with GPLv3 source code and license obligations.

See [LICENSE](LICENSE) for the full license text.
