const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const News = require('../../../models/News');
const User = require('../../../models/User');
const { publish, QUEUE_KEYWORD_SEARCH } = require('../../shared/node/queue');
const {
  escapeRegex,
  getPreferredLanguage,
  mapNewsDoc,
  RECENT_NEWS_SORT,
  splitKeywords,
} = require('../../shared/node/news-helpers');
const UserSearchJob = require('../models/UserSearchJob');
const UserDiscoveryNews = require('../models/UserDiscoveryNews');
const UserNewsMap = require('../models/UserNewsMap');

function normalizeFilters(filters = {}) {
  return {
    category: Array.isArray(filters.category) ? filters.category.map((item) => String(item).trim()).filter(Boolean) : [],
    source: Array.isArray(filters.source) ? filters.source.map((item) => String(item).trim()).filter(Boolean) : [],
    time_range: (filters.time_range || '').toString().trim(),
  };
}

function parseTimeRange(timeRange) {
  const now = new Date();
  if (timeRange === '24h') {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  if (timeRange === '7d') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (timeRange === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return null;
}

function buildNewsQuery({ query, filters }) {
  const trimmedQuery = (query || '').toString().trim();
  const keywords = splitKeywords(trimmedQuery);
  const mongoQuery = {};
  const andClauses = [];

  if (keywords.length > 0) {
    const regexes = keywords.map((item) => new RegExp(escapeRegex(item), 'i'));
    andClauses.push({
      $or: [
        { tags_zh: { $in: keywords } },
        { tags_en: { $in: keywords } },
        { topic_tags: { $in: keywords } },
        { entity_tags: { $in: keywords } },
        { title_zh: { $in: regexes } },
        { title_en: { $in: regexes } },
        { summary_zh: { $in: regexes } },
        { summary_en: { $in: regexes } },
        { search_text_zh: { $in: regexes } },
        { search_text_en: { $in: regexes } },
        { search_sources: { $in: regexes } },
        { search_categories: { $in: regexes } },
        { source_zh: { $in: regexes } },
        { source_en: { $in: regexes } },
        { level1_name_zh: { $in: regexes } },
        { level1_name_en: { $in: regexes } },
      ],
    });
  }

  if (filters.category.length > 0) {
    const categoryRegexes = filters.category.map((item) => new RegExp(escapeRegex(item), 'i'));
    andClauses.push({
      $or: [
        { level1_code: { $in: filters.category } },
        { level1_name_zh: { $in: categoryRegexes } },
        { level1_name_en: { $in: categoryRegexes } },
        { search_categories: { $in: categoryRegexes } },
      ],
    });
  }

  if (filters.source.length > 0) {
    const sourceRegexes = filters.source.map((item) => new RegExp(escapeRegex(item), 'i'));
    andClauses.push({
      $or: [
        { source_zh: { $in: sourceRegexes } },
        { source_en: { $in: sourceRegexes } },
        { sourceId: { $in: filters.source } },
        { search_sources: { $in: sourceRegexes } },
      ],
    });
  }

  const fromDate = parseTimeRange(filters.time_range);
  if (fromDate) {
    andClauses.push({
      $or: [
        { postedAt: { $gte: fromDate } },
        { crawledAt: { $gte: fromDate } },
      ],
    });
  }

  if (andClauses.length > 0) {
    mongoQuery.$and = andClauses;
  }

  return mongoQuery;
}

async function resolveAiQuery(userId, query) {
  const trimmedQuery = (query || '').toString().trim();
  if (trimmedQuery) return trimmedQuery;
  if (!userId) return '';
  const user = await User.findById(userId).select('pushSettingsList').lean();
  const listKeywords = Array.isArray(user?.pushSettingsList)
    ? user.pushSettingsList.flatMap((entry) => entry?.keywords || [])
    : [];
  return listKeywords.join(' ');
}

async function searchCompletedNews({ userId, mode, query, filters, page = 1, limit = 20, preferredLanguage = 'zh-CN' }) {
  const normalizedFilters = normalizeFilters(filters);
  const mongoQuery = buildNewsQuery({ query, filters: normalizedFilters });
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  if (mode === 'ai') {
    if (!userId) {
      return { items: [], total: 0, page: safePage, limit: safeLimit };
    }
    const mappings = await UserNewsMap.find({ userId, visible: true }).select('newsId').lean();
    const mappedIds = mappings
      .map((item) => item.newsId)
      .filter((item) => mongoose.Types.ObjectId.isValid(item));
    if (mappedIds.length === 0) {
      return { items: [], total: 0, page: safePage, limit: safeLimit };
    }
    mongoQuery._id = { $in: mappedIds };
  }

  const [items, total] = await Promise.all([
    News.find(mongoQuery).sort(RECENT_NEWS_SORT).skip(skip).limit(safeLimit),
    News.countDocuments(mongoQuery),
  ]);

  return {
    items: items.map((item) => mapNewsDoc(item, preferredLanguage)).filter(Boolean),
    total,
    page: safePage,
    limit: safeLimit,
  };
}

async function findReusableSearchJob({ userId, mode, query, filters }) {
  return UserSearchJob.findOne({
    userId,
    mode,
    query,
    filters: normalizeFilters(filters),
    status: { $in: ['queued', 'processing'] },
  }).sort({ updatedAt: -1 }).lean();
}

async function createSearchJob({ userId, mode, query, filters, sourceType = 'search_query', allowDiscovery = true }) {
  const keywords = splitKeywords(query);
  const job = await UserSearchJob.create({
    job_id: randomUUID(),
    userId,
    mode,
    query,
    keywords,
    filters: normalizeFilters(filters),
    allow_discovery: allowDiscovery,
    source_type: sourceType,
    status: 'queued',
    triggered_at: new Date(),
  });

  try {
    await publish(QUEUE_KEYWORD_SEARCH, {
      job_id: job.job_id,
      user_id: String(userId),
      mode,
      query,
      keywords,
      filters: job.filters,
      source_type: sourceType,
    });
  } catch (error) {
    job.status = 'failed';
    job.error = error?.message || '搜索任务入队失败';
    job.finished_at = new Date();
    await job.save();
    console.error('❌ 搜索任务入队失败:', error);
  }

  return job;
}

async function getSearchJobSnapshot(userId, jobId) {
  const job = await UserSearchJob.findOne({ job_id: jobId, userId }).lean();
  if (!job) return null;
  const [discoveryCounts, linkedCount] = await Promise.all([
    UserDiscoveryNews.aggregate([
      { $match: { search_job_id: jobId, userId: String(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    UserNewsMap.countDocuments({ userId, search_job_id: jobId }),
  ]);

  const counts = discoveryCounts.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const terminalCount = (counts.completed || 0) + (counts.failed || 0) + (counts.enrichment_failed || 0);
  const processingCount = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
  let status = job.status;
  if (status !== 'failed' && processingCount > 0 && terminalCount >= processingCount) {
    status = 'completed';
  } else if (processingCount > 0 && job.status === 'queued') {
    status = 'processing';
  }

  return {
    job_id: job.job_id,
    status,
    query: job.query,
    mode: job.mode,
    counts: {
      discovered: counts.discovered || 0,
      enrichment_queued: counts.enrichment_queued || 0,
      enrichment_processing: counts.enrichment_processing || 0,
      ready_for_ai: counts.ready_for_ai || 0,
      ai_processing: counts.ai_processing || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      enrichment_failed: counts.enrichment_failed || 0,
      linked_news: linkedCount,
    },
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

async function getPublicContentHealth() {
  const [newsCount, rawReadyCount, rawProcessingCount, discoveryCount, lastCompletedNews] = await Promise.all([
    News.countDocuments({}),
    mongoose.connection.collection('raw_news').countDocuments({ processing_status: 'ready' }),
    mongoose.connection.collection('raw_news').countDocuments({ processing_status: { $in: ['pending', 'processing'] } }),
    mongoose.connection.collection('discovery_news').countDocuments({}),
    News.findOne({}).sort({ processed_at: -1, crawledAt: -1, postedAt: -1 }).select('processed_at crawledAt postedAt').lean(),
  ]);

  return {
    news_count: newsCount,
    raw_ready_count: rawReadyCount,
    raw_processing_count: rawProcessingCount,
    discovery_count: discoveryCount,
    last_completed_news_at:
      lastCompletedNews?.processed_at
      || lastCompletedNews?.crawledAt
      || lastCompletedNews?.postedAt
      || null,
  };
}

module.exports = {
  UserDiscoveryNews,
  UserNewsMap,
  UserSearchJob,
  createSearchJob,
  findReusableSearchJob,
  getPublicContentHealth,
  getSearchJobSnapshot,
  normalizeFilters,
  resolveAiQuery,
  searchCompletedNews,
};
