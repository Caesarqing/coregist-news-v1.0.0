const mongoose = require('mongoose');

const User = require('../models/User');
const TrackingTopic = require('../models/TrackingTopic');
const News = require('../models/News');
const UserNewsMap = require('../../search-service/models/UserNewsMap');
const UserSearchJob = require('../../search-service/models/UserSearchJob');
const { authRequired } = require('../../shared/node/auth');
const { QUEUE_KEYWORD_SEARCH, publish } = require('../../shared/node/queue');
const {
  buildFreshNewsFilter,
  buildTopicNewsQuery,
  getPreferredLanguage,
  mapNewsDoc,
  mapTrackingTopic,
  RECENT_NEWS_SORT,
  sanitizeStringArray,
  splitKeywords,
} = require('../../shared/node/news-helpers');
const { buildEmptyTrackingAnalytics } = require('../services/user-presenters');

const DEFAULT_TRACKING_FREQUENCY_MINUTES = 30;
const MIN_TRACKING_FREQUENCY_MINUTES = 15;
const DEFAULT_TRACKING_REMAINING_COUNT = 5;
const MAX_TRACKING_REMAINING_COUNT = 10;

function normalizeFrequency(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_TRACKING_FREQUENCY_MINUTES;
  return Math.max(MIN_TRACKING_FREQUENCY_MINUTES, Math.min(Math.floor(parsed), 1440));
}

function trackingQueryText(topic) {
  const keywords = sanitizeStringArray(topic.keywords || [], 50);
  return keywords.join(' ') || topic.name || '';
}

async function countMappedNews(topicId, userId) {
  return UserNewsMap.countDocuments({
    userId: String(userId),
    tracking_topic_id: String(topicId),
    visible: true,
  });
}

async function enqueueTrackingJob(topic, { reason = 'manual' } = {}) {
  const topicId = topic._id?.toString() || topic.id?.toString();
  const userId = topic.userId?.toString();
  const keywords = sanitizeStringArray(topic.keywords || [], 50);
  const query = trackingQueryText(topic);
  if (!topicId || !userId || !query) {
    throw new Error('tracking_topic_missing_query');
  }

  const jobId = `tracking:${userId}:${topicId}:${Date.now()}`;
  const remainingCount = Math.min(MAX_TRACKING_REMAINING_COUNT, DEFAULT_TRACKING_REMAINING_COUNT);
  await UserSearchJob.create({
    job_id: jobId,
    userId,
    mode: 'ai',
    query,
    keywords,
    filters: { category: [], source: [], time_range: '' },
    allow_discovery: true,
    source_type: 'tracking_topic',
    tracking_topic_id: topicId,
    topic_name: topic.name || '',
    remaining_count: remainingCount,
    status: 'queued',
    triggered_at: new Date(),
  });

  await publish(QUEUE_KEYWORD_SEARCH, {
    job_id: jobId,
    user_id: userId,
    mode: 'ai',
    query,
    keywords,
    filters: {},
    source_type: 'tracking_topic',
    tracking_topic_id: topicId,
    topic_name: topic.name || '',
    remaining_count: remainingCount,
    trigger_reason: reason,
  });

  const now = new Date();
  const frequency = normalizeFrequency(topic.frequencyMinutes);
  const nextRunAt = new Date(now.getTime() + frequency * 60 * 1000);
  await TrackingTopic.updateOne(
    { _id: topic._id, userId: topic.userId },
    {
      $set: {
        lastJobId: jobId,
        lastRunAt: now,
        nextRunAt,
        lastError: '',
        lastStatus: 'processing',
      },
    }
  );
  return { jobId, nextRunAt };
}

async function listTopics(req, res) {
  try {
    const topics = await TrackingTopic.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
    const mapped = await Promise.all(
      topics.map(async (topic) => {
        const topicQuery = buildTopicNewsQuery(topic);
        const query = { $and: [buildFreshNewsFilter(), topicQuery] };
        const [newsCount, candidateCount] = await Promise.all([
          countMappedNews(topic._id, req.userId),
          Object.keys(topicQuery).length > 0 ? News.countDocuments(query) : Promise.resolve(0),
        ]);
        return mapTrackingTopic({ ...topic, candidateCount }, newsCount);
      })
    );
    return res.json({ items: mapped, total: mapped.length });
  } catch (error) {
    console.error('❌ 获取追踪主题失败:', error);
    return res.status(500).json({ error: '获取追踪主题失败' });
  }
}

async function createTopic(req, res) {
  try {
    const name = (req.body?.name || '').toString().trim();
    if (!name) {
      return res.status(400).json({ error: '主题名称不能为空' });
    }

    const keywords = Array.isArray(req.body?.keywords)
      ? sanitizeStringArray(req.body.keywords, 50)
      : splitKeywords(req.body?.keywords);
    const urls = sanitizeStringArray(req.body?.urls, 20);
    const frequencyMinutes = normalizeFrequency(req.body?.frequencyMinutes);
    const now = new Date();

    const topic = await TrackingTopic.create({
      userId: req.userId,
      name,
      keywords,
      urls,
      enabled: req.body?.enabled !== false,
      frequencyMinutes,
      nextRunAt: now,
    });

    try {
      await enqueueTrackingJob(topic, { reason: 'created' });
    } catch (enqueueError) {
      await TrackingTopic.updateOne(
        { _id: topic._id, userId: req.userId },
        { $set: { lastError: enqueueError?.message || 'tracking_enqueue_failed', lastStatus: 'failed' } }
      );
    }
    const refreshed = await TrackingTopic.findById(topic._id).lean();
    return res.status(201).json(mapTrackingTopic(refreshed || topic, 0));
  } catch (error) {
    console.error('❌ 新增追踪主题失败:', error);
    return res.status(500).json({ error: '新增追踪主题失败' });
  }
}

async function deleteTopic(req, res) {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid topic id' });
    }

    const result = await TrackingTopic.deleteOne({ _id: id, userId: req.userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: '追踪主题不存在' });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ 删除追踪主题失败:', error);
    return res.status(500).json({ error: '删除追踪主题失败' });
  }
}

async function getTopicNews(req, res) {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid topic id' });
    }

    const topic = await TrackingTopic.findOne({ _id: id, userId: req.userId }).lean();
    if (!topic) {
      return res.status(404).json({ error: '追踪主题不存在' });
    }

    let limit = Number(req.query.limit) || 50;
    if (!Number.isFinite(limit) || limit <= 0) limit = 50;
    if (limit > 100) limit = 100;

    const user = await User.findById(req.userId).select('language').lean();
    const preferredLanguage = getPreferredLanguage(req, user?.language || '');
    const mappedRows = await UserNewsMap.find({
      userId: String(req.userId),
      tracking_topic_id: String(topic._id),
      visible: true,
    }).sort({ updatedAt: -1, createdAt: -1 }).limit(limit).lean();
    const mappedTotal = await countMappedNews(topic._id, req.userId);
    let docs = [];
    let source = 'mapped';
    if (mappedRows.length > 0) {
      docs = await News.find({ _id: { $in: mappedRows.map((row) => row.newsId) } });
      const order = new Map(mappedRows.map((row, index) => [row.newsId.toString(), index]));
      docs.sort((a, b) => (order.get(a._id.toString()) || 0) - (order.get(b._id.toString()) || 0));
    } else {
      const topicQuery = buildTopicNewsQuery(topic);
      const query = { $and: [buildFreshNewsFilter(), topicQuery] };
      source = 'fallback';
      docs = Object.keys(topicQuery).length > 0
        ? await News.find(query).sort(RECENT_NEWS_SORT).limit(limit)
        : [];
    }

    const items = docs
      .map((doc) => mapNewsDoc(doc, preferredLanguage))
      .filter(Boolean)
      .map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        source: item.source,
        publishedAt: item.publishTime,
      }));

    return res.json({
      topic: mapTrackingTopic(topic, mappedTotal),
      items,
      total: items.length,
      source,
    });
  } catch (error) {
    console.error('❌ 获取主题新闻失败:', error);
    return res.status(500).json({ error: '获取主题新闻失败' });
  }
}

async function runTopic(req, res) {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid topic id' });
    }
    const topic = await TrackingTopic.findOne({ _id: id, userId: req.userId });
    if (!topic) {
      return res.status(404).json({ error: '追踪主题不存在' });
    }
    const result = await enqueueTrackingJob(topic, { reason: 'manual' });
    const refreshed = await TrackingTopic.findById(id).lean();
    return res.json({ ok: true, jobId: result.jobId, topic: mapTrackingTopic(refreshed || topic, await countMappedNews(id, req.userId)) });
  } catch (error) {
    console.error('❌ 手动触发追踪失败:', error);
    return res.status(500).json({ error: '手动触发追踪失败', details: error.message });
  }
}

async function getTopicStatus(req, res) {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid topic id' });
    }
    const topic = await TrackingTopic.findOne({ _id: id, userId: req.userId }).lean();
    if (!topic) {
      return res.status(404).json({ error: '追踪主题不存在' });
    }
    const mappedCount = await countMappedNews(id, req.userId);
    const job = topic.lastJobId
      ? await UserSearchJob.findOne({ job_id: topic.lastJobId, userId: String(req.userId) }).lean()
      : null;
    return res.json({
      topic: mapTrackingTopic(topic, mappedCount),
      job: job ? {
        jobId: job.job_id,
        status: job.status,
        error: job.error || '',
        triggeredAt: job.triggered_at,
        updatedAt: job.updatedAt,
      } : null,
    });
  } catch (error) {
    console.error('❌ 获取追踪状态失败:', error);
    return res.status(500).json({ error: '获取追踪状态失败', details: error.message });
  }
}

async function getAnalytics(req, res) {
  try {
    const topics = await TrackingTopic.find({ userId: req.userId }).lean();
    if (!topics.length) {
      return res.json(buildEmptyTrackingAnalytics());
    }

    const allKeywords = Array.from(new Set(topics.flatMap((topic) => topic.keywords || [])));
    const allUrls = Array.from(new Set(topics.flatMap((topic) => topic.urls || [])));
    const query = buildTopicNewsQuery({ keywords: allKeywords, urls: allUrls });
    if (Object.keys(query).length === 0) {
      return res.json(buildEmptyTrackingAnalytics());
    }

    const docs = await News.find({
      $and: [
        query,
        buildFreshNewsFilter(),
      ],
    }).select('title_zh title_en summary_zh summary_en source_zh source_en postedAt crawledAt').lean();

    const dayCount = new Map();
    const sourceCount = new Map();
    const sentiment = { positive: 0, neutral: 0, negative: 0 };
    const positiveKeywords = ['增长', '利好', '突破', 'improve', 'growth', 'surge', 'record'];
    const negativeKeywords = ['下跌', '风险', '裁员', '亏损', 'decline', 'drop', 'layoff', 'loss'];

    for (const doc of docs) {
      const dateObj = doc.postedAt || doc.crawledAt;
      if (dateObj) {
        const key = new Date(dateObj).toISOString().split('T')[0];
        dayCount.set(key, (dayCount.get(key) || 0) + 1);
      }

      const source = doc.source_zh || doc.source_en || 'Unknown';
      sourceCount.set(source, (sourceCount.get(source) || 0) + 1);

      const text = `${doc.title_zh || ''} ${doc.title_en || ''} ${doc.summary_zh || ''} ${doc.summary_en || ''}`.toLowerCase();
      const hasPositive = positiveKeywords.some((item) => text.includes(item.toLowerCase()));
      const hasNegative = negativeKeywords.some((item) => text.includes(item.toLowerCase()));
      if (hasPositive && !hasNegative) {
        sentiment.positive += 1;
      } else if (hasNegative && !hasPositive) {
        sentiment.negative += 1;
      } else {
        sentiment.neutral += 1;
      }
    }

    return res.json({
      trendData: Array.from(dayCount.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-7)
        .map(([date, count]) => ({ date, count })),
      sentiment,
      topSources: Array.from(sourceCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([source, count]) => ({ source, count })),
    });
  } catch (error) {
    console.error('❌ 获取追踪分析失败:', error);
    return res.status(500).json({ error: '获取追踪分析失败' });
  }
}

module.exports = {
  authRequired,
  createTopic,
  deleteTopic,
  getAnalytics,
  getTopicNews,
  getTopicStatus,
  listTopics,
  runTopic,
};
