// scripts/checkMongoDB.js
/**
 * 检查 MongoDB 连接状态的脚本
 * 
 * 使用方法：
 * 1. 在 backend 目录下运行：node scripts/checkMongoDB.js
 * 2. 脚本会尝试不同的连接方式，告诉你哪个可用
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// 常见的 MongoDB 连接字符串
const possibleUris = [
  process.env.MONGODB_URI,  // 从 .env 文件读取
  'mongodb://localhost:27017/',
  'mongodb://127.0.0.1:27017/',
  'mongodb://localhost:27017/coregistnews',
  'mongodb://127.0.0.1:27017/coregistnews',
];

async function checkConnection(uri) {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000, // 3秒超时
    });
    
    // 测试连接
    await mongoose.connection.db.admin().ping();
    
    console.log(`✅ 连接成功！`);
    console.log(`   连接字符串: ${uri}`);
    console.log(`   数据库名: ${mongoose.connection.db.databaseName}`);
    
    // 列出所有数据库
    const adminDb = mongoose.connection.db.admin();
    const databases = await adminDb.listDatabases();
    console.log(`\n📊 可用的数据库:`);
    databases.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    await mongoose.connection.close();
    return true;
  } catch (error) {
    return false;
  }
}

async function checkMongoDB() {
  console.log('🔍 正在检查 MongoDB 连接...\n');
  
  // 检查 .env 文件中的配置
  if (process.env.MONGODB_URI) {
    console.log(`📝 从 .env 文件读取到: ${process.env.MONGODB_URI}`);
  } else {
    console.log('⚠️  未找到 .env 文件或 MONGODB_URI 未配置');
  }
  console.log('');
  
  // 尝试每个连接字符串
  let found = false;
  for (const uri of possibleUris) {
    if (!uri) continue;
    
    console.log(`尝试连接: ${uri}`);
    const success = await checkConnection(uri);
    
    if (success) {
      found = true;
      console.log(`\n✅ 找到可用的连接！请将以下内容添加到 .env 文件：`);
      console.log(`MONGODB_URI=${uri}`);
      break;
    } else {
      console.log(`   ❌ 连接失败\n`);
    }
  }
  
  if (!found) {
    console.log('\n❌ 所有连接尝试都失败了！\n');
    console.log('可能的原因：');
    console.log('1. MongoDB 服务未启动');
    console.log('2. MongoDB 运行在不同的端口');
    console.log('3. 需要用户名和密码');
    console.log('4. 防火墙阻止了连接');
    console.log('\n💡 解决方案：');
    console.log('1. 检查 MongoDB 是否运行：');
    console.log('   - Windows: 打开"服务"应用，查找 "MongoDB"');
    console.log('   - 或运行: netstat -an | findstr 27017');
    console.log('2. 如果是云数据库（如 MongoDB Atlas），请使用完整的连接字符串');
    console.log('3. 如果使用 Docker，连接字符串可能是: mongodb://localhost:27017/');
  }
}

checkMongoDB().catch(console.error);

