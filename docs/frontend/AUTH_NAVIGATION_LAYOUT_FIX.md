# 认证页面导航布局修复

## 问题描述

注册、登录、忘记密码页面的头部悬浮框背景尺寸与落地页不一致。

## 根本原因

`AuthNavigation` 组件的占位符 `<div className="h-20" />` 被放置在 `<nav>` 标签内部，而 `LandingNavigation` 组件的占位符在 `<nav>` 标签外部（在 React Fragment `<>` 中）。

这导致了不同的布局行为和视觉效果。

## 修复方案

### 文件：`src/components/common/AuthNavigation.tsx`

#### 修改前结构：
```tsx
return (
  <nav className="...">
    <div className="max-w-6xl...">
      {/* 导航内容 */}
    </div>
    <div className="h-20" /> {/* 占位符在 nav 内部 */}
  </nav>
);
```

#### 修改后结构：
```tsx
return (
  <>
    <nav className="...">
      <div className="max-w-6xl...">
        {/* 导航内容 */}
      </div>
    </nav>
    <div className="h-20" /> {/* 占位符在 nav 外部 */}
  </>
);
```

## 影响范围

此修复影响以下页面：
- 注册页面 (`/register`)
- 登录页面 (`/login`)
- 忘记密码页面 (`/forgot-password`)
- 法律页面（使用 `LegalPagesLayout` 的页面）

## 技术细节

### 统一的样式规格：
- 外层容器：`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3`
- 悬浮框高度：`h-12 sm:h-14`（移动端 48px，桌面端 56px）
- 圆角样式：`rounded-full`
- 边框：`border border-border/60`
- 背景：`bg-card/80`
- 阴影：`shadow-[0_18px_45px_rgba(15,23,42,0.3)]`
- 背景模糊：`backdrop-blur-2xl`
- 占位符高度：`h-20`（80px）

### 为什么占位符位置很重要：

1. **布局一致性**：占位符在 `<nav>` 外部确保页面内容正确定位
2. **固定定位**：`<nav>` 使用 `fixed` 定位，占位符需要在文档流中为其预留空间
3. **视觉效果**：确保导航栏下方的内容不会被遮挡

## 验证

修复后，所有认证页面的头部导航应该与落地页完全一致：
- 相同的悬浮框尺寸
- 相同的阴影效果
- 相同的间距和布局
- 相同的响应式行为
