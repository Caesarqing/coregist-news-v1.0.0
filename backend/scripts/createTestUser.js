// scripts/createTestUser.js
// 用于快速创建一个测试账号：email + 密码
// 使用方法：
//   1) 确保 .env 里有 MONGODB_URI
//   2) node scripts/createTestUser.js --email test@example.com --password Test@1234 --name "Test User"

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('../models/User');

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--email' || arg === '-e') {
      result.email = args[i + 1];
      i++;
    } else if (arg === '--password' || arg === '-p') {
      result.password = args[i + 1];
      i++;
    } else if (arg === '--name' || arg === '-n') {
      result.name = args[i + 1];
      i++;
    }
  }
  return result;
}

const argv = parseArgs();

async function main() {
  const email = argv.email || process.env.TEST_EMAIL || 'test@example.com';
  const password = argv.password || process.env.TEST_PASSWORD || 'Test@1234';
  const name = argv.name || 'Test User';

  if (!email || !password) {
    console.error('请提供 email 和 password，例如：node scripts/createTestUser.js --email a@b.com --password 123456');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`用户已存在：${email}`);
    await mongoose.connection.close();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, name, passwordHash });

  console.log('✅ 创建成功：');
  console.log(`  email: ${user.email}`);
  console.log(`  name : ${user.name}`);
  console.log(`  密码 : ${password}`);

  await mongoose.connection.close();
}

main().catch((err) => {
  console.error('❌ 创建失败:', err);
  process.exit(1);
});

