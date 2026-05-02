const mongoose = require('mongoose');

const rawNewsSchema = new mongoose.Schema({
  news_id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  canonical_link: { type: String },
  title_hash: { type: String },
  
  // Content storage
  raw_html: { type: String },
  processed_content: { type: String },
  
  snippet: { type: String },
  image_link: { type: String },
  image_confidence: { type: String },
  image_source_type: { type: String },
  image_fallback_type: { type: String },
  source_logo_url: { type: String },
  
  // Source metadata
  source_id: { type: String },
  publisher_id: { type: String },
  source_name_en: { type: String },
  source_name_zh: { type: String },
  
  // Classification
  language: { type: String, default: 'en' },
  region: { type: String },
  categories: { type: [String], default: [] },
  level1_code: { type: String },
  level1_name_zh: { type: String },
  level1_name_en: { type: String },
  level2_codes: { type: [String], default: [] },
  level2_names_zh: { type: [String], default: [] },
  level2_names_en: { type: [String], default: [] },
  topic_tags: { type: [String], default: [] },
  entity_tags: { type: [String], default: [] },
  tags_zh: { type: [String], default: [] },
  tags_en: { type: [String], default: [] },
  classification_status: {
    type: String,
    enum: ['confirmed', 'needs_review', 'failed'],
    default: 'failed'
  },
  classification_method: { type: String },
  classification_confidence: { type: Number, default: 0 },
  classification_evidence: { type: [String], default: [] },
  classification_reasoning: { type: String },
  classification_candidates: { type: [mongoose.Schema.Types.Mixed], default: [] },
  
  // Timestamps
  crawled_at: { type: Date, required: true },
  posted_at: { type: Date },
  
  // Processing status
  processing_status: {
    type: String,
    enum: ['pending', 'ready', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  retry_count: { type: Number, default: 0 },
  last_error: { type: String },
  
  // Audit
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Indexes
rawNewsSchema.index({ news_id: 1 }, { unique: true });
rawNewsSchema.index({ url: 1 }, { unique: true });
rawNewsSchema.index({ canonical_link: 1, title_hash: 1 }, { sparse: true });
rawNewsSchema.index({ processing_status: 1, created_at: -1 });
rawNewsSchema.index({ source_id: 1, posted_at: -1 });

// Validation
rawNewsSchema.path('news_id').validate(function(value) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}, 'news_id must be a valid UUID');

rawNewsSchema.path('url').validate(function(value) {
  const urlRegex = /^https?:\/\/.+/i;
  return urlRegex.test(value);
}, 'url must be a valid HTTP/HTTPS URL');

rawNewsSchema.path('raw_html').validate(function(value) {
  return value || this.processed_content;
}, 'Either raw_html or processed_content must be non-empty');

// Update timestamp on save
rawNewsSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.models.RawNews || mongoose.model('RawNews', rawNewsSchema);
