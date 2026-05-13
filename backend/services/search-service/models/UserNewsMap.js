const mongoose = require('mongoose');

const userNewsMapSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  newsId: { type: mongoose.Schema.Types.ObjectId, ref: 'News', required: true, index: true },
  search_job_id: { type: String, default: '', index: true },
  query: { type: String, default: '' },
  keywords: { type: [String], default: [] },
  origin: { type: String, enum: ['rss', 'search', 'tracking'], default: 'search' },
  tracking_topic_id: { type: String, default: '', index: true },
  visible: { type: Boolean, default: true },
}, { timestamps: true, collection: 'user_news_maps' });

userNewsMapSchema.index({ userId: 1, newsId: 1 }, { unique: true });
userNewsMapSchema.index({ userId: 1, createdAt: -1 });
userNewsMapSchema.index({ userId: 1, tracking_topic_id: 1, createdAt: -1 });

module.exports = mongoose.models.UserNewsMap || mongoose.model('UserNewsMap', userNewsMapSchema);
