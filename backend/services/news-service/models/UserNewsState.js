const mongoose = require('mongoose');

const userNewsStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  newsId: { type: mongoose.Schema.Types.ObjectId, ref: 'News', required: true },
  status: {
    type: String,
    enum: ['read', 'hidden', 'bookmarked'],
    default: 'read',
  },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

userNewsStateSchema.index({ userId: 1, newsId: 1 }, { unique: true });

module.exports = mongoose.models.UserNewsState || mongoose.model('UserNewsState', userNewsStateSchema);
