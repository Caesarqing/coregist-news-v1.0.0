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
    pushSettingsList: normalizeStoredPushSettingsList(user.pushSettingsList, user.pushSettings),
    language: user.language,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function buildUserSettingsResponse(user) {
  return {
    pushSettings: user.pushSettings || { ...DEFAULT_PUSH_SETTINGS },
    pushSettingsList: normalizeStoredPushSettingsList(user.pushSettingsList, user.pushSettings),
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

function serializePushSettingsEntry(entry) {
  const raw = entry && typeof entry.toObject === 'function' ? entry.toObject() : (entry || {});
  return {
    id: raw._id ? raw._id.toString() : (raw.id || ''),
    pushDays: Array.isArray(raw.pushDays) ? raw.pushDays : [],
    pushTimes: Array.isArray(raw.pushTimes) ? raw.pushTimes : [],
    pushCount: Number.isFinite(Number(raw.pushCount)) ? Number(raw.pushCount) : 5,
    everyday: Boolean(raw.everyday),
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : undefined,
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : undefined,
  };
}

function normalizeStoredPushSettingsList(pushSettingsList, legacyPushSettings) {
  const list = Array.isArray(pushSettingsList) ? pushSettingsList : [];
  const serialized = list
    .map(serializePushSettingsEntry)
    .filter((entry) => entry.keywords.length > 0);
  if (serialized.length > 0) {
    return serialized;
  }

  const legacyKeywords = Array.isArray(legacyPushSettings?.keywords) ? legacyPushSettings.keywords : [];
  if (legacyKeywords.length === 0) {
    return [];
  }
  return [{
    id: 'legacy',
    ...legacyPushSettings,
  }];
}

function normalizePushSettingsList(pushSettingsList, sanitizeStringArray) {
  if (!Array.isArray(pushSettingsList)) return [];
  return pushSettingsList
    .map((entry) => {
      const normalized = normalizePushSettings(entry || {}, sanitizeStringArray);
      const id = (entry?.id || entry?._id || '').toString();
      const stableId = /^[a-f\d]{24}$/i.test(id) ? { _id: id } : {};
      return {
        ...stableId,
        ...normalized,
        createdAt: entry?.createdAt ? new Date(entry.createdAt) : new Date(),
        updatedAt: new Date(),
      };
    })
    .filter((entry) => entry.keywords.length > 0)
    .slice(0, 50);
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
  normalizePushSettingsList,
  normalizeStoredPushSettingsList,
};
