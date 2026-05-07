const mongoose = require('mongoose');

const { authRequired } = require('../../shared/node/auth');
const { buildNewsIdentity, buildNewsLookupQuery } = require('../../shared/node/news-identity');
const {
  buildFreshNewsFilter,
  escapeRegex,
  getPreferredLanguage,
  mapNewsDoc,
  RECENT_NEWS_SORT,
  splitKeywords,
} = require('../../shared/node/news-helpers');
const News = require('../models/News');
const User = require('../models/User');
const UserNewsState = require('../models/UserNewsState');
const { getUserIdFromToken } = require('../services/news-service.helpers');

async function listNews(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const category = (req.query.category || '').toString().trim();
    const keywords = splitKeywords(req.query.keywords);
    const level1Code = (req.query.level1_code || '').toString().trim();
    const level2Code = (req.query.level2_code || '').toString().trim();

    const query = buildFreshNewsFilter();
    const andClauses = [];

    if (level1Code) query.level1_code = level1Code;
    if (level2Code) query.level2_codes = level2Code;
    if (category) {
      const categoryRegex = new RegExp(escapeRegex(category), 'i');
      andClauses.push({
        $or: [
          { level1_code: category },
          { level1_name_zh: categoryRegex },
          { level1_name_en: categoryRegex },
        ],
      });
    }
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
        ],
      });
    }
    if (andClauses.length > 0) {
      query.$and = andClauses;
    }

    const userId = getUserIdFromToken(req);
    let userLanguage = '';
    if (userId) {
      const [states, user] = await Promise.all([
        UserNewsState.find({ userId, status: { $in: ['read', 'hidden'] } }).select('newsId').lean(),
        User.findById(userId).select('language').lean(),
      ]);
      const excludeIds = states.map((state) => state.newsId);
      if (excludeIds.length > 0) {
        query._id = { $nin: excludeIds };
      }
      userLanguage = user?.language || '';
    }

    const preferredLanguage = getPreferredLanguage(req, userLanguage);
    const [items, total] = await Promise.all([
      News.find(query).sort(RECENT_NEWS_SORT).skip(skip).limit(limit),
      News.countDocuments(query),
    ]);

    return res.json({
      page,
      limit,
      total,
      items: items.map((item) => mapNewsDoc(item, preferredLanguage)).filter(Boolean),
    });
  } catch (error) {
    console.error('❌ 获取新闻列表失败:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function searchNews(req, res) {
  try {
    const userId = getUserIdFromToken(req);
    let userLanguage = '';
    let userPushSettingsList = [];

    if (userId) {
      const user = await User.findById(userId).select('pushSettingsList language').lean();
      userPushSettingsList = Array.isArray(user?.pushSettingsList) ? user.pushSettingsList : [];
      userLanguage = user?.language || '';
    }

    const rawKeywords = splitKeywords(req.query.keywords);
    const defaultKeywords = userPushSettingsList.flatMap((entry) => entry?.keywords || []);
    const maxPushCount = userPushSettingsList.reduce((max, entry) => {
      const count = Number(entry?.pushCount);
      return Number.isFinite(count) ? Math.max(max, count) : max;
    }, 10);
    const keywords = rawKeywords.length > 0 ? rawKeywords : defaultKeywords;
    let limit = Number(req.query.limit) || maxPushCount;
    if (!Number.isFinite(limit) || limit <= 0) limit = 10;
    if (limit > 50) limit = 50;

    const query = buildFreshNewsFilter();
    if (keywords.length > 0) {
      const regexes = keywords.map((item) => new RegExp(escapeRegex(item), 'i'));
      query.$or = [
        { tags_zh: { $in: keywords } },
        { tags_en: { $in: keywords } },
        { topic_tags: { $in: keywords } },
        { entity_tags: { $in: keywords } },
        { title_zh: { $in: regexes } },
        { title_en: { $in: regexes } },
        { summary_zh: { $in: regexes } },
        { summary_en: { $in: regexes } },
      ];
    }

    if (userId) {
      const states = await UserNewsState.find({ userId, status: { $in: ['read', 'hidden'] } }).select('newsId').lean();
      const excludeIds = states.map((state) => state.newsId);
      if (excludeIds.length) {
        query._id = { $nin: excludeIds };
      }
    }

    const preferredLanguage = getPreferredLanguage(req, userLanguage);
    const items = await News.find(query).sort(RECENT_NEWS_SORT).limit(limit);
    const mappedItems = items.map((item) => mapNewsDoc(item, preferredLanguage)).filter(Boolean);
    return res.json({ items: mappedItems, total: mappedItems.length, limit });
  } catch (error) {
    console.error('❌ 搜索新闻失败:', error);
    return res.status(500).json({ error: '搜索失败' });
  }
}

async function getNewsDetail(req, res) {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid news id' });
    }

    const item = await News.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'News not found' });
    }

    return res.json(mapNewsDoc(item, getPreferredLanguage(req)));
  } catch (error) {
    console.error('❌ 获取新闻详情失败:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateNewsState(req, res) {
  try {
    const status = (req.body?.status || 'read').toString();
    const allowed = ['read', 'hidden', 'bookmarked'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: '非法的状态值' });
    }

    const updated = await UserNewsState.findOneAndUpdate(
      { userId: req.userId, newsId: req.params.id },
      { status },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({ ok: true, data: updated });
  } catch (error) {
    console.error('❌ 更新新闻状态失败:', error);
    return res.status(500).json({ error: '更新状态失败' });
  }
}

async function createNews(req, res) {
  try {
    const body = req.body || {};
    const identity = buildNewsIdentity({
      link: body.link,
      title: body.title_en || body.title_zh || '',
    });
    const lookupQuery = buildNewsLookupQuery({
      link: body.link,
      canonical_link: identity.canonical_link,
      title_hash: identity.title_hash,
      sourceId: body.sourceId,
    });
    if (Object.keys(lookupQuery).length > 0) {
      const existing = await News.findOne(lookupQuery).select('_id').lean();
      if (existing) {
        return res.status(409).json({ error: 'News with this link already exists' });
      }
    }

    const saved = await new News({
      title_en: body.title_en,
      title_zh: body.title_zh,
      summary_en: body.summary_en,
      summary_zh: body.summary_zh,
      score: body.score,
      link: body.link,
      canonical_link: identity.canonical_link,
      title_hash: identity.title_hash,
      image_link: body.image_link,
      image_confidence: body.image_confidence,
      image_source_type: body.image_source_type,
      image_fallback_type: body.image_fallback_type,
      source_logo_url: body.source_logo_url,
      level1_code: body.level1_code,
      level1_name_zh: body.level1_name_zh,
      level1_name_en: body.level1_name_en,
      level2_codes: body.level2_codes || [],
      level2_names_zh: body.level2_names_zh || [],
      level2_names_en: body.level2_names_en || [],
      topic_tags: body.topic_tags || [],
      entity_tags: body.entity_tags || [],
      tags_en: body.tags_en || [],
      tags_zh: body.tags_zh || [],
      classification_status: body.classification_status || 'failed',
      classification_method: body.classification_method || '',
      classification_confidence: body.classification_confidence || 0,
      classification_evidence: body.classification_evidence || [],
      classification_reasoning: body.classification_reasoning || '',
      sourceId: body.sourceId,
      source_en: body.source_en,
      source_zh: body.source_zh,
      postedAt: body.postedAt ? new Date(body.postedAt) : null,
      crawledAt: body.crawledAt ? new Date(body.crawledAt) : new Date(),
      language: body.language || 'en',
      source_language: body.source_language || body.language || 'en',
      display_language: body.display_language || 'zh-CN',
    }).save();

    return res.status(201).json(mapNewsDoc(saved, getPreferredLanguage(req)));
  } catch (error) {
    console.error('❌ 新增新闻失败:', error);
    return res.status(400).json({ error: 'Invalid data', details: error.message });
  }
}

module.exports = {
  authRequired,
  createNews,
  getNewsDetail,
  listNews,
  searchNews,
  updateNewsState,
};
