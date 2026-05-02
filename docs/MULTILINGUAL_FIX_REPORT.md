# 多语言支持修复报告

**修复日期**: 2026-04-27  
**状态**: ✅ 已完成

## 问题描述

用户反馈新闻中心页面显示的新闻是中英文混杂的，应该根据用户选择的界面语言（中文/英文）显示对应语言的新闻内容。

## 问题分析

经过系统分析，发现：

1. **数据库字段完整**：新闻数据包含完整的中英文字段
   - `title_zh`, `title_en` - 标题
   - `summary_zh`, `summary_en` - 摘要
   - `level1_name_zh`, `level1_name_en` - 分类
   - `source_zh`, `source_en` - 来源

2. **后端逻辑正确**：
   - `backend/services/shared/node/news-helpers.js` 中的 `mapNewsDoc` 函数已经实现了根据语言参数选择对应字段的逻辑
   - `getPreferredLanguage` 函数支持从查询参数、用户设置、HTTP头获取语言偏好

3. **前端工具函数完整**：
   - `frontend/src/utils/news.ts` 中的 `mapNewsItem` 函数实现了前端的语言选择逻辑
   - 大部分页面已经正确使用了这个函数

4. **根本问题**：
   - **前端API调用时没有传递语言参数给后端**
   - 导致后端无法知道用户选择的语言，默认返回中文或混合内容

## 修复方案

### 1. 更新API客户端

**文件**: `frontend/src/api/apiClient.ts`

#### 修改 `newsApi.getNews` 方法
添加 `language` 参数支持：

```typescript
async getNews(params?: {
  page?: number;
  limit?: number;
  category?: string;
  keywords?: string[];
  language?: string;  // 新增
}): Promise<...> {
  // ...
  if (params?.language) searchParams.append('lang', params.language);
  // ...
}
```

#### 修改 `newsApi.getNewsDetail` 方法
添加 `language` 参数支持：

```typescript
async getNewsDetail(id: string, language?: string): Promise<NewsItem> {
  const params = language ? `?lang=${encodeURIComponent(language)}` : '';
  return apiClient.get<NewsItem>(`${API_PATHS.news.detail(id)}${params}`);
}
```

#### 修改 `trackingApi.getTopicNews` 方法
添加 `language` 参数支持：

```typescript
async getTopicNews(id: string, limit: number = 50, language?: string): Promise<...> {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (language) {
    params.append('lang', language);
  }
  return apiClient.get<...>(`${API_PATHS.tracking.topicNews(id)}?${params.toString()}`);
}
```

### 2. 更新页面组件

#### `frontend/src/pages/news/ListSimplified.tsx`
```typescript
const fallbackResult = await newsApi.getNews({
  page: 1,
  limit: 100,
  keywords: queryText.trim() ? [queryText.trim()] : undefined,
  language,  // 传递语言参数
});
```

#### `frontend/src/pages/news/Detail.tsx`
```typescript
const detail = await newsApi.getNewsDetail(id, language);  // 传递语言参数
```

#### `frontend/src/pages/landing/Landing.tsx`
```typescript
const result = await newsApi.getNews({ page: 1, limit: 15, language });  // 传递语言参数
```

#### `frontend/src/pages/products/NewsData.tsx`
```typescript
const result = await newsApi.getNews({ page: 1, limit: 200, language });  // 传递语言参数
```

并添加 `language` 到 `useEffect` 依赖数组，确保语言切换时重新加载数据。

#### `frontend/src/pages/products/TargetedTrackingTimeline.tsx`
```typescript
const result = await trackingApi.getTopicNews(topicId, 100, language);  // 传递语言参数
```

并添加 `language` 到 `useEffect` 依赖数组。

## 修复效果

修复后，系统将实现以下效果：

1. **用户选择中文界面时**：
   - 新闻标题显示 `title_zh`（如果没有则回退到 `title_en`）
   - 新闻摘要显示 `summary_zh`（如果没有则回退到 `summary_en`）
   - 分类、来源等字段也显示中文版本

2. **用户选择英文界面时**：
   - 新闻标题显示 `title_en`（如果没有则回退到 `title_zh`）
   - 新闻摘要显示 `summary_en`（如果没有则回退到 `summary_zh`）
   - 分类、来源等字段也显示英文版本

3. **语言切换实时生效**：
   - 用户切换界面语言时，新闻列表会自动重新加载并显示对应语言的内容

## 技术细节

### 后端语言选择优先级

`getPreferredLanguage` 函数的优先级：
1. URL查询参数 `?lang=zh-CN` 或 `?lang=en`
2. 用户设置中的语言偏好
3. HTTP请求头 `Accept-Language`

### 前端语言上下文

所有页面都使用 `useLanguage()` hook 获取当前语言：
```typescript
const { language, t } = useLanguage();
```

`language` 的值为 `'zh-CN'` 或 `'en'`。

## 测试建议

1. **切换语言测试**：
   - 在新闻中心页面切换语言，验证新闻标题和摘要是否正确切换
   - 在新闻详情页切换语言，验证内容是否正确切换

2. **搜索功能测试**：
   - 在不同语言下搜索新闻，验证结果是否使用正确的语言

3. **追踪主题测试**：
   - 在追踪主题时间线页面切换语言，验证新闻是否正确显示

4. **回退机制测试**：
   - 测试当某个新闻只有中文或只有英文时，是否正确回退到另一种语言

## 相关文件

### 修改的文件
- `frontend/src/api/apiClient.ts` - API客户端
- `frontend/src/pages/news/ListSimplified.tsx` - 新闻列表页
- `frontend/src/pages/news/Detail.tsx` - 新闻详情页
- `frontend/src/pages/landing/Landing.tsx` - 首页
- `frontend/src/pages/products/NewsData.tsx` - 新闻数据页
- `frontend/src/pages/products/TargetedTrackingTimeline.tsx` - 追踪时间线页

### 相关但未修改的文件
- `frontend/src/utils/news.ts` - 新闻数据转换工具（已有正确逻辑）
- `backend/services/shared/node/news-helpers.js` - 后端新闻辅助函数（已有正确逻辑）
- `packages/contracts/src/news.ts` - 新闻数据类型定义

## 总结

本次修复通过在前端API调用时传递语言参数，确保后端能够根据用户选择的语言返回对应的新闻内容。修复后，用户界面语言与新闻内容语言将保持一致，提供更好的用户体验。

---

*修复报告生成于 2026-04-27*
