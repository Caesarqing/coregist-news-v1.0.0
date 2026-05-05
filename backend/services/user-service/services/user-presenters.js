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
    pushSettingsList: normalizeStoredPushSettingsList(user.pushSettingsList),
    language: user.language,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function buildUserSettingsResponse(user) {
  return {
    pushSettingsList: normalizeStoredPushSettingsList(user.pushSettingsList),
    language: user.language || 'zh-CN',
  };
}

function normalizePushSettingsEntry(pushSettingsEntry, sanitizeStringArray) {
  const parsedPushCount = Number(pushSettingsEntry.pushCount);
  return {
    pushDays: sanitizeStringArray(pushSettingsEntry.pushDays, 7),
    pushTimes: sanitizeStringArray(pushSettingsEntry.pushTimes, 8),
    pushCount: Number.isFinite(parsedPushCount) ? Math.max(1, Math.min(20, parsedPushCount)) : 5,
    everyday: typeof pushSettingsEntry.everyday === 'boolean' ? pushSettingsEntry.everyday : false,
    keywords: sanitizeStringArray(pushSettingsEntry.keywords, 50),
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

function normalizeStoredPushSettingsList(pushSettingsList) {
  const list = Array.isArray(pushSettingsList) ? pushSettingsList : [];
  return list
    .map(serializePushSettingsEntry)
    .filter((entry) => entry.keywords.length > 0);
}

function normalizePushSettingsList(pushSettingsList, sanitizeStringArray) {
  if (!Array.isArray(pushSettingsList)) return [];
  return pushSettingsList
    .map((entry) => {
      const normalized = normalizePushSettingsEntry(entry || {}, sanitizeStringArray);
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
  buildEmptyTrackingAnalytics,
  buildUserProfileResponse,
  buildUserSettingsResponse,
  normalizePushSettingsEntry,
  normalizePushSettingsList,
  normalizeStoredPushSettingsList,
};
