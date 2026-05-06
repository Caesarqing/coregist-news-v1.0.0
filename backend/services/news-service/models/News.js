const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title_en: { type: String, required: true },
  title_zh: { type: String, required: true },
  summary_en: { type: String },
  summary_zh: { type: String },
  score: { type: Number },
  link: { type: String, required: true },
  canonical_link: { type: String },
  title_hash: { type: String },
  image_link: { type: String },
  image_confidence: { type: String },
  image_source_type: { type: String },
  image_fallback_type: { type: String },
  source_logo_url: { type: String },
  level1_code: { type: String },
  level1_name_zh: { type: String },
  level1_name_en: { type: String },
  level2_codes: [{ type: String }],
  level2_names_zh: [{ type: String }],
  level2_names_en: [{ type: String }],
  topic_tags: [{ type: String }],
  entity_tags: [{ type: String }],
  tags_en: [{ type: String }],
  tags_zh: [{ type: String }],
  classification_status: {
    type: String,
    enum: ['confirmed', 'needs_review', 'failed'],
    default: 'failed'
  },
  classification_method: { type: String },
  classification_confidence: { type: Number, default: 0 },
  classification_evidence: [{ type: String }],
  classification_reasoning: { type: String },
  classification_candidates: [{ type: mongoose.Schema.Types.Mixed }],
  sourceId: { type: String },
  source_en: { type: String },
  source_zh: { type: String },
  search_text_zh: { type: String },
  search_text_en: { type: String },
  search_sources: [{ type: String }],
  search_categories: [{ type: String }],
  postedAt: { type: Date },
  crawledAt: { type: Date, default: Date.now },
  language: { type: String, default: 'en' },
  source_language: { type: String, default: 'en' },
  display_language: { type: String, default: 'zh-CN' },
  
  // Link to raw data
  raw_news_id: { type: String },
  
  // Processing metadata
  processing_version: { type: String },
  ai_model_used: { type: String },
  processed_at: { type: Date }
});

newsSchema.index({ link: 1 }, { unique: true });
newsSchema.index({ canonical_link: 1 }, { unique: true, sparse: true });
newsSchema.index({ sourceId: 1, title_hash: 1 }, { sparse: true });
newsSchema.index({ postedAt: -1, crawledAt: -1 });
newsSchema.index({ processed_at: -1, crawledAt: -1, postedAt: -1 });
newsSchema.index({ sourceId: 1, postedAt: -1 });
newsSchema.index({ search_sources: 1, postedAt: -1 });
newsSchema.index({ search_categories: 1, postedAt: -1 });
newsSchema.index({ classification_status: 1, postedAt: -1 });
newsSchema.index({ search_text_zh: 1 });
newsSchema.index({ search_text_en: 1 });
newsSchema.index({ raw_news_id: 1 });

module.exports = mongoose.models.News || mongoose.model('News', newsSchema);
