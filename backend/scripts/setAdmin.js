/**
 * 设置用户为管理员的脚本
 * 使用方法: node scripts/setAdmin.js <email>
 * 例如: node scripts/setAdmin.js coregistnews@gmail.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../services/user-service/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/coregistnews';

async function setAdmin(email) {
  try {
    // 连接数据库
    console.log('🔌 正在连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 查找用户
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`🔍 正在查找用户: ${normalizedEmail}`);
    
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      console.error(`❌ 未找到邮箱为 ${normalizedEmail} 的用户`);
      process.exit(1);
    }

    console.log(`✅ 找到用户: ${user.username} (${user.email})`);

    // 更新为管理员
    user.isAdmin = true;
    user.is_superuser = true;
    user.updatedAt = new Date();
    
    await user.save();
    
    console.log('✅ 用户已成功设置为管理员');
    console.log(`   邮箱: ${user.email}`);
    console.log(`   用户名: ${user.username}`);
    console.log(`   管理员状态: ${user.isAdmin}`);
    console.log(`   超级管理员状态: ${user.is_superuser}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 设置管理员失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 从命令行参数获取邮箱
const email = process.argv[2];

if (!email) {
  console.error('❌ 请提供邮箱地址');
  console.log('使用方法: node scripts/setAdmin.js <email>');
  console.log('例如: node scripts/setAdmin.js coregistnews@gmail.com');
  process.exit(1);
}

setAdmin(email);

