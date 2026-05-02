#!/bin/bash
# 快速修复依赖脚本
# 用于解决用户名验证 500 错误等依赖问题

set -e

echo "🔧 依赖修复工具"
echo "=" | head -c 60 && echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# 检查是否在正确的目录
if [ ! -f "$BACKEND_DIR/package.json" ]; then
    echo "❌ 错误: 未找到 backend/package.json"
    echo "   请确保在项目根目录运行此脚本"
    exit 1
fi

echo "📦 检查并修复后端依赖..."
cd "$BACKEND_DIR"

# 检查关键依赖
MISSING_DEPS=()

if ! npm list naughty-words &> /dev/null; then
    MISSING_DEPS+=("naughty-words")
fi

if ! npm list string-similarity &> /dev/null; then
    MISSING_DEPS+=("string-similarity")
fi

if ! npm list mongoose &> /dev/null; then
    MISSING_DEPS+=("mongoose")
fi

if ! npm list express &> /dev/null; then
    MISSING_DEPS+=("express")
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo "⚠️  发现缺失的依赖: ${MISSING_DEPS[*]}"
    echo "📥 正在安装..."
    npm install "${MISSING_DEPS[@]}"
    echo "✅ 依赖安装完成"
else
    echo "✅ 所有关键依赖已安装"
fi

# 特别检查 naughty-words
echo ""
echo "🔍 验证 naughty-words 库..."
if npm list naughty-words &> /dev/null; then
    VERSION=$(npm list naughty-words --depth=0 | grep naughty-words | sed 's/.*@//' | awk '{print $1}')
    echo "✅ naughty-words 已安装 (版本: $VERSION)"
else
    echo "❌ naughty-words 未安装，正在安装..."
    npm install naughty-words
    echo "✅ naughty-words 安装完成"
fi

# 检查前端依赖
echo ""
echo "📦 检查前端依赖..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules 不存在，正在安装前端依赖..."
    npm install
    echo "✅ 前端依赖安装完成"
else
    echo "✅ 前端 node_modules 存在"
fi

# 总结
echo ""
echo "=" | head -c 60 && echo ""
echo "✅ 依赖检查完成！"
echo ""
echo "💡 下一步:"
echo "   1. 重启后端服务: pm2 restart ai-news-backend"
echo "   2. 查看日志: pm2 logs ai-news-backend"
echo "   3. 测试用户名验证功能"
echo ""

