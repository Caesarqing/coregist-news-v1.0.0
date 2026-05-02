/**
 * Google Analytics 工具类
 * 用于追踪用户行为和事件
 */

// TypeScript 类型定义
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'set',
      targetId: string,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

const GA_TRACKING_ID = 'G-3BDSC5N9C3';

/**
 * Google Analytics 工具类
 */
export const analytics = {
  /**
   * 追踪页面浏览
   * @param url 页面路径
   * @param title 页面标题
   */
  pageView: (url: string, title?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', GA_TRACKING_ID, {
        page_path: url,
        page_title: title || document.title
      });
    }
  },

  /**
   * 追踪自定义事件
   * @param action 事件名称
   * @param params 事件参数
   */
  event: (action: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, params);
    }
  },

  /**
   * 设置用户属性
   * @param properties 用户属性
   */
  setUserProperties: (properties: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('set', 'user_properties', properties);
    }
  },

  /**
   * 新闻相关事件
   */
  news: {
    /**
     * 追踪新闻浏览
     */
    view: (newsId: string, title: string, category: string) => {
      analytics.event('view_news', {
        news_id: newsId,
        news_title: title,
        news_category: category,
        event_category: 'news',
        event_label: title
      });
    },

    /**
     * 追踪新闻分享
     */
    share: (newsId: string, method: string) => {
      analytics.event('share', {
        content_type: 'news',
        content_id: newsId,
        method: method,
        event_category: 'engagement',
        event_label: `share_${method}`
      });
    },

    /**
     * 追踪新闻搜索
     */
    search: (query: string, resultsCount: number) => {
      analytics.event('search', {
        search_term: query,
        results_count: resultsCount,
        event_category: 'news',
        event_label: query
      });
    },

    /**
     * 追踪新闻收藏
     */
    bookmark: (newsId: string, title: string) => {
      analytics.event('bookmark_news', {
        news_id: newsId,
        news_title: title,
        event_category: 'engagement',
        event_label: 'bookmark'
      });
    }
  },

  /**
   * 用户行为事件
   */
  user: {
    /**
     * 追踪用户注册
     */
    signUp: (method: string) => {
      analytics.event('sign_up', {
        method: method,
        event_category: 'user',
        event_label: `signup_${method}`
      });
    },

    /**
     * 追踪用户登录
     */
    login: (method: string) => {
      analytics.event('login', {
        method: method,
        event_category: 'user',
        event_label: `login_${method}`
      });
    },

    /**
     * 追踪用户登出
     */
    logout: () => {
      analytics.event('logout', {
        event_category: 'user',
        event_label: 'logout'
      });
    },

    /**
     * 追踪用户资料更新
     */
    updateProfile: () => {
      analytics.event('update_profile', {
        event_category: 'user',
        event_label: 'profile_update'
      });
    }
  },

  /**
   * 产品功能事件
   */
  feature: {
    /**
     * 追踪功能使用
     */
    use: (featureName: string, details?: Record<string, any>) => {
      analytics.event('use_feature', {
        feature_name: featureName,
        event_category: 'feature',
        event_label: featureName,
        ...details
      });
    },

    /**
     * 追踪智能推送设置
     */
    smartPush: (action: 'save' | 'delete', keywords: string[]) => {
      analytics.event('smart_push', {
        action: action,
        keywords_count: keywords.length,
        event_category: 'feature',
        event_label: `smart_push_${action}`
      });
    },

    /**
     * 追踪数据导出
     */
    exportData: (dataType: string, count: number) => {
      analytics.event('export_data', {
        data_type: dataType,
        item_count: count,
        event_category: 'feature',
        event_label: `export_${dataType}`
      });
    },

    /**
     * 追踪订阅
     */
    subscribe: (plan: string) => {
      analytics.event('subscribe', {
        plan: plan,
        event_category: 'conversion',
        event_label: `subscribe_${plan}`
      });
    }
  },

  /**
   * 错误追踪
   */
  error: {
    /**
     * 追踪应用错误
     */
    track: (errorMessage: string, errorType: string, fatal: boolean = false) => {
      analytics.event('exception', {
        description: errorMessage,
        error_type: errorType,
        fatal: fatal,
        event_category: 'error',
        event_label: errorType
      });
    },

    /**
     * 追踪 API 错误
     */
    api: (endpoint: string, statusCode: number, errorMessage: string) => {
      analytics.event('api_error', {
        endpoint: endpoint,
        status_code: statusCode,
        error_message: errorMessage,
        event_category: 'error',
        event_label: `api_${statusCode}`
      });
    }
  },

  /**
   * 性能追踪
   */
  performance: {
    /**
     * 追踪页面加载时间
     */
    pageLoad: (loadTime: number) => {
      analytics.event('page_load_time', {
        load_time: loadTime,
        event_category: 'performance',
        event_label: 'page_load',
        value: Math.round(loadTime)
      });
    },

    /**
     * 追踪 API 响应时间
     */
    apiResponse: (endpoint: string, responseTime: number) => {
      analytics.event('api_response_time', {
        endpoint: endpoint,
        response_time: responseTime,
        event_category: 'performance',
        event_label: endpoint,
        value: Math.round(responseTime)
      });
    }
  },

  /**
   * 语言切换追踪
   */
  language: {
    /**
     * 追踪语言切换
     */
    change: (fromLang: string, toLang: string) => {
      analytics.event('language_change', {
        from_language: fromLang,
        to_language: toLang,
        event_category: 'settings',
        event_label: `${fromLang}_to_${toLang}`
      });
    }
  },

  /**
   * 主题切换追踪
   */
  theme: {
    /**
     * 追踪主题切换
     */
    change: (theme: 'light' | 'dark') => {
      analytics.event('theme_change', {
        theme: theme,
        event_category: 'settings',
        event_label: `theme_${theme}`
      });
    }
  }
};

export default analytics;
