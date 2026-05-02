# AI-News 前端项目修改指导文档

**作者**: Manus AI
**日期**: 2026年2月3日

本文档旨在为 AI-News 前端项目提供详细的修改指导步骤，以满足用户提出的具体需求。这些步骤将以清晰、可执行的方式呈现，方便 AI IDE 工具（如 Cursor, VS Code）理解和执行。

## 🎯 修改目标概述

本次修改主要围绕以下几个核心目标：

1.  **统一头部导航栏**：消除 `home/news-push`、`home/news-data`、`home/targeted-tracking` 页面中可能存在的冗余头部导航栏，确保页面结构一致性。
2.  **图标规范化**：统一“AI产品中心”和“新闻推送”的图标，提升视觉一致性。
3.  **术语标准化**：将“新闻数据中心”和“定向监测”等术语统一为“新闻数据”和“定向追踪”。
4.  **新闻推送页面功能重构**：整合“关键词”和“设置”功能，将“历史”更名为“我的新闻”，并重新设计“推送列表”的展示和交互。

## 🛠️ 详细修改步骤

### 步骤 1: 消除冗余头部导航栏

**问题描述**：用户提供的图片显示在 `home/news-push`、`home/news-data`、`home/targeted-tracking` 页面中存在两个头部导航栏，其中一个（红色框选部分）是冗余的。

**分析**：
根据 `App.tsx` 的路由配置，受保护的路由（`/home`、`/news`、`/profile` 等）都使用了 `<ProtectedRoute><MainLayout /></ProtectedRoute>`。`MainLayout` 组件内部已经包含了 `TopNavigation` 作为头部导航。如果 `NewsPush`、`NewsData`、`TargetedTracking` 等页面组件内部又渲染了 `PublicHeader` 或其他头部组件，就会导致冗余。

**解决方案**：
检查 `src/pages/products/NewsPush.tsx`、`src/pages/products/NewsData.tsx`、`src/pages/products/TargetedTracking.tsx` 这三个文件，确保它们没有直接渲染任何头部组件。这些页面应该只包含其核心内容，并由 `MainLayout` 提供统一的头部导航。

1.  **打开文件**：
    -   `src/pages/products/NewsPush.tsx`
    -   `src/pages/products/NewsData.tsx`
    -   `src/pages/products/TargetedTracking.tsx`

2.  **检查并删除冗余代码**：
    在这些文件中，查找类似 `<PublicHeader />` 或其他自定义头部组件的引用。如果存在，请将其删除。这些页面应该直接返回其主要内容，例如：

    ```tsx
    // 示例：src/pages/products/NewsPush.tsx
    import React from 'react';
    // ... 其他导入

    export function NewsPush() {
      return (
        <div className="news-push-page-content">
          {/* 页面核心内容 */}
        </div>
      );
    }
    ```
    确保这些页面组件不包含任何 `<header>` 或 `<TopNavigation>`、`<PublicHeader>` 等组件的直接渲染。

### 步骤 2: 统一图标规范

**问题描述**：
1.  “AI产品中心”的图标需要统一为网页头部导航栏中的“房子形状”图标（Home 图标）。
2.  “新闻推送”的图标需要统一为 Home 页面中的“闪电形状”图标。

**分析**：
图标的定义和使用主要集中在 `src/components/TopNavigation.tsx` 和各个页面组件中。`TopNavigation.tsx` 定义了主导航栏的图标。`App.tsx` 中导入的页面组件可能在内部使用图标。

**解决方案**：

1.  **修改 `src/components/TopNavigation.tsx`**：
    -   打开 `src/components/TopNavigation.tsx`。
    -   找到 `tabs` 数组的定义。
    -   将 `id: 'home'` 对应的 `icon` 确保是 `Home` 图标（房子形状）。
    -   如果“新闻推送”在 `TopNavigation` 中有对应的 Tab，将其 `icon` 修改为 `Zap`（闪电形状，如果 `lucide-react` 中有此图标）。如果 `Zap` 不存在，需要选择一个合适的闪电图标。

    ```tsx
    // 示例：src/components/TopNavigation.tsx
    import { Home, Newspaper, User, Zap } from 'lucide-react'; // 确保导入 Zap
    // ...

    export function TopNavigation({ activeTab }: TopNavigationProps) {
      // ...
      const tabs = [
        { id: 'home', label: t('aiProductCenter'), icon: Home, path: '/home' }, // 确保是 Home 图标
        { id: 'news', label: t('newsCenter'), icon: Newspaper, path: '/news' },
        { id: 'profile', label: t('personalCenter'), icon: User, path: '/profile' },
        // 如果有新闻推送的tab，修改其图标
        // { id: 'news-push', label: t('newsPush'), icon: Zap, path: '/home/news-push' }, // 示例
      ];
      // ...
    }
    ```

2.  **检查相关页面组件**：
    -   检查 `src/pages/home/Home.tsx` 中“AI产品中心”相关的图标使用，确保是 `Home` 图标。
    -   检查 `src/pages/products/NewsPush.tsx` 中“新闻推送”相关的图标使用，确保是 `Zap` 图标。

### 步骤 3: 术语标准化

**问题描述**：
1.  将 `home` 页面和 `news-data` 页面的名称统一为“新闻数据”，而不是“新闻数据中心”。
2.  将 `home` 页面和 `targeted-tracking` 页面的名称统一为“定向追踪”，而不是“定向监测”。

**分析**：
这些术语主要出现在多语言翻译文件 (`src/contexts/LanguageContext.tsx`) 和页面标题/导航标签中。

**解决方案**：

1.  **修改 `src/contexts/LanguageContext.tsx`**：
    -   打开 `src/contexts/LanguageContext.tsx`。
    -   在 `translations` 对象中，找到并修改以下键值对：
        -   将 `newsDataCenter` (如果存在) 或类似表示“新闻数据中心”的键，修改其值为“新闻数据”。
        -   将 `targetedMonitoring` (如果存在) 或类似表示“定向监测”的键，修改其值为“定向追踪”。
        -   如果 `aiProductCenter` 需要修改，也在此处进行。

    ```tsx
    // 示例：src/contexts/LanguageContext.tsx
    export const translations = {
      'zh-CN': {
        // ...
        'newsData': '新闻数据', // 确保此键存在且值为“新闻数据”
        'targetedTracking': '定向追踪', // 确保此键存在且值为“定向追踪”
        'aiProductCenter': 'AI产品中心', // 如果需要修改，也在此处修改
        // ...
      },
      'en': {
        // ...
        'newsData': 'News Data',
        'targetedTracking': 'Targeted Tracking',
        'aiProductCenter': 'AI Product Center',
        // ...
      },
      'zh-TW': {
        // ...
        'newsData': '新聞數據',
        'targetedTracking': '定向追蹤',
        'aiProductCenter': 'AI產品中心',
        // ...
      },
    };
    ```

2.  **检查并更新页面标题和导航标签**：
    -   检查 `src/pages/home/Home.tsx`、`src/pages/products/NewsData.tsx`、`src/pages/products/TargetedTracking.tsx` 以及 `src/components/TopNavigation.tsx` 中所有直接显示这些术语的地方，确保它们都通过 `t('key')` 的方式从 `LanguageContext` 获取，并且对应的 `key` 已经更新。

### 步骤 4: 新闻推送页面功能重构 (`src/pages/products/NewsPush.tsx`)

**问题描述**：
1.  将“关键词”和“设置”这两个功能融合，变成新的“设置”区域。
2.  将原有的“历史”功能更名为“我的新闻”。
3.  “我的新闻”中，“最近推送”改为“推送列表”。
4.  “推送列表”需要显示之前设置好的新闻推送信息，样式参考 `news-data` 页面，支持列表和网格视图切换功能，可进入详情页和删除推送。

**分析**：
这部分需要对 `src/pages/products/NewsPush.tsx` 进行大范围的修改，可能还需要创建新的组件或修改现有组件。

**解决方案**：

1.  **修改 `src/pages/products/NewsPush.tsx`**：
    -   打开 `src/pages/products/NewsPush.tsx`。
    -   **重构 UI 布局**：将页面划分为“设置”和“我的新闻”两个主要区域。可以使用 `shadcn/ui` 的 `Tabs` 或 `SegmentedControl` 组件来切换这两个区域。

2.  **融合“关键词”和“设置”为新的“设置”区域**：
    -   将原有的关键词输入、管理功能和推送设置功能（如推送频率、时间等）整合到一个统一的“设置”表单或区域中。
    -   可以使用 `shadcn/ui` 的 `Form` 组件来构建这个设置表单，提供良好的用户体验。
    -   确保所有设置项（关键词、推送频率、推送时间、推送数量等）都能在此处进行配置和保存。
    -   与后端 API (`userSettingsApi.updateSettings`) 进行交互，保存用户的推送设置。

3.  **将“历史”更名为“我的新闻”**：
    -   在 `src/contexts/LanguageContext.tsx` 中添加或修改相应的翻译键值对，例如：`'history': '我的新闻'`。
    -   在 `NewsPush.tsx` 中，将所有引用“历史”的地方改为 `t('myNews')`。

4.  **“我的新闻”中，“最近推送”改为“推送列表”**：
    -   在 `src/contexts/LanguageContext.tsx` 中添加或修改相应的翻译键值对，例如：`'recentPushes': '推送列表'`。
    -   在 `NewsPush.tsx` 中，将所有引用“最近推送”的地方改为 `t('pushList')`。

5.  **实现“推送列表”功能**：
    -   **数据获取**：需要一个 API 来获取用户已设置的新闻推送列表。如果 `userSettingsApi` 中没有直接返回推送列表的接口，可能需要与后端团队沟通添加，或者从 `userSettingsApi.getSettings()` 返回的 `pushSettings` 中提取信息。
    -   **UI 展示**：
        -   参考 `news-data` 页面（例如 `src/pages/products/NewsData.tsx` 或 `src/pages/news/ListSimplified.tsx`）的样式，实现新闻推送信息的列表和网格视图切换功能。这可能需要使用 `shadcn/ui` 的 `ToggleGroup` 或自定义按钮来实现视图切换。
        -   每个列表项或网格卡片应清晰展示推送的关键词、频率、状态等关键信息。
        -   **进入详情**：每个推送项应可点击进入详情页，展示该推送规则下匹配到的新闻列表。这可能需要一个新的路由和页面组件，例如 `/home/news-push/:id`。在该详情页中，可以复用 `src/pages/news/ListSimplified.tsx` 或 `src/pages/news/Detail.tsx` 的部分逻辑来展示新闻列表。
        -   **删除功能**：为每个推送项添加删除按钮，并实现删除逻辑（调用后端 API）。
    -   **组件化**：为了代码的清晰和可维护性，建议将“推送列表”的展示逻辑封装成独立的 React 组件，例如 `PushListDisplay.tsx`，并在 `NewsPush.tsx` 中引用。

### 步骤 5: 更新路由配置 (`src/App.tsx`)

**问题描述**：
随着 `NewsPush` 页面功能的重构，可能需要调整其路由结构，特别是如果新增了推送详情页。

**解决方案**：

1.  **打开 `src/App.tsx`**。
2.  **调整 `NewsPush` 路由**：
    -   如果为新闻推送详情页创建了新的路由（例如 `/home/news-push/:id`），则需要在 `App.tsx` 中添加相应的 `Route`。

    ```tsx
    // 示例：src/App.tsx
    import { NewsPushPage as NewsPush } from '~/pages/products/NewsPush';
    import { NewsPushDetailPage } from '~/pages/products/NewsPushDetail'; // 假设新增了详情页
    // ...

    <Route
      path="/home"
      element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Home />} />
      <Route path="news-push" element={<NewsPush />} />
      <Route path="news-push/:id" element={<NewsPushDetailPage />} /> {/* 新增的详情页路由 */}
      <Route path="news-data" element={<NewsData />} />
      <Route path="targeted-tracking" element={<TargetedTracking />} />
    </Route>
    ```

### 步骤 6: 验证和测试

完成以上修改后，务必进行全面的测试以确保所有功能正常，并且没有引入新的问题。

1.  **启动开发服务器**：运行 `npm run dev`。
2.  **检查头部导航栏**：访问 `home/news-push`、`home/news-data`、`home/targeted-tracking` 页面，确认只有一个头部导航栏。
3.  **验证图标**：检查“AI产品中心”和“新闻推送”的图标是否正确显示。
4.  **检查术语**：确认所有相关页面和导航中的术语已更新为“新闻数据”和“定向追踪”。
5.  **测试新闻推送页面**：
    -   测试新的“设置”区域，包括关键词的添加、删除和推送设置的保存。
    -   测试“我的新闻”区域，确认“推送列表”能够正确显示推送信息。
    -   测试列表和网格视图切换功能。
    -   测试进入推送详情页功能，并确认能显示相关新闻。
    -   测试删除推送功能。

## 📚 引用

-   [React Router 官方文档](https://reactrouter.com/)
-   [Shadcn UI 官方文档](https://ui.shadcn.com/)
-   [Lucide React 图标库](https://lucide.dev/)

---
