const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetchImpl }) => fetchImpl(...args));

const DEFAULT_TIMEOUT_MS = Number(process.env.LLM_REQUEST_TIMEOUT_MS) || 60000;

function trimString(value) {
  return (value || '').toString().trim();
}

function normalizeImageUrls(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (typeof item === 'string') return trimString(item);
        if (item && typeof item === 'object') {
          return trimString(item.url || item.image_url?.url || item.imageUrl);
        }
        return '';
      })
      .filter(Boolean);
  }
  return [trimString(input)].filter(Boolean);
}

function normalizePromptPayload(input, options = {}) {
  if (typeof input === 'string') {
    return {
      prompt: trimString(input),
      imageUrls: normalizeImageUrls(options.imageUrls || options.image_urls || options.image_url),
    };
  }

  const payload = input && typeof input === 'object' ? input : {};
  return {
    prompt: trimString(payload.prompt || payload.query || payload.text),
    imageUrls: normalizeImageUrls(
      payload.imageUrls ||
        payload.image_urls ||
        payload.image_url ||
        options.imageUrls ||
        options.image_urls ||
        options.image_url
    ),
  };
}

function buildModelConfig() {
  const aiReviewModel = trimString(process.env.AI_REVIEW_MODEL);
  const aiReviewBaseUrl = trimString(process.env.AI_REVIEW_BASE_URL);
  const aiReviewApiKey = trimString(process.env.AI_REVIEW_API_KEY);
  const aiReviewRemoteModel = trimString(process.env.AI_REVIEW_REMOTE_MODEL);

  if (aiReviewModel === 'dmax') {
    return {
      provider: 'dmax',
      modelName: aiReviewModel,
      remoteModel: aiReviewRemoteModel || 'Qwen3.5-2B-free',
      baseUrl: aiReviewBaseUrl || 'https://www.dmxapi.cn/v1',
      apiKey: trimString(process.env.DMAX_API || aiReviewApiKey),
    };
  }

  if (aiReviewModel === 'openrouter') {
    return {
      provider: 'openrouter',
      modelName: 'openrouter',
      remoteModel: aiReviewRemoteModel || trimString(process.env.OPENROUTER_MODEL),
      baseUrl: aiReviewBaseUrl || 'https://openrouter.ai/api/v1',
      apiKey: aiReviewApiKey || trimString(process.env.OPENROUTER_API_KEY),
    };
  }

  throw new Error('Only dmax and openrouter providers are enabled.');
}

async function fetchWithTimeout(url, config, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...config, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenRouter(payload, config) {
  if (!config.apiKey) {
    throw new Error('AI_REVIEW_API_KEY 或 OPENROUTER_API_KEY 未配置');
  }
  if (!config.remoteModel) {
    throw new Error('AI_REVIEW_REMOTE_MODEL 或 OPENROUTER_MODEL 未配置');
  }

  const messages = [
    {
      role: 'user',
      content:
        payload.imageUrls.length > 0
          ? [
              { type: 'text', text: payload.prompt },
              ...payload.imageUrls.map((url) => ({
                type: 'image_url',
                image_url: { url },
              })),
            ]
          : payload.prompt,
    },
  ];

  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  };

  const referer = trimString(process.env.OPENROUTER_HTTP_REFERER || process.env.HTTP_REFERER);
  const title = trimString(process.env.OPENROUTER_TITLE || process.env.X_OPENROUTER_TITLE);
  if (referer) headers['HTTP-Referer'] = referer;
  if (title) headers['X-OpenRouter-Title'] = title;

  const response = await fetchWithTimeout(
    `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.remoteModel,
        messages,
        temperature: 0.2,
        stream: false,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error('OpenRouter API error:', response.status, errText);
    let detailMessage = `模型调用失败: HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(errText);
      detailMessage =
        parsed?.error?.metadata?.raw
          ? JSON.parse(parsed.error.metadata.raw)?.error?.message || parsed?.error?.message || detailMessage
          : parsed?.error?.message || detailMessage;
    } catch {
      if (errText) detailMessage = `${detailMessage} ${errText}`.trim();
    }
    throw new Error(detailMessage);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callDmax(payload, config) {
  if (!config.apiKey) {
    throw new Error('DMAX_API 未配置');
  }
  if (!config.remoteModel) {
    throw new Error('AI_REVIEW_REMOTE_MODEL 未配置');
  }
  if (payload.imageUrls.length > 0) {
    throw new Error('当前 DMAX 模型链路未配置图片输入支持');
  }

  const response = await fetchWithTimeout(
    `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`,
    {
      method: 'POST',
      // DMAX expects standard Bearer auth; keep backward compatibility if key already contains it.
      headers: (() => {
        const rawKey = trimString(config.apiKey);
        const authValue = rawKey.toLowerCase().startsWith('bearer ') ? rawKey : `Bearer ${rawKey}`;
        return {
          Authorization: authValue,
          'Content-Type': 'application/json',
        };
      })(),
      body: JSON.stringify({
        model: config.remoteModel,
        messages: [
          {
            role: 'user',
            content: payload.prompt,
          },
        ],
        stream: false,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error('DMAX API error:', response.status, errText);
    throw new Error(`DMAX 模型调用失败: HTTP ${response.status}${errText ? ` ${errText}` : ''}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callModel(input, options = {}) {
  const payload = normalizePromptPayload(input, options);
  if (!payload.prompt) {
    throw new Error('prompt 不能为空');
  }

  const config = buildModelConfig();
  if (config.provider === 'dmax') {
    return callDmax(payload, config);
  }
  if (config.provider === 'openrouter') {
    return callOpenRouter(payload, config);
  }
  throw new Error(`Unsupported provider: ${config.provider}`);
}

module.exports = { callModel };
