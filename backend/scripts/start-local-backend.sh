#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
LOG_DIR="$RUNTIME_DIR/logs"
PID_DIR="$RUNTIME_DIR/pids"
MONGO_DATA_DIR="${HOME}/mongodb-local/data"
MONGO_LOG_FILE="${HOME}/mongodb-local/logs/mongod.log"
MONGO_PID_FILE="$PID_DIR/mongod.pid"

detect_python_bin() {
  if [ -x "$ROOT_DIR/../.venv/bin/python" ]; then
    echo "$ROOT_DIR/../.venv/bin/python"
    return
  fi

  if command -v python3 >/dev/null 2>&1; then
    command -v python3
    return
  fi

  echo ""
}

detect_mongod_bin() {
  if [ -x "/usr/local/mongodb/bin/mongod" ]; then
    echo "/usr/local/mongodb/bin/mongod"
    return
  fi

  if command -v mongod >/dev/null 2>&1; then
    command -v mongod
    return
  fi

  if command -v brew >/dev/null 2>&1; then
    for formula in mongodb-community mongodb/brew/mongodb-community mongodb-community@8.0 mongodb-community@7.0; do
      local prefix=""
      prefix="$(brew --prefix "$formula" 2>/dev/null || true)"
      if [ -n "$prefix" ] && [ -x "$prefix/bin/mongod" ]; then
        echo "$prefix/bin/mongod"
        return
      fi
    done
  fi

  echo ""
}

PYTHON_BIN="$(detect_python_bin)"
MONGOD_BIN="$(detect_mongod_bin)"

export ALLOW_UNVERIFIED_FIREBASE_TOKENS="${ALLOW_UNVERIFIED_FIREBASE_TOKENS:-true}"

mkdir -p "$LOG_DIR" "$PID_DIR" "$MONGO_DATA_DIR" "$(dirname "$MONGO_LOG_FILE")"

ensure_python_dependencies() {
  if [ -z "$PYTHON_BIN" ]; then
    echo "[python] python3 not found and project .venv is unavailable"
    exit 1
  fi

  if ! (cd "$ROOT_DIR" && "$PYTHON_BIN" - <<'PY' >/dev/null 2>&1
required = ["pymongo", "pika", "apscheduler", "feedparser", "bs4"]
for module in required:
    __import__(module)
PY
  ); then
    echo "[python] installing backend requirements"
    (cd "$ROOT_DIR" && "$PYTHON_BIN" -m pip install -r requirements.txt >/dev/null)
  fi
}

start_mongo() {
  if lsof -nP -iTCP:27017 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[mongo] already listening on 27017"
    return
  fi
  if [ ! -x "$MONGOD_BIN" ]; then
    echo "[mongo] mongod not found. checked /usr/local/mongodb/bin/mongod, PATH, and common Homebrew locations"
    exit 1
  fi
  echo "[mongo] starting local mongod"
  if [ "$(uname -s)" = "Darwin" ]; then
    nohup "$MONGOD_BIN" \
      --dbpath "$MONGO_DATA_DIR" \
      --bind_ip 127.0.0.1 \
      --port 27017 \
      --logpath "$MONGO_LOG_FILE" \
      --logappend \
      </dev/null >"$LOG_DIR/mongod.stdout.log" 2>&1 &
    echo $! > "$MONGO_PID_FILE"
  else
    "$MONGOD_BIN" \
      --dbpath "$MONGO_DATA_DIR" \
      --bind_ip 127.0.0.1 \
      --port 27017 \
      --logpath "$MONGO_LOG_FILE" \
      --logappend \
      --fork \
      >"$LOG_DIR/mongod.stdout.log" 2>&1
  fi
}

wait_for_tcp_port() {
  local host="$1"
  local port="$2"
  local label="$3"
  local max_attempts="${4:-30}"
  local attempt=1

  if [ -z "$PYTHON_BIN" ]; then
    echo "[python] python3 not found and project .venv is unavailable"
    return 1
  fi

  while [ "$attempt" -le "$max_attempts" ]; do
    if "$PYTHON_BIN" - <<PY >/dev/null 2>&1
import socket
sock = socket.socket()
sock.settimeout(1)
try:
    sock.connect(("$host", $port))
    sock.close()
    raise SystemExit(0)
except Exception:
    raise SystemExit(1)
PY
    then
      echo "[$label] ready on $host:$port"
      return 0
    fi

    sleep 1
    attempt=$((attempt + 1))
  done

  echo "[$label] not ready on $host:$port after ${max_attempts}s"
  return 1
}

start_rabbitmq() {
  if [ -z "$PYTHON_BIN" ]; then
    echo "[python] python3 not found and project .venv is unavailable"
    exit 1
  fi

  if "$PYTHON_BIN" - <<'PY' >/dev/null 2>&1
import pika
params = pika.URLParameters("amqp://guest:guest@127.0.0.1:5672/")
conn = pika.BlockingConnection(params)
conn.close()
PY
  then
    echo "[rabbitmq] already reachable at 127.0.0.1:5672"
    return
  fi

  if command -v brew >/dev/null 2>&1; then
    echo "[rabbitmq] starting via brew services"
    brew services start rabbitmq >/dev/null
  else
    echo "[rabbitmq] brew not found and RabbitMQ is not reachable"
    exit 1
  fi
}

start_service() {
  local name="$1"
  local port="$2"
  local match_pattern="$3"
  local cmd="$4"
  local pid_file="$PID_DIR/${name}.pid"
  local log_file="$LOG_DIR/${name}.log"

  if [ -n "$port" ] && lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[$name] already listening on $port"
    return
  fi

  if [ -n "$match_pattern" ] && pgrep -f "$match_pattern" >/dev/null 2>&1; then
    echo "[$name] already running via matching process"
    return
  fi

  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" >/dev/null 2>&1; then
    echo "[$name] already running"
    return
  fi

  echo "[$name] starting"
  nohup bash -lc "cd \"$ROOT_DIR\" && $cmd" </dev/null >"$log_file" 2>&1 &
  echo $! > "$pid_file"

  if [ -n "$port" ] && ! wait_for_tcp_port "127.0.0.1" "$port" "$name" 10; then
    echo "[$name] failed to become ready. Recent log:"
    tail -n 80 "$log_file" || true
    return 1
  fi
}

trigger_initial_public_news_fill() {
  if [ -z "$PYTHON_BIN" ]; then
    return 1
  fi

  echo "[warmup] trigger public RSS crawl"
  (
    cd "$ROOT_DIR" && "$PYTHON_BIN" - <<'PY'
from services.shared.python.queue import QueueClient, QUEUE_NEWS_CRAWL_TRIGGER
from services.shared.python.settings import settings

QueueClient().publish(QUEUE_NEWS_CRAWL_TRIGGER, {
    "mode": "rss",
    "publish_raw": True,
    "limit_per_feed": min(settings.rss_max_items_per_feed, 2),
    "source_limit": 8,
})
print("published")
PY
  ) >/dev/null
}

public_content_health_json() {
  (
    cd "$ROOT_DIR" && "$PYTHON_BIN" - <<'PY'
import json
from pymongo import MongoClient
from services.shared.python.settings import settings

client = MongoClient(settings.mongodb_uri)
db = client[settings.mongodb_db_name]
news = db["news"]
raw = db["raw_news"]
discovery = db["discovery_news"]
last = news.find_one({}, {"processed_at": 1, "crawledAt": 1, "postedAt": 1}, sort=[("processed_at", -1), ("crawledAt", -1), ("postedAt", -1)])
print(json.dumps({
    "news_count": news.count_documents({}),
    "raw_ready_count": raw.count_documents({"processing_status": "ready"}),
    "raw_processing_count": raw.count_documents({"processing_status": {"$in": ["pending", "processing"]}}),
    "discovery_count": discovery.count_documents({}),
    "last_completed_news_at": (last or {}).get("processed_at") or (last or {}).get("crawledAt") or (last or {}).get("postedAt"),
}, default=str))
client.close()
PY
  )
}

wait_for_public_content() {
  if [ -z "$PYTHON_BIN" ]; then
    return 0
  fi

  local max_attempts="${1:-20}"
  local attempt=1
  local snapshot=""

  while [ "$attempt" -le "$max_attempts" ]; do
    snapshot="$(public_content_health_json)"
    if SNAPSHOT="$snapshot" "$PYTHON_BIN" - <<'PY' >/dev/null 2>&1
import json
import os
data = json.loads(os.environ["SNAPSHOT"])
raise SystemExit(0 if data.get("news_count", 0) > 0 else 1)
PY
    then
      echo "[public-news] ready $snapshot"
      return 0
    fi
    sleep 3
    attempt=$((attempt + 1))
  done

  echo "[public-news] warming up $snapshot"
  SNAPSHOT="$snapshot" "$PYTHON_BIN" - <<'PY'
import json
import os
data = json.loads(os.environ["SNAPSHOT"])

if data.get("news_count", 0) > 0:
    print("[public-news] public news already available")
elif data.get("discovery_count", 0) == 0:
    print("[public-news] 新闻中心将为空：RSS discovery 仍未产生内容，请检查 scheduler 或 RSS 抓取。")
elif data.get("raw_ready_count", 0) == 0 and data.get("raw_processing_count", 0) == 0:
    print("[public-news] 新闻中心将为空：discovery 已有内容，但还没有进入 raw/AI 链路。")
else:
    print("[public-news] 新闻中心仍在预热：raw/AI 链路有内容处理中，news 尚未完成入库。")
PY
  return 0
}

if [ ! -d "$ROOT_DIR/node_modules" ] || [ ! -d "$ROOT_DIR/node_modules/amqplib" ]; then
  echo "[npm] installing dependencies"
  (cd "$ROOT_DIR" && npm install >/dev/null)
fi

ensure_python_dependencies
start_mongo
wait_for_tcp_port "127.0.0.1" "27017" "mongo"
start_rabbitmq

start_service "user-service" "3001" "services/user-service/app.js" "node services/user-service/app.js"
start_service "news-service" "3002" "services/news-service/app.js" "node services/news-service/app.js"
start_service "search-service" "3005" "services/search-service/app.js" "node services/search-service/app.js"
start_service "gateway" "3000" "gateway/app.js" "node gateway/app.js"
start_service "scheduler-service" "" "services/scheduler/app.py" "\"$PYTHON_BIN\" services/scheduler/app.py"
start_service "news-rss-worker" "" "services/news_scraper/app.py --worker-mode rss" "\"$PYTHON_BIN\" services/news_scraper/app.py --worker-mode rss"
start_service "news-keyword-worker" "" "services/news_scraper/app.py --worker-mode keyword" "\"$PYTHON_BIN\" services/news_scraper/app.py --worker-mode keyword"
start_service "content-processing-service" "" "services/content_processing/app.py" "\"$PYTHON_BIN\" services/content_processing/app.py"
start_service "ai-dispatcher-service" "" "services/ai_dispatcher/app.py" "\"$PYTHON_BIN\" services/ai_dispatcher/app.py"
start_service "ai-analysis-service" "" "services/ai_analysis/app.py" "\"$PYTHON_BIN\" services/ai_analysis/app.py"
start_service "notification-service" "" "services/notification/app.py" "\"$PYTHON_BIN\" services/notification/app.py"

trigger_initial_public_news_fill
wait_for_public_content 20

echo
echo "Local backend started."
echo "Gateway health: http://127.0.0.1:3000/api/health"
echo "Public content health: http://127.0.0.1:3000/api/search/public-health"
echo "Logs directory: $LOG_DIR"
