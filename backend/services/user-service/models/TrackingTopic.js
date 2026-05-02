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
  },
  {
    timestamps: true,
  }
);

trackingTopicSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.TrackingTopic || mongoose.model('TrackingTopic', trackingTopicSchema);
