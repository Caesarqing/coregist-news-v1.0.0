export const API_PATHS = {
  auth: {
    checkUsername: '/auth/check-username',
    register: '/auth/register',
    login: '/auth/login',
    refresh: '/auth/refresh',
    sendResetCode: '/auth/send-reset-code',
    resetPassword: '/auth/reset-password',
    googleLogin: '/auth/google',
    me: '/auth/me',
    changePassword: '/auth/change-password',
  },
  user: {
    profile: '/user/profile',
    settings: '/user/settings',
  },
  notifications: {
    list: '/notifications',
    unreadCount: '/notifications/unread-count',
    pushBatches: '/notifications/push-batches',
    pushBatch: (batchId: string) => `/notifications/push-batches/${encodeURIComponent(batchId)}`,
    pushToken: '/notifications/push-token',
    read: (id: string) => `/notifications/${id}/read`,
    readAll: '/notifications/read-all',
  },
  news: {
    list: '/news',
    detail: (id: string) => `/news/${id}`,
    state: (id: string) => `/news/${id}/state`,
  },
  search: {
    query: '/search/query',
    job: (jobId: string) => `/search/jobs/${jobId}`,
    retry: (jobId: string) => `/search/jobs/${jobId}/retry`,
  },
  tracking: {
    topics: '/tracking/topics',
    topicDetail: (id: string) => `/tracking/topics/${id}`,
    topicNews: (id: string) => `/tracking/topics/${id}/news`,
    topicRun: (id: string) => `/tracking/topics/${id}/run`,
    topicStatus: (id: string) => `/tracking/topics/${id}/status`,
    analytics: '/tracking/analytics',
  },
} as const;
