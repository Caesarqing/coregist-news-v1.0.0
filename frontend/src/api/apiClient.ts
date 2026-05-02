import type {
  AuthResult,
  AuthenticatedUserProfile,
  SearchJobSnapshot,
  ChangePasswordRequest,
  CheckUsernameResult,
  LoginRequest,
  NewsItem,
  TrackingAnalyticsData,
  TrackingNewsItem,
  TrackingTopic,
  UnifiedSearchFilters,
  UnifiedSearchResponse,
  UserSettingsResponse,
  UpdateProfileRequest,
  UpdateUserSettingsResponse,
  PushSettings,
} from '@coregist/contracts';
import { API_PATHS } from '@coregist/contracts';

// API基础配置
// 优先使用环境变量，否则根据当前域名自动判断
// @ts-ignore
export const getApiBaseUrl = () => {
  // 1. 优先使用环境变量 (最高优先级)
  if ((import.meta as any).env?.VITE_API_BASE_URL) {
    return (import.meta as any).env.VITE_API_BASE_URL;
  }

  // 2. 本地开发统一走 Vite 代理，避免 5173 -> 3000 跨域导致页面空白
  if ((import.meta as any).env?.DEV) {
    return '/api';
  }

  // 3. 浏览器环境判断
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol; // 获取 http: 或 https:

    // 情况 A: 如果是本地开发 (localhost)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//localhost:3000/api`;
    }

    // 情况 B: 关键修改！如果是通过公网 IP 访问 (比如 66.9.x.x)
    // 正则判断 hostname 是否为 IP 地址
    const isIpAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);
    if (isIpAddress) {
      // 自动把请求指向同 IP 的网关 3000 端口
      return `${protocol}//${hostname}:3000/api`; 
    }
  }

  // 4. 生产环境域名访问 (使用 Nginx 代理时的相对路径)
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

// 请求拦截器
class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  setRefreshToken(refreshToken: string | null) {
    this.refreshToken = refreshToken;
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    } else {
      localStorage.removeItem('refresh_token');
    }
  }

  clearAuth() {
    this.setToken(null);
    this.setRefreshToken(null);
  }

  private async tryRefreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        });
        if (!response.ok) {
          this.clearAuth();
          return false;
        }

        const data = await response.json().catch(() => ({}));
        const newAccessToken = data.token || data.access_token;
        const newRefreshToken = data.refresh_token || null;
        if (!newAccessToken) {
          this.clearAuth();
          return false;
        }

        this.setToken(newAccessToken);
        if (newRefreshToken) {
          this.setRefreshToken(newRefreshToken);
        }
        return true;
      } catch {
        this.clearAuth();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    allowRetry: boolean = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // 添加认证头
    if (this.token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${this.token}`,
      };
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 401 && allowRetry && endpoint !== '/auth/refresh') {
        const refreshed = await this.tryRefreshAccessToken();
        if (refreshed) {
          return this.request<T>(endpoint, options, false);
        }
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // 优先使用 error 字段，然后是 detail 字段
        const errorMessage = errorData.error || errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error(`API请求失败 ${endpoint}:`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async uploadFile<T>(endpoint: string, file: File): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const formData = new FormData();
    formData.append('file', file);

    const config: RequestInit = {
      method: 'POST',
      body: formData,
    };

    // 不设置 Content-Type，让浏览器自动设置为 multipart/form-data
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    config.headers = headers;

    try {
      const response = await fetch(url, config);

      if (response.status === 401 && endpoint !== '/auth/refresh') {
        const refreshed = await this.tryRefreshAccessToken();
        if (refreshed) {
          return this.uploadFile<T>(endpoint, file);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error(`文件上传失败 ${endpoint}:`, error);
      throw error;
    }
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient(API_BASE_URL);

export interface UserCreate {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export type User = AuthenticatedUserProfile;

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  name?: string;
  fullName?: string;
  phone?: string;
}

export type UserLogin = LoginRequest;

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export type UserPasswordChange = ChangePasswordRequest;
export type {
  AuthResult,
  NewsItem,
  PushSettings,
  SearchJobSnapshot,
  TrackingAnalyticsData,
  TrackingNewsItem,
  TrackingTopic,
  UnifiedSearchResponse,
};

// 用户认证API
function persistAuthTokens(tokenData: Partial<AuthResult>) {
  const accessToken = tokenData.token || tokenData.access_token;
  const refreshToken = tokenData.refresh_token || null;
  if (accessToken) {
    apiClient.setToken(accessToken);
  }
  if (refreshToken) {
    apiClient.setRefreshToken(refreshToken);
  }
}

export const authApi = {
  // 检查用户名是否可用
  async checkUsername(username: string): Promise<CheckUsernameResult> {
    try {
      return await apiClient.get<CheckUsernameResult>(`${API_PATHS.auth.checkUsername}?username=${encodeURIComponent(username)}`);
    } catch (error: any) {
      // 如果是404错误，说明API端点不存在，记录错误但不阻止用户
      if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        console.error('用户名检查API端点不存在，请检查后端服务');
        // 返回可用，让用户继续（实际验证会在注册时进行）
        return { available: true };
      }
      // 其他错误，返回不可用
      const errorMessage = error?.message || '';
      // 如果是错误代码格式（以 USERNAME_ 或 FORBIDDEN_ 开头），直接返回
      // 否则返回默认错误代码
      if (errorMessage.startsWith('USERNAME_') || errorMessage.startsWith('FORBIDDEN_')) {
        return { available: false, reason: errorMessage };
      }
      return { available: false, reason: errorMessage || 'USERNAME_VALIDATION_ERROR' };
    }
  },

  // 用户注册
  async register(userData: UserCreate): Promise<AuthResult> {
    const tokenData = await apiClient.post<AuthResult>(API_PATHS.auth.register, userData);
    persistAuthTokens(tokenData);
    return tokenData;
  },

  // 用户登录
  async login(credentials: UserLogin): Promise<AuthResult> {
    const response = await fetch(`${API_BASE_URL}${API_PATHS.auth.login}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.detail || '登录失败');
    }

    const tokenData = await response.json();
    persistAuthTokens(tokenData);
    return tokenData;
  },

  // 刷新令牌
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    const tokenData = await apiClient.post<AuthResult>(API_PATHS.auth.refresh, { refresh_token: refreshToken });
    persistAuthTokens(tokenData);
    return tokenData;
  },

  // 获取当前用户信息
  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>(API_PATHS.auth.me);
  },

  // 更新用户资料
  async updateProfile(profileData: UpdateProfileRequest): Promise<User> {
    return apiClient.put<User>(API_PATHS.user.profile, profileData);
  },

  async uploadAvatar(file: File): Promise<User> {
    const avatarDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result || '').toString());
      reader.onerror = () => reject(new Error('头像读取失败'));
      reader.readAsDataURL(file);
    });

    return apiClient.put<User>(API_PATHS.user.profile, { avatar: avatarDataUrl });
  },

  // 修改密码
  async changePassword(passwordData: UserPasswordChange): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(API_PATHS.auth.changePassword, passwordData);
  },

  // 发送重置密码验证码（仅邮箱）
  async sendResetCode(email: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(API_PATHS.auth.sendResetCode, { method: 'email', email });
  },

  // 重置密码（通过邮箱验证码）
  async resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(API_PATHS.auth.resetPassword, { 
      method: 'email',
      email,
      code, 
      new_password: newPassword 
    });
  },

  // Google登录
  async loginWithGoogle(googleToken: string): Promise<AuthResult> {
    const response = await fetch(`${API_BASE_URL}${API_PATHS.auth.googleLogin}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: googleToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.detail || 'Google登录失败');
    }

    const tokenData = await response.json();
    persistAuthTokens(tokenData);
    return tokenData;
  },

  // 登出
  logout(): void {
    apiClient.clearAuth();
  },
};

// 用户设置API
export const userSettingsApi = {
  // 获取用户推送设置
  async getSettings(): Promise<UserSettingsResponse> {
    return apiClient.get<UserSettingsResponse>(API_PATHS.user.settings);
  },

  // 更新用户推送设置
  async updateSettings(pushSettings: PushSettings): Promise<UpdateUserSettingsResponse> {
    return apiClient.put<UpdateUserSettingsResponse>(API_PATHS.user.settings, { pushSettings });
  },

  // 更新用户语言设置
  async updateLanguage(language: 'zh-CN' | 'en'): Promise<UpdateUserSettingsResponse> {
    return apiClient.put<UpdateUserSettingsResponse>(API_PATHS.user.settings, { language });
  },
};

// 新闻API
export const newsApi = {
  // 获取新闻列表
  async getNews(params?: {
    page?: number;
    limit?: number;
    category?: string;
    keywords?: string[];
    language?: string;
  }): Promise<{ items: NewsItem[]; total: number; page: number; limit: number; size?: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.category) searchParams.append('category', params.category);
    if (params?.keywords) searchParams.append('keywords', params.keywords.join(','));
    if (params?.language) searchParams.append('lang', params.language);
    
    const queryString = searchParams.toString();
    const endpoint = queryString ? `${API_PATHS.news.list}?${queryString}` : API_PATHS.news.list;
    
    const result = await apiClient.get<{ items: any[]; total: number; page: number; limit: number }>(endpoint);
    
    // 后端返回格式：{ page, limit, total, items }
    return {
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      size: result.limit  // 兼容性字段
    };
  },

  // 获取新闻详情
  async getNewsDetail(id: string, language?: string): Promise<NewsItem> {
    const params = language ? `?lang=${encodeURIComponent(language)}` : '';
    return apiClient.get<NewsItem>(`${API_PATHS.news.detail(id)}${params}`);
  },
};

export const searchApi = {
  async query(payload: {
    query?: string;
    mode: 'news' | 'ai';
    filters?: UnifiedSearchFilters;
    page?: number;
    limit?: number;
    allow_discovery?: boolean;
    language?: string;
  }): Promise<UnifiedSearchResponse> {
    return apiClient.post<UnifiedSearchResponse>(API_PATHS.search.query, {
      query: payload.query || '',
      mode: payload.mode,
      filters: payload.filters || {},
      page: payload.page,
      limit: payload.limit,
      allow_discovery: payload.allow_discovery,
      lang: payload.language,
    });
  },

  async getJob(jobId: string): Promise<SearchJobSnapshot> {
    return apiClient.get<SearchJobSnapshot>(API_PATHS.search.job(jobId));
  },

  async retryJob(jobId: string): Promise<{ ok: boolean; job_id: string; status: string }> {
    return apiClient.post<{ ok: boolean; job_id: string; status: string }>(API_PATHS.search.retry(jobId));
  },
};

export const trackingApi = {
  async getTopics(): Promise<{ items: TrackingTopic[]; total: number }> {
    return apiClient.get<{ items: TrackingTopic[]; total: number }>(API_PATHS.tracking.topics);
  },

  async createTopic(payload: { name: string; keywords: string[]; urls: string[] }): Promise<TrackingTopic> {
    return apiClient.post<TrackingTopic>(API_PATHS.tracking.topics, payload);
  },

  async deleteTopic(id: string): Promise<{ ok: boolean }> {
    return apiClient.delete<{ ok: boolean }>(API_PATHS.tracking.topicDetail(id));
  },

  async getTopicNews(id: string, limit: number = 50, language?: string): Promise<{ topic: TrackingTopic; items: TrackingNewsItem[]; total: number }> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (language) {
      params.append('lang', language);
    }
    return apiClient.get<{ topic: TrackingTopic; items: TrackingNewsItem[]; total: number }>(
      `${API_PATHS.tracking.topicNews(id)}?${params.toString()}`
    );
  },

  async getAnalytics(): Promise<TrackingAnalyticsData> {
    return apiClient.get<TrackingAnalyticsData>(API_PATHS.tracking.analytics);
  },
};
