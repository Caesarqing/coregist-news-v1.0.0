const Notification = require('../models/Notification');
const UserPushToken = require('../models/UserPushToken');
const { authRequired } = require('../../shared/node/auth');
const mongoose = require('mongoose');

function serializeNotification(doc) {
  const raw = doc && typeof doc.toObject === 'function' ? doc.toObject() : (doc || {});
  return {
    id: raw._id ? raw._id.toString() : '',
    type: raw.type || 'news_push',
    title: raw.title || '',
    summary: raw.summary || raw.content || '',
    content: raw.content || raw.summary || '',
    newsIds: Array.isArray(raw.newsIds) ? raw.newsIds.map((item) => item.toString()) : [],
    pushBatchId: raw.pushBatchId || '',
    readAt: raw.readAt ? new Date(raw.readAt).toISOString() : null,
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : '',
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : '',
  };
}

async function listNotifications(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const unreadOnly = String(req.query.unreadOnly || '').toLowerCase() === 'true';
    const query = { userId: req.userId };
    if (unreadOnly) query.readAt = null;

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: req.userId, readAt: null }),
    ]);

    return res.json({
      items: items.map(serializeNotification),
      total,
      unreadCount,
      page,
      limit,
    });
  } catch (error) {
    console.error('❌ 获取通知失败:', error);
    return res.status(500).json({ error: '获取通知失败', details: error.message });
  }
}

async function unreadCount(req, res) {
  try {
    const count = await Notification.countDocuments({ userId: req.userId, readAt: null });
    return res.json({ count });
  } catch (error) {
    console.error('❌ 获取未读通知数失败:', error);
    return res.status(500).json({ error: '获取未读通知数失败', details: error.message });
  }
}

function serializePushBatch(doc) {
  const matchedNewsIds = Array.isArray(doc.matchedNewsIds)
    ? doc.matchedNewsIds.filter(Boolean).map((item) => item.toString())
    : [];
  return {
    batchId: doc.batchId || '',
    pushSettingId: doc.pushSettingId || '',
    keywords: Array.isArray(doc.keywords) ? doc.keywords : [],
    pushCount: Number(doc.pushCount) || 0,
    matchedCount: matchedNewsIds.length || Number(doc.matchedCount) || 0,
    matchedNewsIds,
    status: doc.status || '',
    scheduledFor: doc.scheduledFor ? new Date(doc.scheduledFor).toISOString() : '',
    notificationId: doc.notificationId ? doc.notificationId.toString() : '',
    notificationQueuedAt: doc.notificationQueuedAt ? new Date(doc.notificationQueuedAt).toISOString() : '',
    searchJobId: doc.searchJobId || '',
    lastError: doc.lastError || '',
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
  };
}

async function listPushBatches(req, res) {
  try {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    const rows = await mongoose.connection.collection('push_batches')
      .find({ userId: req.userId })
      .sort({ scheduledFor: -1, createdAt: -1 })
      .limit(limit)
      .toArray();
    return res.json({ items: rows.map(serializePushBatch), limit });
  } catch (error) {
    console.error('❌ 获取推送批次失败:', error);
    return res.status(500).json({ error: '获取推送批次失败', details: error.message });
  }
}

async function getPushBatch(req, res) {
  try {
    const batchId = (req.params.batchId || '').toString().trim();
    if (!batchId) return res.status(400).json({ error: '批次 ID 不能为空' });

    const row = await mongoose.connection.collection('push_batches').findOne({
      batchId,
      userId: req.userId,
    });
    if (!row) return res.status(404).json({ error: '推送批次不存在' });

    return res.json({ item: serializePushBatch(row) });
  } catch (error) {
    console.error('❌ 获取推送批次详情失败:', error);
    return res.status(500).json({ error: '获取推送批次详情失败', details: error.message });
  }
}

async function markRead(req, res) {
  try {
    const doc = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { readAt: new Date() } },
      { new: true },
    );
    if (!doc) return res.status(404).json({ error: '通知不存在' });
    return res.json({ ok: true, item: serializeNotification(doc) });
  } catch (error) {
    console.error('❌ 标记通知已读失败:', error);
    return res.status(500).json({ error: '标记通知已读失败', details: error.message });
  }
}

async function markAllRead(req, res) {
  try {
    const result = await Notification.updateMany(
      { userId: req.userId, readAt: null },
      { $set: { readAt: new Date() } },
    );
    return res.json({ ok: true, modifiedCount: result.modifiedCount || 0 });
  } catch (error) {
    console.error('❌ 全部标记已读失败:', error);
    return res.status(500).json({ error: '全部标记已读失败', details: error.message });
  }
}

async function registerPushToken(req, res) {
  try {
    const token = (req.body?.token || '').toString().trim();
    if (!token) return res.status(400).json({ error: 'token 不能为空' });
    const platform = (req.body?.platform || 'web').toString().trim() || 'web';
    await UserPushToken.updateOne(
      { token },
      {
        $set: {
          userId: req.userId,
          platform,
          enabled: true,
          lastSeenAt: new Date(),
          lastError: '',
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ 保存推送 token 失败:', error);
    return res.status(500).json({ error: '保存推送 token 失败', details: error.message });
  }
}

module.exports = {
  authRequired,
  getPushBatch,
  listPushBatches,
  listNotifications,
  markAllRead,
  markRead,
  registerPushToken,
  unreadCount,
};
