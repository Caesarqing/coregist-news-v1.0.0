const { authRequired, optionalAuth } = require('../../shared/node/auth');
const { getPreferredLanguage } = require('../../shared/node/news-helpers');
const {
  UserSearchJob,
  createSearchJob,
  findReusableSearchJob,
  getPublicContentHealth,
  getSearchJobSnapshot,
  normalizeFilters,
  resolveAiQuery,
  searchCompletedNews,
} = require('../services/search.helpers');

function readRequestValue(req, key) {
  if (req.body && req.body[key] !== undefined) return req.body[key];
  if (req.query && req.query[key] !== undefined) return req.query[key];
  return undefined;
}

function parseFilters(req) {
  const directFilters = readRequestValue(req, 'filters');
  if (directFilters && typeof directFilters === 'object' && !Array.isArray(directFilters)) {
    return normalizeFilters(directFilters);
  }

  const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value
        .split(/[;,，；]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  return normalizeFilters({
    category: asArray(readRequestValue(req, 'category')),
    source: asArray(readRequestValue(req, 'source')),
    time_range: readRequestValue(req, 'time_range') || '',
  });
}

function parseSearchRequest(req) {
  return {
    mode: (readRequestValue(req, 'mode') || 'news').toString().trim().toLowerCase() === 'ai' ? 'ai' : 'news',
    page: Math.max(1, Number(readRequestValue(req, 'page')) || 1),
    limit: Math.min(100, Math.max(1, Number(readRequestValue(req, 'limit')) || 20)),
    allowDiscovery: String(readRequestValue(req, 'allow_discovery') || '').toLowerCase() === 'true'
      || Boolean(readRequestValue(req, 'allow_discovery')),
    filters: parseFilters(req),
    query: (readRequestValue(req, 'query') || readRequestValue(req, 'keywords') || '').toString().trim(),
  };
}

async function querySearch(req, res) {
  try {
    const {
      mode,
      page,
      limit,
      allowDiscovery,
      filters,
      query: incomingQuery,
    } = parseSearchRequest(req);
    const preferredLanguage = getPreferredLanguage(req);

    if (mode === 'ai' && !req.userId) {
      return res.status(401).json({ error: 'AI 搜索需要登录后使用' });
    }

    let query = incomingQuery;
    if (mode === 'ai') {
      query = await resolveAiQuery(req.userId, query);
    }

    const result = await searchCompletedNews({
      userId: req.userId,
      mode,
      query,
      filters,
      page,
      limit,
      preferredLanguage,
    });

    let searchJob = { triggered: false };
    if (allowDiscovery && query && result.total < limit) {
      const reusableJob = await findReusableSearchJob({
        userId: req.userId,
        mode,
        query,
        filters,
      });
      if (reusableJob) {
        searchJob = { triggered: true, job_id: reusableJob.job_id, status: reusableJob.status };
      } else {
        const job = await createSearchJob({
          userId: req.userId,
          mode,
          query,
          filters,
          sourceType: 'search_query',
          allowDiscovery: true,
        });
        searchJob = { triggered: true, job_id: job.job_id, status: job.status };
      }
    }

    return res.json({
      query,
      mode,
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      search_job: searchJob,
    });
  } catch (error) {
    console.error('❌ 统一搜索失败:', error);
    return res.status(500).json({ error: '统一搜索失败', details: error.message });
  }
}

async function publicContentHealth(_req, res) {
  try {
    const snapshot = await getPublicContentHealth();
    return res.json(snapshot);
  } catch (error) {
    console.error('❌ 获取公共新闻健康视图失败:', error);
    return res.status(500).json({ error: '获取公共新闻健康视图失败', details: error.message });
  }
}

async function legacyNewsSearch(req, res) {
  req.body = {
    ...(req.body || {}),
    ...(req.query || {}),
    mode: 'news',
    query: readRequestValue(req, 'query') || readRequestValue(req, 'keywords') || '',
    filters: {
      category: req.query?.category,
      source: req.query?.source,
      time_range: req.query?.time_range || '',
    },
  };
  return querySearch(req, res);
}

async function legacyAiSearch(req, res) {
  req.body = {
    ...(req.body || {}),
    ...(req.query || {}),
    mode: 'ai',
    allow_discovery: true,
    query: readRequestValue(req, 'query') || readRequestValue(req, 'keywords') || '',
  };
  return querySearch(req, res);
}

async function getJob(req, res) {
  try {
    const snapshot = await getSearchJobSnapshot(req.userId, req.params.jobId);
    if (!snapshot) {
      return res.status(404).json({ error: '搜索任务不存在' });
    }
    const job = await UserSearchJob.findOne({ job_id: req.params.jobId, userId: req.userId }).select('status');
    if (job && snapshot.status !== job.status) {
      await UserSearchJob.updateOne({ job_id: req.params.jobId, userId: req.userId }, { $set: { status: snapshot.status } });
    }
    return res.json(snapshot);
  } catch (error) {
    console.error('❌ 获取搜索任务失败:', error);
    return res.status(500).json({ error: '获取搜索任务失败', details: error.message });
  }
}

async function retryJob(req, res) {
  try {
    const job = await UserSearchJob.findOne({ job_id: req.params.jobId, userId: req.userId });
    if (!job) {
      return res.status(404).json({ error: '搜索任务不存在' });
    }
    job.status = 'queued';
    job.error = '';
    job.started_at = null;
    job.finished_at = null;
    await job.save();
    const replay = await createSearchJob({
      userId: req.userId,
      mode: job.mode,
      query: job.query,
      filters: job.filters,
      sourceType: `${job.source_type || 'search_query'}:retry`,
      allowDiscovery: true,
    });
    return res.json({ ok: true, job_id: replay.job_id, status: replay.status });
  } catch (error) {
    console.error('❌ 重试搜索任务失败:', error);
    return res.status(500).json({ error: '重试搜索任务失败', details: error.message });
  }
}

module.exports = {
  authRequired,
  optionalAuth,
  getJob,
  legacyAiSearch,
  legacyNewsSearch,
  publicContentHealth,
  querySearch,
  retryJob,
};
