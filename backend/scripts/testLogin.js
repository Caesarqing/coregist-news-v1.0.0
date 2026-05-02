// testLogin.js
// 测试登录功能的脚本

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcrypt');

async function testLogin() {
  try {
    console.log('🔗 连接 MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    const testEmail = 'test@example.com';
    const testPassword = 'Test@1234';

    console.log(`🔍 查找用户: ${testEmail}`);
    const user = await User.findOne({ email: testEmail });

    if (!user) {
      console.log('❌ 用户不存在！');
      console.log('💡 请先运行: node scripts/createTestUser.js');
      process.exit(1);
    }

    console.log('✅ 找到用户:');
    console.log('   ID:', user._id);
    console.log('   邮箱:', user.email);
    console.log('   姓名:', user.name);
    console.log('   密码哈希:', user.passwordHash.substring(0, 20) + '...');
    console.log('');

    console.log('🔐 测试密码验证...');
    const ok = await bcrypt.compare(testPassword, user.passwordHash);
    
    if (ok) {
      console.log('✅ 密码验证成功！');
      console.log('');
      console.log('📝 测试账号信息:');
      console.log('   邮箱:', testEmail);
      console.log('   密码:', testPassword);
      console.log('');
      console.log('✅ 登录功能正常，可以使用这个账号登录了！');
    } else {
      console.log('❌ 密码验证失败！');
      console.log('💡 可能需要重新创建用户: node scripts/createTestUser.js');
    }

    await mongoose.connection.close();
    process.exit(ok ? 0 : 1);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testLogin();

