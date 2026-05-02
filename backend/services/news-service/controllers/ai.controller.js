const { callModel } = require('../../../modelClient');
const News = require('../models/News');
const { buildAiPrompt } = require('../services/news-service.helpers');

async function aiSearch(req, res) {
  try {
    const query = (req.body?.query || '').toString().trim();
    if (!query) {
      return res.status(400).json({ error: '缺少 query 字段' });
    }
    const imageUrls = [
      ...(Array.isArray(req.body?.image_urls) ? req.body.image_urls : []),
      ...(req.body?.image_url ? [req.body.image_url] : []),
    ]
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') return (item.url || item.image_url?.url || '').toString().trim();
        return '';
      })
      .filter(Boolean);

    const newsDocs = await News.find().sort({ postedAt: -1, crawledAt: -1 }).limit(5).lean();
    const prompt = buildAiPrompt(query, newsDocs);
    const answer = await callModel({ prompt, imageUrls });
    return res.json({
      query,
      answer,
      imageUrls,
      usedNews: newsDocs.map((item) => ({
        id: item._id,
        title_zh: item.title_zh,
        title_en: item.title_en,
        link: item.link,
      })),
    });
  } catch (error) {
    console.error('❌ AI 搜索失败:', error);
    return res.status(502).json({ error: 'AI 搜索失败', details: error?.message || '模型调用异常' });
  }
}

module.exports = { aiSearch };
