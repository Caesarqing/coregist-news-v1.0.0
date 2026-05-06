const mongoose = require('mongoose');

const User = require('../models/User');
const TrackingTopic = require('../models/TrackingTopic');
const News = require('../models/News');
const { authRequired } = require('../../shared/node/auth');
const {
  buildTopicNewsQuery,
  getPreferredLanguage,
  mapNewsDoc,
  mapTrackingTopic,
  RECENT_NEWS_SORT,
  sanitizeStringArray,
  splitKeywords,
} = require('../../shared/node/news-helpers');
const { buildEmptyTrackingAnalytics } = require('../services/user-presenters');

async function listTopics(req, res) {
  try {
    const topics = await TrackingTopic.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
    const mapped = await Promise.all(
      topics.map(async (topic) => {
        const query = buildTopicNewsQuery(topic);
        const newsCount = Object.keys(query).length > 0 ? await News.countDocuments(query) : 0;
        return mapTrackingTopic(topic, newsCount);
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

    const topic = await TrackingTopic.create({
      userId: req.userId,
      name,
      keywords,
      urls,
    });

    const query = buildTopicNewsQuery(topic);
    const newsCount = Object.keys(query).length > 0 ? await News.countDocuments(query) : 0;
    return res.status(201).json(mapTrackingTopic(topic, newsCount));
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

    const query = buildTopicNewsQuery(topic);
    if (Object.keys(query).length === 0) {
      return res.json({ topic: mapTrackingTopic(topic, 0), items: [], total: 0 });
    }

    let limit = Number(req.query.limit) || 50;
    if (!Number.isFinite(limit) || limit <= 0) limit = 50;
    if (limit > 100) limit = 100;

    const user = await User.findById(req.userId).select('language').lean();
    const preferredLanguage = getPreferredLanguage(req, user?.language || '');
    const docs = await News.find(query).sort(RECENT_NEWS_SORT).limit(limit);

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
      topic: mapTrackingTopic(topic, items.length),
      items,
      total: items.length,
    });
  } catch (error) {
    console.error('❌ 获取主题新闻失败:', error);
    return res.status(500).json({ error: '获取主题新闻失败' });
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

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 14);
    const docs = await News.find({
      $and: [
        query,
        {
          $or: [
            { postedAt: { $gte: fromDate } },
            { crawledAt: { $gte: fromDate } },
          ],
        },
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
  listTopics,
};
