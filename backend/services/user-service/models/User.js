const mongoose = require('mongoose');

const pushSettingsSchema = new mongoose.Schema({
  pushDays: { type: [String], default: ['monday', 'wednesday', 'friday'] },
  pushTimes: { type: [String], default: ['08:00', '18:00'] },
  pushCount: { type: Number, default: 5, min: 1, max: 20 },
  everyday: { type: Boolean, default: false },
  keywords: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { _id: true });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, default: '' },
  bio: { type: String, default: '' },
  phone: { type: String, default: '' },
  birthday: { type: String, default: '' },
  passwordHash: { type: String, required: false },
  googleId: { type: String, unique: true, sparse: true },
  avatar_url: { type: String, default: '' },
  pushSettings: {
    pushDays: { type: [String], default: ['monday', 'wednesday', 'friday'] },
    pushTimes: { type: [String], default: ['08:00', '18:00'] },
    pushCount: { type: Number, default: 5, min: 1, max: 20 },
    everyday: { type: Boolean, default: false },
    keywords: { type: [String], default: [] },
  },
  pushSettingsList: { type: [pushSettingsSchema], default: [] },
  language: { type: String, default: 'zh-CN', enum: ['zh-CN', 'en'] },
  isAdmin: { type: Boolean, default: false },
  is_superuser: { type: Boolean, default: false },
  resetPasswordCodeHash: { type: String, default: null },
  resetPasswordCodeExpiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (typeof next === 'function') next();
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
