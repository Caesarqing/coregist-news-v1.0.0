#!/usr/bin/env node
/**
 * MongoDB 连接测试脚本
 * 用于诊断 MongoDB 连接问题
 * 
 * 使用方法:
 *   node backend/scripts/test-mongodb-connection.js
 * 
 * 或者指定连接字符串:
 *   MONGODB_URI=mongodb://127.0.0.1:27017/coregistnews node backend/scripts/test-mongodb-connection.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔍 MongoDB 连接诊断工具\n');
console.log('='.repeat(60));

// 1. 检查环境变量
console.log('\n1️⃣  检查环境变量...');
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 未设置！');
  console.error('   请检查 backend/.env 文件是否存在');
  console.error('   或使用: MONGODB_URI=mongodb://127.0.0.1:27017/coregistnews node test-mongodb-connection.js');
  process.exit(1);
}
console.log('✅ MONGODB_URI 已设置');
console.log('   连接字符串:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // 隐藏密码

// 解析连接字符串
try {
  const url = new URL(MONGODB_URI.replace('mongodb://', 'http://').replace('mongodb+srv://', 'https://'));
  const host = url.hostname;
  const port = url.port || 27017;
  const dbName = url.pathname.replace('/', '') || 'coregistnews';
  
  console.log('\n2️⃣  解析连接信息...');
  console.log('   Host:', host);
  console.log('   Port:', port);
  console.log('   数据库名:', dbName);
} catch (e) {
  console.error('❌ 连接字符串格式错误:', e.message);
  process.exit(1);
}

// 2. 测试连接
console.log('\n3️⃣  测试 MongoDB 连接...');
const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
};

mongoose.connect(MONGODB_URI, mongoOptions)
  .then(async () => {
    console.log('✅ MongoDB 连接成功！\n');
    
    // 3. 检查数据库和集合
    console.log('4️⃣  检查数据库信息...');
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log('   数据库名:', dbName);
    
    // 列出所有集合
    const collections = await db.listCollections().toArray();
    console.log('   集合数量:', collections.length);
    if (collections.length > 0) {
      console.log('   集合列表:');
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`     - ${col.name}: ${count} 条文档`);
      }
    }
    
    // 4. 测试基本操作
    console.log('\n5️⃣  测试基本操作...');
    try {
      const User = require('../models/User');
      const userCount = await User.countDocuments();
      console.log('   ✅ User 模型查询成功');
      console.log('   用户数量:', userCount);
      
      const News = require('../models/News');
      const newsCount = await News.countDocuments();
      console.log('   ✅ News 模型查询成功');
      console.log('   新闻数量:', newsCount);
    } catch (err) {
      console.error('   ❌ 模型查询失败:', err.message);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有检查通过！MongoDB 连接正常。\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ MongoDB 连接失败！\n');
    console.error('错误信息:', err.message);
    console.error('\n💡 故障排除步骤:');
    console.error('   1. 检查 MongoDB 服务是否运行:');
    console.error('      sudo systemctl status mongod');
    console.error('      或: sudo service mongod status');
    console.error('\n   2. 如果服务未运行，启动 MongoDB:');
    console.error('      sudo systemctl start mongod');
    console.error('      或: sudo service mongod start');
    console.error('\n   3. 检查 MongoDB 是否监听正确端口:');
    console.error('      sudo netstat -tlnp | grep 27017');
    console.error('      或: sudo ss -tlnp | grep 27017');
    console.error('\n   4. 检查防火墙设置:');
    console.error('      sudo ufw status');
    console.error('      如果需要，允许 MongoDB 端口:');
    console.error('      sudo ufw allow 27017/tcp');
    console.error('\n   5. 检查连接字符串是否正确:');
    console.error('      - 本地连接: mongodb://127.0.0.1:27017/coregistnews');
    console.error('      - 带认证: mongodb://username:password@127.0.0.1:27017/coregistnews?authSource=admin');
    console.error('\n   6. 如果使用认证，检查用户名和密码是否正确');
    console.error('\n   7. 检查 MongoDB 日志:');
    console.error('      sudo tail -f /var/log/mongodb/mongod.log');
    console.error('\n' + '='.repeat(60));
    process.exit(1);
  });

