#!/bin/bash

# CoreGist News - 服务状态检查脚本

echo "🔍 检查服务状态..."
echo ""

# 检查 MongoDB
echo "1️⃣  检查 MongoDB (端口 27017)..."
if lsof -i :27017 > /dev/null 2>&1; then
    echo "   ✅ MongoDB 正在运行"
else
    echo "   ❌ MongoDB 未运行"
    echo "   💡 启动命令: brew services start mongodb-community"
fi
echo ""

# 检查 Gateway
echo "2️⃣  检查 Gateway (端口 3000)..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "   ✅ Gateway 正在运行"
else
    echo "   ❌ Gateway 未运行"
fi
echo ""

# 检查 User Service
echo "3️⃣  检查 User Service (端口 3001)..."
if lsof -i :3001 > /dev/null 2>&1; then
    echo "   ✅ User Service 正在运行"
else
    echo "   ❌ User Service 未运行"
fi
echo ""

# 检查 News Service
echo "4️⃣  检查 News Service (端口 3002)..."
if lsof -i :3002 > /dev/null 2>&1; then
    echo "   ✅ News Service 正在运行"
else
    echo "   ❌ News Service 未运行"
fi
echo ""

# 检查 Search Service
echo "5️⃣  检查 Search Service (端口 3005)..."
if lsof -i :3005 > /dev/null 2>&1; then
    echo "   ✅ Search Service 正在运行"
else
    echo "   ❌ Search Service 未运行"
fi
echo ""

# 健康检查
echo "6️⃣  API 健康检查..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "   ✅ API 健康检查通过"
    echo ""
    echo "📊 详细状态:"
    curl -s http://localhost:3000/api/health | python3 -m json.tool 2>/dev/null || echo "   (无法格式化 JSON)"
else
    echo "   ❌ API 健康检查失败"
fi
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if lsof -i :27017 > /dev/null 2>&1 && \
   lsof -i :3000 > /dev/null 2>&1 && \
   lsof -i :3001 > /dev/null 2>&1 && \
   lsof -i :3002 > /dev/null 2>&1 && \
   lsof -i :3005 > /dev/null 2>&1; then
    echo "✅ 所有服务正常运行"
    echo ""
    echo "🌐 前端地址: http://localhost:5173"
    echo "🚪 Gateway 地址: http://localhost:3000"
else
    echo "⚠️  部分服务未运行"
    echo ""
    echo "📝 启动步骤:"
    echo "   1. 启动 MongoDB: brew services start mongodb-community"
    echo "   2. 启动所有服务: cd backend && ./start-all.sh"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
