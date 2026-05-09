const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, default: 'news_push', index: true },
  title: { type: String, default: '' },
  summary: { type: String, default: '' },
  content: { type: String, default: '' },
  newsIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'News' }],
  pushBatchId: { type: String, default: '', index: true },
  readAt: { type: Date, default: null, index: true },
}, { timestamps: true, collection: 'notifications' });

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
