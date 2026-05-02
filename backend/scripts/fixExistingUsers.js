// fixExistingUsers.js
// 为现有用户添加默认的 pushSettings

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function fixExistingUsers() {
  try {
    console.log('🔗 连接 MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功\n');

    // 查找所有没有 pushSettings 或 pushSettings 为空的用户
    const users = await User.find({
      $or: [
        { pushSettings: { $exists: false } },
        { pushSettings: null },
        { 'pushSettings.pushDays': { $exists: false } },
      ],
    });

    console.log(`找到 ${users.length} 个需要修复的用户\n`);

    if (users.length === 0) {
      console.log('✅ 所有用户都已有所需的设置');
      await mongoose.connection.close();
      process.exit(0);
    }

    const defaultSettings = {
      pushDays: ['monday', 'wednesday', 'friday'],
      pushTimes: ['08:00', '18:00'],
      pushCount: 5,
      everyday: false,
      keywords: [],
    };

    let fixed = 0;
    for (const user of users) {
      await User.findByIdAndUpdate(user._id, {
        $set: {
          pushSettings: defaultSettings,
        },
      });
      console.log(`✅ 已修复用户: ${user.email}`);
      fixed++;
    }

    console.log(`\n✅ 成功修复 ${fixed} 个用户`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  }
}

fixExistingUsers();

