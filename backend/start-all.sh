#!/bin/bash

# CoreGist News - 启动所有微服务

echo "🚀 启动所有微服务..."

# 启动 Gateway
echo "📡 启动 Gateway (端口 3000)..."
node gateway/app.js &
GATEWAY_PID=$!

# 等待 Gateway 启动
sleep 2

# 启动 User Service
echo "👤 启动 User Service (端口 3001)..."
node services/user-service/app.js &
USER_SERVICE_PID=$!

# 启动 News Service
echo "📰 启动 News Service (端口 3002)..."
node services/news-service/app.js &
NEWS_SERVICE_PID=$!

# 启动 Search Service
echo "🔍 启动 Search Service (端口 3005)..."
node services/search-service/app.js &
SEARCH_SERVICE_PID=$!

echo ""
echo "✅ 所有服务已启动！"
echo ""
echo "进程 ID:"
echo "  Gateway: $GATEWAY_PID"
echo "  User Service: $USER_SERVICE_PID"
echo "  News Service: $NEWS_SERVICE_PID"
echo "  Search Service: $SEARCH_SERVICE_PID"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待所有进程
wait
