const mongoose = require('mongoose');

const trackingTopicSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    keywords: {
      type: [String],
      default: [],
    },
    urls: {
      type: [String],
      default: [],
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    frequencyMinutes: {
      type: Number,
      default: 30,
      min: 15,
      max: 1440,
    },
    lastRunAt: { type: Date, default: null },
    nextRunAt: { type: Date, default: null, index: true },
    lastJobId: { type: String, default: '' },
    lastError: { type: String, default: '' },
    lastStatus: {
      type: String,
      enum: ['waiting', 'processing', 'updated', 'failed', 'backlogged'],
      default: 'waiting',
      index: true,
    },
    matchedCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

trackingTopicSchema.index({ userId: 1, createdAt: -1 });
trackingTopicSchema.index({ enabled: 1, nextRunAt: 1 });

module.exports = mongoose.models.TrackingTopic || mongoose.model('TrackingTopic', trackingTopicSchema);
