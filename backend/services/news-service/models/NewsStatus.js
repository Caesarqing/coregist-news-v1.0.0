const mongoose = require('mongoose');

const newsStatusSchema = new mongoose.Schema({
  news_id: { type: String, required: true, unique: true },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'ready', 'processing', 'completed', 'failed'],
    required: true
  },
  stage: {
    type: String,
    enum: ['ingestion', 'cleaning', 'ai_analysis', 'completed', 'failed'],
    required: true
  },
  
  // Retry tracking
  retry_count: { type: Number, default: 0, max: 5 },
  max_retries: { type: Number, default: 3 },
  
  // Error tracking
  last_error: { type: String },
  last_error_at: { type: Date },
  error_code: { type: String },
  
  // Timing
  started_at: { type: Date },
  completed_at: { type: Date },
  
  // Audit
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Indexes
newsStatusSchema.index({ news_id: 1 }, { unique: true });
newsStatusSchema.index({ status: 1, updated_at: -1 });
newsStatusSchema.index({ stage: 1, status: 1 });

// Update timestamp on save
newsStatusSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.models.NewsStatus || mongoose.model('NewsStatus', newsStatusSchema);
