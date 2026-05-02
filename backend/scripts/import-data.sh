#!/bin/bash
# MongoDB 数据导入脚本
# 用于将导出的 JSON 数据导入到 MongoDB
#
# 使用方法:
#   bash backend/scripts/import-data.sh
#
# 或指定文件路径:
#   bash backend/scripts/import-data.sh /path/to/coregistnews.news.json /path/to/coregistnews.users.json

set -e  # 遇到错误立即退出

# 加载环境变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/backend/.env"

if [ -f "$ENV_FILE" ]; then
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
else
    echo "⚠️  警告: 未找到 .env 文件，使用默认连接"
    MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/coregistnews}"
fi

# 默认文件路径
DEFAULT_NEWS_FILE="$PROJECT_ROOT/coregistnews.news.json"
DEFAULT_USERS_FILE="$PROJECT_ROOT/coregistnews.users.json"

# 使用参数或默认路径
NEWS_FILE="${1:-$DEFAULT_NEWS_FILE}"
USERS_FILE="${2:-$DEFAULT_USERS_FILE}"

echo "📦 MongoDB 数据导入工具"
echo "=" | head -c 60 && echo ""

# 检查文件是否存在
if [ ! -f "$NEWS_FILE" ]; then
    echo "❌ 错误: 新闻文件不存在: $NEWS_FILE"
    exit 1
fi

if [ ! -f "$USERS_FILE" ]; then
    echo "❌ 错误: 用户文件不存在: $USERS_FILE"
    exit 1
fi

echo "✅ 找到数据文件:"
echo "   新闻文件: $NEWS_FILE"
echo "   用户文件: $USERS_FILE"
echo ""

# 检查 mongoimport 是否可用
if ! command -v mongoimport &> /dev/null; then
    echo "❌ 错误: 未找到 mongoimport 命令"
    echo "   请安装 MongoDB 数据库工具:"
    echo "   sudo apt-get install mongodb-database-tools"
    exit 1
fi

# 检查连接
echo "🔍 检查 MongoDB 连接..."
if ! mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')" --quiet &> /dev/null; then
    echo "❌ 错误: 无法连接到 MongoDB"
    echo "   连接字符串: ${MONGODB_URI//\/\/.*@/\/\/***:***@}"
    echo "   请检查:"
    echo "   1. MongoDB 服务是否运行: sudo systemctl status mongod"
    echo "   2. 连接字符串是否正确"
    exit 1
fi
echo "✅ MongoDB 连接正常"
echo ""

# 提取数据库名
DB_NAME=$(echo "$MONGODB_URI" | sed -n 's/.*\/\([^?]*\).*/\1/p')
if [ -z "$DB_NAME" ]; then
    DB_NAME="coregistnews"
fi

echo "📊 导入信息:"
echo "   数据库: $DB_NAME"
echo "   集合: news, users"
echo ""

# 询问是否继续
read -p "是否继续导入？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 导入已取消"
    exit 0
fi

# 导入新闻数据
echo ""
echo "📰 导入新闻数据..."
NEWS_COUNT=$(cat "$NEWS_FILE" | jq '. | length' 2>/dev/null || echo "未知")
echo "   预计导入 $NEWS_COUNT 条新闻"

if mongoimport --uri="$MONGODB_URI" \
    --collection=news \
    --file="$NEWS_FILE" \
    --jsonArray \
    --drop; then
    echo "✅ 新闻数据导入成功"
else
    echo "❌ 新闻数据导入失败"
    exit 1
fi

# 导入用户数据
echo ""
echo "👥 导入用户数据..."
USERS_COUNT=$(cat "$USERS_FILE" | jq '. | length' 2>/dev/null || echo "未知")
echo "   预计导入 $USERS_COUNT 个用户"

if mongoimport --uri="$MONGODB_URI" \
    --collection=users \
    --file="$USERS_FILE" \
    --jsonArray \
    --drop; then
    echo "✅ 用户数据导入成功"
else
    echo "❌ 用户数据导入失败"
    exit 1
fi

# 验证导入结果
echo ""
echo "🔍 验证导入结果..."
NEWS_IMPORTED=$(mongosh "$MONGODB_URI" --quiet --eval "db.news.countDocuments()" | tr -d '\r\n')
USERS_IMPORTED=$(mongosh "$MONGODB_URI" --quiet --eval "db.users.countDocuments()" | tr -d '\r\n')

echo ""
echo "=" | head -c 60 && echo ""
echo "✅ 导入完成！"
echo "   新闻数量: $NEWS_IMPORTED"
echo "   用户数量: $USERS_IMPORTED"
echo ""
