const mongoose = require('mongoose');

const userDiscoveryNewsSchema = new mongoose.Schema({
  discovery_id: { type: String, required: true, unique: true, index: true },
  search_job_id: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  query: { type: String, required: true, trim: true },
  keyword: { type: String, default: '' },
  title: { type: String, required: true },
  url: { type: String, required: true },
  canonical_link: { type: String, default: '' },
  title_hash: { type: String, default: '' },
  snippet: { type: String, default: '' },
  source: { type: String, default: '' },
  published_at: { type: Date },
  linked_news_id: { type: mongoose.Schema.Types.ObjectId, ref: 'News', default: null },
  status: {
    type: String,
    enum: ['discovered', 'enrichment_queued', 'enrichment_processing', 'enrichment_failed', 'ready_for_ai', 'ai_processing', 'completed', 'failed'],
    default: 'discovered',
    index: true,
  },
  error: { type: String, default: '' },
}, { timestamps: true, collection: 'user_discovery_news' });

userDiscoveryNewsSchema.index({ userId: 1, query: 1, createdAt: -1 });
userDiscoveryNewsSchema.index({ userId: 1, status: 1, createdAt: -1 });
userDiscoveryNewsSchema.index({ userId: 1, url: 1 }, { unique: false });

module.exports = mongoose.models.UserDiscoveryNews || mongoose.model('UserDiscoveryNews', userDiscoveryNewsSchema);
