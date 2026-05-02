const { extractBearerToken, verifyBackendAccessToken } = require('../../shared/node/auth');

function getUserIdFromToken(req) {
  const token = extractBearerToken(req);
  return verifyBackendAccessToken(token);
}

function buildAiPrompt(query, newsDocs) {
  const newsText = newsDocs.map((item, index) => (
    `${index + 1}. 标题(中文): ${item.title_zh || ''}\n标题(英文): ${item.title_en || ''}\n摘要(中文): ${item.summary_zh || ''}\n摘要(英文): ${item.summary_en || ''}\n链接: ${item.link || ''}`
  )).join('\n\n') || '（目前新闻库中没有可用内容）';

  return `你是一个中文的 AI 新闻搜索和问答助手。\n\n用户的问题是：\n"${query}"\n\n下面是数据库中最近的几条新闻：\n${newsText}\n\n请你：\n1. 尽量基于以上新闻内容回答用户的问题；\n2. 如果没有相关信息，明确说明“目前新闻库中没有找到相关内容”；\n3. 回答使用简体中文。`;
}

module.exports = {
  buildAiPrompt,
  getUserIdFromToken,
};
