const User = require('../models/User');
const { authRequired } = require('../../shared/node/auth');
const {
  buildUserProfileResponse,
  buildUserSettingsResponse,
  normalizePushSettingsList,
} = require('../services/user-presenters');
const { sanitizeStringArray } = require('../../shared/node/news-helpers');

async function updateProfile(req, res) {
  try {
    const { name, bio, email, username, phone, birthday, avatar, avatar_url: avatarUrl } = req.body || {};
    if (email !== undefined) {
      return res.status(400).json({ error: '邮箱不能修改' });
    }
    if (username !== undefined) {
      return res.status(400).json({ error: '用户名不能修改' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = (name || '').toString().trim();
    if (bio !== undefined) updateData.bio = (bio || '').toString().trim();
    if (phone !== undefined) updateData.phone = (phone || '').toString().trim();
    if (birthday !== undefined) updateData.birthday = (birthday || '').toString().trim();
    if (avatar !== undefined || avatarUrl !== undefined) {
      updateData.avatar_url = (avatarUrl ?? avatar ?? '').toString().trim();
    }

    const user = await User.findByIdAndUpdate(req.userId, updateData, {
      new: true,
      runValidators: true,
    }).select('email username name bio phone birthday avatar_url pushSettingsList language createdAt updatedAt');

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    return res.json(buildUserProfileResponse(user));
  } catch (error) {
    console.error('❌ 更新资料失败:', error);
    return res.status(500).json({ error: '更新用户信息失败' });
  }
}

async function getSettings(req, res) {
  try {
    const user = await User.findById(req.userId).select('pushSettingsList language').lean();
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    return res.json(buildUserSettingsResponse(user));
  } catch (error) {
    console.error('❌ 获取设置失败:', error);
    return res.status(500).json({ error: '获取设置失败' });
  }
}

async function updateSettings(req, res) {
  try {
    const { pushSettingsList, language } = req.body || {};
    const updateData = {};

    if (Array.isArray(pushSettingsList)) {
      const normalizedList = normalizePushSettingsList(pushSettingsList, sanitizeStringArray);
      updateData.pushSettingsList = normalizedList;
    }

    if (language && ['zh-CN', 'en'].includes(language)) {
      updateData.language = language;
    }

    const user = await User.findByIdAndUpdate(req.userId, { $set: updateData }, {
      new: true,
      runValidators: true,
    }).select('pushSettingsList language');

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    return res.json({
      ok: true,
      pushSettingsList: buildUserSettingsResponse(user).pushSettingsList,
      language: user.language,
    });
  } catch (error) {
    console.error('❌ 更新设置失败:', error);
    return res.status(500).json({ error: '更新设置失败', details: error.message });
  }
}

module.exports = {
  authRequired,
  getSettings,
  updateProfile,
  updateSettings,
};
