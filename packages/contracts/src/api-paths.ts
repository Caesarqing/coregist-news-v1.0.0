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
    analytics: '/tracking/analytics',
  },
  agent: {
    defaults: '/agents/defaults',
    bootstrap: '/agents/bootstrap',
    list: '/agents',
    detail: (id: string) => `/agents/${id}`,
  },
  skill: {
    defaults: '/skills/defaults',
    bootstrap: '/skills/bootstrap',
    list: '/skills',
    detail: (id: string) => `/skills/${id}`,
  },
} as const;
