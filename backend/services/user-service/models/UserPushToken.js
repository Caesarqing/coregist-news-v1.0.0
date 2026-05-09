const mongoose = require('mongoose');

const userPushTokenSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true },
  platform: { type: String, default: 'web' },
  enabled: { type: Boolean, default: true, index: true },
  lastSeenAt: { type: Date, default: Date.now },
  lastError: { type: String, default: '' },
}, { timestamps: true, collection: 'user_push_tokens' });

userPushTokenSchema.index({ userId: 1, enabled: 1 });

module.exports = mongoose.models.UserPushToken || mongoose.model('UserPushToken', userPushTokenSchema);
