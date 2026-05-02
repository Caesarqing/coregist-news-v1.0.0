# Google Analytics 配置指南

## ✅ 已完成的配置

### 1. 基础追踪代码

已在 `index.html` 中添加 Google Analytics (GA4) 追踪代码：

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3BDSC5N9C3"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-3BDSC5N9C3');
</script>
```

**追踪 ID**: `G-3BDSC5N9C3`

### 2. 自动追踪的数据

Google Analytics 会自动追踪：
- ✅ 页面浏览量 (Page Views)
- ✅ 用户会话 (Sessions)
- ✅ 用户数量 (Users)
- ✅ 跳出率 (Bounce Rate)
- ✅ 会话时长 (Session Duration)
- ✅ 地理位置 (Geographic Location)
- ✅ 设备类型 (Device Type)
- ✅ 浏览器信息 (Browser Info)
- ✅ 流量来源 (Traffic Source)

## 📊 高级追踪配置

### 1. 自定义事件追踪

在你的 React 组件中添加自定义事件：

```typescript
// 追踪按钮点击
const handleButtonClick = () => {
  if (window.gtag) {
    window.gtag('event', 'button_click', {
      event_category: 'engagement',
      event_label: 'login_button',
      value: 1
    });
  }
  // 你的业务逻辑
};

// 追踪新闻阅读
const trackNewsView = (newsId: string, newsTitle: string) => {
  if (window.gtag) {
    window.gtag('event', 'view_item', {
      event_category: 'news',
      event_label: newsTitle,
      value: newsId
    });
  }
};

// 追踪搜索
const trackSearch = (searchTerm: string) => {
  if (window.gtag) {
    window.gtag('event', 'search', {
      search_term: searchTerm
    });
  }
};

// 追踪用户注册
const trackSignUp = (method: string) => {
  if (window.gtag) {
    window.gtag('event', 'sign_up', {
      method: method // 'email', 'google', etc.
    });
  }
};

// 追踪用户登录
const trackLogin = (method: string) => {
  if (window.gtag) {
    window.gtag('event', 'login', {
      method: method
    });
  }
};
```

### 2. TypeScript 类型定义

创建 `src/types/gtag.d.ts` 文件：

```typescript
interface Window {
  gtag?: (
    command: 'config' | 'event' | 'set',
    targetId: string,
    config?: Record<string, any>
  ) => void;
  dataLayer?: any[];
}
```

### 3. 创建 Analytics 工具类

创建 `src/utils/analytics.ts` 文件：

```typescript
// Google Analytics 工具类
export const analytics = {
  // 页面浏览
  pageView: (url: string, title?: string) => {
    if (window.gtag) {
      window.gtag('config', 'G-3BDSC5N9C3', {
        page_path: url,
        page_title: title
      });
    }
  },

  // 自定义事件
  event: (action: string, params?: Record<string, any>) => {
    if (window.gtag) {
      window.gtag('event', action, params);
    }
  },

  // 用户属性
  setUserProperties: (properties: Record<string, any>) => {
    if (window.gtag) {
      window.gtag('set', 'user_properties', properties);
    }
  },

  // 新闻相关事件
  news: {
    view: (newsId: string, title: string, category: string) => {
      analytics.event('view_news', {
        news_id: newsId,
        news_title: title,
        news_category: category
      });
    },
    
    share: (newsId: string, method: string) => {
      analytics.event('share_news', {
        news_id: newsId,
        method: method // 'facebook', 'twitter', 'email', etc.
      });
    },
    
    search: (query: string, resultsCount: number) => {
      analytics.event('search', {
        search_term: query,
        results_count: resultsCount
      });
    }
  },

  // 用户行为事件
  user: {
    signUp: (method: string) => {
      analytics.event('sign_up', { method });
    },
    
    login: (method: string) => {
      analytics.event('login', { method });
    },
    
    logout: () => {
      analytics.event('logout');
    }
  },

  // 产品功能事件
  feature: {
    use: (featureName: string) => {
      analytics.event('use_feature', {
        feature_name: featureName
      });
    },
    
    subscribe: (plan: string) => {
      analytics.event('subscribe', {
        plan: plan
      });
    }
  }
};

export default analytics;
```

### 4. 在 React Router 中追踪页面浏览

在 `App.tsx` 中添加：

```typescript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import analytics from '~/utils/analytics';

function App() {
  const location = useLocation();

  useEffect(() => {
    // 追踪页面浏览
    analytics.pageView(location.pathname + location.search);
  }, [location]);

  return (
    // 你的应用
  );
}
```

## 🎯 推荐的追踪事件

### 1. 用户认证事件

```typescript
// 在登录页面
import analytics from '~/utils/analytics';

const handleLogin = async (method: string) => {
  try {
    // 登录逻辑
    await login();
    
    // 追踪登录成功
    analytics.user.login(method);
  } catch (error) {
    // 追踪登录失败
    analytics.event('login_failed', {
      method: method,
      error: error.message
    });
  }
};

// 在注册页面
const handleSignUp = async (method: string) => {
  try {
    await register();
    analytics.user.signUp(method);
  } catch (error) {
    analytics.event('signup_failed', {
      method: method,
      error: error.message
    });
  }
};
```

### 2. 新闻阅读事件

```typescript
// 在新闻详情页
import { useEffect } from 'react';
import analytics from '~/utils/analytics';

function NewsDetailPage({ newsId, title, category }) {
  useEffect(() => {
    // 追踪新闻浏览
    analytics.news.view(newsId, title, category);
  }, [newsId, title, category]);

  return (
    // 新闻内容
  );
}
```

### 3. 搜索事件

```typescript
// 在搜索组件
const handleSearch = (query: string) => {
  const results = performSearch(query);
  
  // 追踪搜索
  analytics.news.search(query, results.length);
};
```

### 4. 功能使用事件

```typescript
// 追踪智能推送功能
const handleSavePushSettings = () => {
  savePushSettings();
  analytics.feature.use('smart_push');
};

// 追踪新闻数据功能
const handleExportData = () => {
  exportData();
  analytics.feature.use('export_data');
};
```

## 📈 Google Analytics 控制台

### 访问控制台

1. 访问 [Google Analytics](https://analytics.google.com/)
2. 选择你的账号和属性
3. 查看实时数据和报告

### 主要报告

1. **实时报告**
   - 当前在线用户
   - 实时页面浏览
   - 实时事件

2. **受众群体报告**
   - 用户数量
   - 新用户 vs 回访用户
   - 地理位置
   - 设备类型

3. **获客报告**
   - 流量来源
   - 社交媒体流量
   - 搜索引擎流量

4. **行为报告**
   - 页面浏览量
   - 热门页面
   - 用户流程

5. **转化报告**
   - 目标完成情况
   - 转化率
   - 漏斗分析

## 🎨 自定义维度和指标

### 设置自定义维度

在 Google Analytics 控制台：
1. 管理 > 自定义定义 > 自定义维度
2. 添加自定义维度：
   - 用户类型（免费/付费）
   - 用户偏好（新闻类别）
   - 用户等级

### 在代码中使用

```typescript
// 设置用户属性
analytics.setUserProperties({
  user_type: 'premium',
  preferred_category: 'technology',
  user_level: 'advanced'
});
```

## 🔒 隐私和合规

### 1. Cookie 同意

建议添加 Cookie 同意横幅：

```typescript
// 检查用户同意
const hasConsent = localStorage.getItem('analytics_consent');

if (hasConsent === 'true') {
  // 启用 Google Analytics
  window.gtag('consent', 'update', {
    analytics_storage: 'granted'
  });
} else {
  // 禁用 Google Analytics
  window.gtag('consent', 'update', {
    analytics_storage: 'denied'
  });
}
```

### 2. IP 匿名化

已在配置中自动启用（GA4 默认）。

### 3. 数据保留

在 Google Analytics 控制台设置：
- 管理 > 数据设置 > 数据保留
- 建议：14 个月

## 🧪 测试 Google Analytics

### 1. 使用 Google Analytics Debugger

安装 Chrome 扩展：[Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger)

### 2. 检查实时报告

1. 访问你的网站
2. 打开 Google Analytics 控制台
3. 查看实时 > 概览
4. 应该能看到你的访问

### 3. 使用浏览器控制台

```javascript
// 检查 gtag 是否加载
console.log(window.gtag);

// 检查 dataLayer
console.log(window.dataLayer);

// 手动触发事件测试
window.gtag('event', 'test_event', {
  test_param: 'test_value'
});
```

## 📊 推荐的 KPI 指标

### 用户指标
- 日活跃用户 (DAU)
- 月活跃用户 (MAU)
- 用户留存率
- 新用户比例

### 内容指标
- 页面浏览量
- 平均会话时长
- 跳出率
- 热门新闻

### 转化指标
- 注册转化率
- 登录成功率
- 功能使用率
- 订阅转化率

## 🔧 故障排除

### 问题 1：数据未显示

**检查：**
1. 追踪代码是否正确添加
2. 追踪 ID 是否正确
3. 浏览器是否阻止了脚本
4. 是否使用了广告拦截器

### 问题 2：实时数据延迟

**说明：**
- 实时数据通常有 1-2 分钟延迟
- 标准报告有 24-48 小时延迟

### 问题 3：事件未追踪

**检查：**
1. `window.gtag` 是否存在
2. 事件名称是否正确
3. 参数格式是否正确
4. 查看浏览器控制台错误

## 📚 相关资源

- [Google Analytics 4 文档](https://support.google.com/analytics/answer/10089681)
- [GA4 事件参考](https://support.google.com/analytics/answer/9267735)
- [GA4 最佳实践](https://support.google.com/analytics/answer/9267744)

## ✅ 完成检查清单

- [x] Google Analytics 代码已添加到 index.html
- [ ] 创建 analytics.ts 工具类
- [ ] 在 App.tsx 中添加页面浏览追踪
- [ ] 添加用户认证事件追踪
- [ ] 添加新闻阅读事件追踪
- [ ] 添加搜索事件追踪
- [ ] 测试实时数据
- [ ] 配置自定义维度
- [ ] 添加 Cookie 同意横幅
- [ ] 设置转化目标

## 🎉 总结

Google Analytics 追踪代码已成功添加！现在你可以：
- ✅ 追踪所有页面浏览
- ✅ 查看实时用户数据
- ✅ 分析用户行为
- ✅ 优化用户体验

建议下一步创建 `analytics.ts` 工具类，以便更方便地追踪自定义事件。
