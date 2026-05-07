function splitKeywords(raw) {
  const text = (raw || '').toString().trim();
  if (!text) return [];
  return text
    .split(/[;；,，]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

function sanitizeStringArray(value, maxItems = 50) {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((item) => (item ?? '').toString().trim())
    .filter(Boolean);
  return Array.from(new Set(normalized)).slice(0, maxItems);
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPreferredLanguage(req, userLanguage = '') {
  const queryLang = (req.query.lang || '').toString();
  if (queryLang === 'zh-CN' || queryLang === 'en') return queryLang;
  const bodyLang = (req.body?.lang || req.body?.language || '').toString();
  if (bodyLang === 'zh-CN' || bodyLang === 'en') return bodyLang;
  if (userLanguage === 'zh-CN' || userLanguage === 'en') return userLanguage;
  const acceptLanguage = (req.headers['accept-language'] || '').toLowerCase();
  return acceptLanguage.includes('zh') ? 'zh-CN' : 'en';
}

const FRESH_NEWS_WINDOW_HOURS = 72;
const FRESH_NEWS_WINDOW_MS = FRESH_NEWS_WINDOW_HOURS * 60 * 60 * 1000;
const RECENT_NEWS_SORT = { postedAt: -1, crawledAt: -1, processed_at: -1, _id: -1 };

function buildFreshNewsFilter(now = new Date()) {
  return {
    postedAt: {
      $gte: new Date(now.getTime() - FRESH_NEWS_WINDOW_MS),
      $lte: now,
    },
  };
}

function mapNewsDoc(doc, language = 'zh-CN') {
  const raw = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  if (!raw) return null;

  const isZh = language === 'zh-CN';
  const title = isZh ? (raw.title_zh || raw.title_en || '') : (raw.title_en || raw.title_zh || '');
  const summary = isZh ? (raw.summary_zh || raw.summary_en || '') : (raw.summary_en || raw.summary_zh || '');
  const classificationStatus = raw.classification_status || 'confirmed';
  const category = classificationStatus === 'confirmed'
    ? (isZh ? (raw.level1_name_zh || raw.level1_name_en || '') : (raw.level1_name_en || raw.level1_name_zh || ''))
    : (isZh ? '待分类' : 'Pending classification');
  const source = isZh ? (raw.source_zh || raw.source_en || '') : (raw.source_en || raw.source_zh || '');
  const keywords = isZh
    ? (raw.tags_zh && raw.tags_zh.length ? raw.tags_zh : raw.topic_tags || raw.entity_tags || raw.tags_en || [])
    : (raw.tags_en && raw.tags_en.length ? raw.tags_en : raw.tags_zh || raw.topic_tags || raw.entity_tags || []);

  return {
    ...raw,
    id: raw._id ? raw._id.toString() : (raw.id || ''),
    title,
    summary,
    fullContent: summary,
    category,
    publishTime: raw.postedAt || raw.crawledAt || null,
    source,
    sourceLink: raw.link || '',
    imageUrl: raw.image_link || '',
    sourceLogoUrl: raw.source_logo_url || '',
    imageFallbackType: raw.image_fallback_type || '',
    classificationStatus,
    classificationConfidence: raw.classification_confidence || 0,
    keywords,
  };
}

function buildTopicNewsQuery({ keywords = [], urls = [] } = {}) {
  const keywordList = sanitizeStringArray(keywords, 50);
  const urlList = sanitizeStringArray(urls, 20);
  const clauses = [];

  if (keywordList.length > 0) {
    const regex = keywordList.map((item) => new RegExp(escapeRegex(item), 'i'));
    clauses.push({
      $or: [
        { tags_zh: { $in: keywordList } },
        { tags_en: { $in: keywordList } },
        { topic_tags: { $in: keywordList } },
        { entity_tags: { $in: keywordList } },
        { title_zh: { $in: regex } },
        { title_en: { $in: regex } },
        { summary_zh: { $in: regex } },
        { summary_en: { $in: regex } },
      ],
    });
  }

  if (urlList.length > 0) {
    clauses.push({ link: { $in: urlList } });
  }

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

function mapTrackingTopic(topic, newsCount = 0) {
  return {
    id: topic._id?.toString() || topic.id || '',
    name: topic.name || '',
    keywords: topic.keywords || [],
    urls: topic.urls || [],
    newsCount,
    createdAt: topic.createdAt
      ? new Date(topic.createdAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  };
}

module.exports = {
  buildTopicNewsQuery,
  buildFreshNewsFilter,
  escapeRegex,
  FRESH_NEWS_WINDOW_HOURS,
  getPreferredLanguage,
  mapNewsDoc,
  mapTrackingTopic,
  RECENT_NEWS_SORT,
  sanitizeStringArray,
  splitKeywords,
};
