// scripts/clearOldNews.js
/**
 * 清理旧格式新闻数据的脚本
 * 
 * 使用方法：
 * 1. 确保 MongoDB 连接字符串在 .env 文件中配置好
 * 2. 在 backend 目录下运行：node scripts/clearOldNews.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const News = require('../models/News');

dotenv.config();

async function clearOldNews() {
  try {
    // 连接数据库
    console.log('正在连接 MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 连接成功');

    // 统计旧数据数量（旧格式没有 title_en 或 title_zh 字段）
    const oldCount = await News.countDocuments({
      $or: [
        { title_en: { $exists: false } },
        { title_zh: { $exists: false } }
      ]
    });
    
    console.log(`\n找到 ${oldCount} 条旧格式的新闻数据`);

    if (oldCount === 0) {
      console.log('✅ 没有需要清理的旧数据');
      await mongoose.connection.close();
      return;
    }

    // 询问确认（在实际执行前，你可以先注释掉删除操作，只查看数量）
    console.log('\n⚠️  准备删除所有旧格式数据...');
    
    // 删除旧格式数据
    const result = await News.deleteMany({
      $or: [
        { title_en: { $exists: false } },
        { title_zh: { $exists: false } }
      ]
    });

    console.log(`✅ 成功删除 ${result.deletedCount} 条旧数据`);

    // 关闭连接
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 清理过程中出错:', error);
    process.exit(1);
  }
}

// 执行清理
clearOldNews();

