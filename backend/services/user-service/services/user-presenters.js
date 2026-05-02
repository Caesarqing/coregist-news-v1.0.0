const DEFAULT_PUSH_SETTINGS = {
  pushDays: ['monday', 'wednesday', 'friday'],
  pushTimes: ['08:00', '18:00'],
  pushCount: 5,
  everyday: false,
  keywords: [],
};

function buildUserProfileResponse(user) {
  return {
    id: user._id,
    email: user.email,
    username: user.username || '',
    name: user.name || '',
    bio: user.bio || '',
    phone: user.phone || '',
    birthday: user.birthday || '',
    avatar: user.avatar_url || '',
    avatar_url: user.avatar_url || '',
    pushSettings: user.pushSettings,
    language: user.language,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function buildUserSettingsResponse(user) {
  return {
    pushSettings: user.pushSettings || { ...DEFAULT_PUSH_SETTINGS },
    language: user.language || 'zh-CN',
  };
}

function normalizePushSettings(pushSettings, sanitizeStringArray) {
  const parsedPushCount = Number(pushSettings.pushCount);
  return {
    pushDays: sanitizeStringArray(pushSettings.pushDays, 7),
    pushTimes: sanitizeStringArray(pushSettings.pushTimes, 8),
    pushCount: Number.isFinite(parsedPushCount) ? Math.max(1, Math.min(20, parsedPushCount)) : 5,
    everyday: typeof pushSettings.everyday === 'boolean' ? pushSettings.everyday : false,
    keywords: sanitizeStringArray(pushSettings.keywords, 50),
  };
}

function buildEmptyTrackingAnalytics() {
  return {
    trendData: [],
    sentiment: { positive: 0, neutral: 0, negative: 0 },
    topSources: [],
  };
}

module.exports = {
  DEFAULT_PUSH_SETTINGS,
  buildEmptyTrackingAnalytics,
  buildUserProfileResponse,
  buildUserSettingsResponse,
  normalizePushSettings,
};
