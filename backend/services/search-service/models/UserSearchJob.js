const mongoose = require('mongoose');

const userSearchJobSchema = new mongoose.Schema({
  job_id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  mode: { type: String, enum: ['news', 'ai'], default: 'ai' },
  query: { type: String, required: true, trim: true },
  keywords: { type: [String], default: [] },
  filters: {
    category: { type: [String], default: [] },
    source: { type: [String], default: [] },
    time_range: { type: String, default: '' },
  },
  allow_discovery: { type: Boolean, default: true },
  source_type: { type: String, default: 'search_query' },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued',
    index: true,
  },
  error: { type: String, default: '' },
  triggered_at: { type: Date, default: Date.now },
  started_at: { type: Date },
  finished_at: { type: Date },
}, { timestamps: true, collection: 'user_search_jobs' });

userSearchJobSchema.index({ userId: 1, createdAt: -1 });
userSearchJobSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.UserSearchJob || mongoose.model('UserSearchJob', userSearchJobSchema);
