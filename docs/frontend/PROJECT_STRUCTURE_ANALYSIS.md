# AI News 前端项目结构分析

## 1. 个人中心（Profile）页面位置与内容

### 页面目录结构
所有个人中心相关页面位于 `src/pages/settings/` 目录中：

```
src/pages/
├── profile/
│   └── Profile.tsx                 # 个人中心主页 (/profile)
└── settings/
    ├── EditProfile.tsx              # 编辑资料页面 (/profile/edit-profile)
    ├── GeneralSettings.tsx          # 通用设置 (/profile/general)
    ├── NotificationSettings.tsx     # 通知设置 (/profile/notification)
    ├── PrivacySettings.tsx          # 隐私设置 (/profile/privacy)
    └── HelpFeedback.tsx             # 帮助与反馈 (/profile/help)
```

### 路由配置（App.tsx）
```typescript
<Route
  path="/profile"
  element={
    <ProtectedRoute>
      <MainLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<Profile />} />                    // 主页
  <Route path="general" element={<GeneralSettings />} />   // 通用设置
  <Route path="notification" element={<NotificationSettings />} /> // 通知
  <Route path="privacy" element={<PrivacySettings />} />   // 隐私
  <Route path="edit-profile" element={<EditProfile />} /> // 编辑资料
  <Route path="help" element={<HelpFeedback />} />        // 帮助
  <Route path="terms" element={<TermsOfUsePage />} />     // 法律
  <Route path="privacy-policy" element={<PrivacyPolicyPage />} /> // 隐私政策
</Route>
```

### Profile.tsx 主页面 - 导航菜单项
```
✓ 编辑资料 (Edit Profile)      → /profile/edit-profile
✓ 通用设置 (General Settings)  → /profile/general
✓ 消息通知 (Notifications)     → /profile/notification
✓ 隐私设置 (Privacy)           → /profile/privacy
✓ 帮助反馈 (Help & Feedback)   → /profile/help
✓ 登出 (Logout)                → 清空存储并回跳到登录页
```

---

## 2. 页面文件详细内容

### Profile.tsx（个人中心主页）
**位置**: `src/pages/profile/Profile.tsx`
**功能**:
- 显示用户头像与用户名
- 刷新点数余额（1,250 分）
- 导航菜单（4个主要功能模块）
- 退出登录按钮

**关键代码片段**:
```tsx
// 导航逻辑
const onNavigate = (section: string) => {
  switch (section) {
    case 'edit-profile': navigate('/profile/edit-profile');
    case 'general-settings': navigate('/profile/general');
    case 'notifications': navigate('/profile/notification');
    case 'privacy': navigate('/profile/privacy');
    case 'help-feedback': navigate('/profile/help');
  }
};

// 导航项数组
[
  { icon: Settings, label: t('generalSettings'), onClick: ... },
  { icon: Bell, label: t('messageNotifications'), onClick: ... },
  { icon: Shield, label: t('privacySettings'), onClick: ... },
  { icon: HelpCircle, label: t('helpAndFeedback'), onClick: ... },
]
```

### PrivacySettings.tsx（隐私设置）
**位置**: `src/pages/settings/PrivacySettings.tsx`
**功能**:
- 位置追踪开关
- 阅读历史开关
- 个性化广告开关
- 数据收集开关
- 分析数据共享开关
- 清除阅读历史按钮
- 导出用户数据按钮
- 删除账户选项

### NotificationSettings.tsx（通知设置）
**位置**: `src/pages/settings/NotificationSettings.tsx`
**功能**:
- 推送通知启用开关
- 新闻更新通知开关
- 突发新闻通知开关
- 声音启用开关
- 振动启用开关
- 免打扰模式 + 时间设置

### HelpFeedback.tsx（帮助与反馈）
**位置**: `src/pages/settings/HelpFeedback.tsx`
**功能**:
- FAQ 常见问题（6个条目，使用 Accordion 组件）
- 反馈表单（反馈文本、邮箱、星级评分）
- 联系方式（邮件、电话、网站）

### GeneralSettings.tsx（通用设置）
**位置**: `src/pages/settings/GeneralSettings.tsx`
**功能**:
- 语言选择（中文/English）
- 主题切换（Light/Dark 模式）
- 自动更新开关
- 仅WiFi下载开关

### EditProfile.tsx（编辑资料）
**位置**: `src/pages/settings/EditProfile.tsx`
**功能**:
- 用户头像展示
- 用户名输入框
- 个人简介输入框
- 邮箱（只读）
- 电话号码
- 生日日期
- 保存按钮

---

## 3. 路由配置详解

### 全局路由结构（App.tsx）

```typescript
// 🔴 公开路由（无需登录）
/                           Landing.tsx
/login, /register, /forgot-password   认证页面
/privacy, /terms            法律页面
/news-push, /news-data, /targeted-tracking  产品公开页面

// 🔵 受保护路由（需要 ProtectedRoute 包装）
/home/*                     AI产品中心（带MainLayout）
/news/*                     新闻中心（带MainLayout）
/profile/*                  个人中心（带MainLayout）
```

### 路由判断逻辑
从 MainLayout.tsx 获取当前路由：
```typescript
const getActiveTab = (): string => {
  const path = location.pathname;
  if (path.startsWith('/home')) return 'home';
  if (path.startsWith('/news')) return 'news';
  if (path.startsWith('/profile')) return 'profile';
  return 'home';
};
```

---

## 4. 主要布局与导航

### MainLayout（src/layouts/MainLayout.tsx）
```tsx
<div className="flex flex-col h-screen bg-background overflow-hidden">
  <TopNavigation activeTab={activeTab} />     {/* 顶部导航栏 */}
  <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
    <Outlet />                                   {/* React Router 嵌套内容 */}
  </div>
</div>
```

### TopNavigation（src/components/TopNavigation.tsx）
**功能**:
- Logo + 品牌名展示
- 三个主导航标签：Home / News / Profile
- 主题切换按钮
- 语言切换按钮

**活跃状态样式**:
```tsx
// 活跃标签
bg-primary/12 text-primary
shadow-[0_0_0_1px_rgba(37,99,235,0.3),_0_2px_12px_rgba(37,99,235,0.15)]

// 非活跃标签
text-muted-foreground/80 hover:bg-muted/40
```

---

## 5. 颜色与样式系统

### CSS 变量定义（src/styles/globals.css）

#### 浅色模式 `:root`
```css
--background: #f5f7fa;              /* 冷调中性白 */
--foreground: #0f172a;              /* 深灰接近黑 */
--card: rgba(255, 255, 255, 0.82);  /* 轻微透明白 */
--primary: #2563eb;                 /* AI 蓝主色 */
--primary-foreground: #f0f6ff;      /* 主色背景 */
--secondary: #dbeafe;               /* 浅蓝次色 */
--muted: #eef2f8;                   /* 静音背景 */
--muted-foreground: #5a6e8a;        /* 静音文字 */
--border: rgba(210, 220, 235, 0.7); /* 极轻描边 */
--destructive: #dc2626;             /* 销毁红 */
```

#### 深色模式 `.dark`
```css
--background: #0c0e14;              /* 近纯黑冷灰 */
--foreground: #e2e8f4;              /* 浅灰文字 */
--card: rgba(14, 20, 32, 0.72);     /* 深色磨砂玻璃 */
--primary: #4d9fff;                 /* 更亮的 AI 蓝 */
--border: rgba(38, 55, 84, 0.5);    /* 极细极暗 */
```

### Tailwind 配置（tailwind.config.js）
```js
// 所有颜色都使用 CSS 变量
colors: {
  border: "var(--border)",
  primary: "var(--primary)",
  primary-foreground: "var(--primary-foreground)",
  secondary: "var(--secondary)",
  muted: "var(--muted)",
  // ... 等等
}

// 图表色系
--chart-1: #1d4ed8;
--chart-2: #2563eb;
--chart-3: #3b82f6;
```

### 阴影效果
```js
"ai-glow": "0 0 0 1px rgba(37,99,235,0.3), 0 4px 24px rgba(37,99,235,0.35)",
"card-glass": "0 8px 32px rgba(15,23,42,0.12), 0 1px 3px rgba(15,23,42,0.06)",
"nav-pill": "0 8px 32px rgba(15,23,42,0.18), 0 1px 4px rgba(15,23,42,0.08)",
```

### 圆角配置
```css
--radius: 0.85rem;  /* 约 13.6px */
lg:  var(--radius)
md:  calc(var(--radius) - 2px)
sm:  calc(var(--radius) - 4px)
xl:  calc(var(--radius) + 4px)
```

---

## 6. 页面样式示例

### 通用布局模式

#### PageHero 组件（src/components/common/PageHero.tsx）
所有设置页面都使用此组件作为顶部标题：
```tsx
<PageHero
  title={t('privacySettings')}                    // 页面标题
  description={heroDescription}                   // 描述文本
  icon={Shield}                                   // 图标
  gradientClassName="bg-gradient-to-r from-indigo-600 to-purple-600"  // 可选渐变
/>
```

**特征**:
- 右上角 AI 蓝色淡光晕装饰（仅深色模式明显）
- 底部渐变淡出（替代 border-b）
- Framer Motion 动画（opacity + y 位移）
- 图标在蓝色背景容器中

#### 卡片结构
```tsx
<Card className="border border-border hover:shadow-sm transition-all duration-200">
  <CardHeader className="pb-2 px-6 pt-6">
    <h3 className="text-foreground text-lg font-semibold flex items-center gap-3">
      <div className="p-2 bg-muted rounded-lg">
        <Icon className="w-5 h-5 text-primary" />  {/* 图标容器 */}
      </div>
      标题文本
    </h3>
  </CardHeader>
  <CardContent className="p-5 sm:p-6">
    {/* 内容 */}
  </CardContent>
</Card>
```

### 响应式间距模式
所有主要页面内容使用：
```tsx
<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
  {/* content */}
</div>
```

**说明**:
- `max-w-6xl`: 最大宽度
- `px-4 sm:px-6 lg:px-8`: 响应式水平间距 (16px → 24px → 32px)
- `py-8 sm:py-10`: 响应式竖直间距 (32px → 40px)
- `space-y-6`: 子元素间距 24px

### Grid 响应式布局
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1列 → 2列 → 3列 */}
</div>
```

### Flex 响应式布局
```tsx
<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
  {/* 竖排 → 横排排列 */}
</div>
```

---

## 7. 其他页面样式参考

### Home.tsx（产品中心）
**位置**: `src/pages/home/Home.tsx`

产品卡片样式：
```tsx
<Card className="group border border-border/70 hover:border-ring/60 transition-all duration-200 cursor-pointer">
  <CardContent className="p-6">
    <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-4
                    bg-primary/10 text-primary
                    shadow-[0_0_0_1px_rgba(37,99,235,0.15),_0_2px_12px_rgba(37,99,235,0.12)]
                    group-hover:shadow-[0_0_0_1px_rgba(37,99,235,0.3),_0_4px_20px_rgba(37,99,235,0.2)]
                    transition-shadow duration-200" />
  </CardContent>
</Card>
```

### NewsPageSimplified.tsx（新闻列表）
**位置**: `src/pages/news/ListSimplified.tsx`

搜索框样式：
```tsx
<Input
  type="search"
  placeholder={t('searchNews')}
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="rounded-xl border-slate-200 bg-white"
/>
```

---

## 8. 动画与交互

### Framer Motion 使用
```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.35, delay: index * 0.08 }}
>
  {/* 内容 */}
</motion.div>
```

### 关键帧动画（tailwind.config.js）
```js
keyframes: {
  "ai-pulse": { "0%, 100%": { opacity: "1", transform: "scale(1)" } },
  "fade-in-up": { from: { opacity: "0", transform: "translateY(12px)" } },
  "glow-breathe": { "0%, 100%": { boxShadow: "0 0 12px rgba(37,99,235,0.3)" } }
}

animation: {
  "ai-pulse": "ai-pulse 2s ease-in-out infinite",
  "fade-in-up": "fade-in-up 0.5s ease forwards"
}
```

---

## 9. 图标与字体

### 图标库
- **lucide-react** 用于所有 UI 图标
- 常用图标：`User`, `Settings`, `Bell`, `Shield`, `HelpCircle`, `LogOut`, etc.

### 字体堆栈
```css
font-family: 'Inter', 'SF Pro Display', 'Segoe UI', sans-serif;
```

### 字体加载
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap');
```

---

## 10. 主题配置

### ThemeProvider（src/components/theme-provider.tsx）
```tsx
<NextThemesProvider
  attribute="class"           // 使用 class 属性控制主题
  defaultTheme="system"       // 默认跟随系统
  enableSystem               // 启用系统检测
  disableTransitionOnChange  // 禁用过渡动画
>
  {children}
</NextThemesProvider>
```

### 切换主题
```tsx
import { useTheme } from 'next-themes';

const { resolvedTheme, setTheme } = useTheme();
const darkMode = resolvedTheme === 'dark';
setTheme('dark'); // 切换到深色
```

---

## 总结

**项目特点**:
✓ 现代化 React 18 + TypeScript
✓ Tailwind CSS + CSS 变量混合
✓ 响应式设计（Mobile First）
✓ 深色模式原生支持
✓ Framer Motion 动画库
✓ 模块化组件架构
✓ AI 蓝主题（#2563eb）
✓ 毛玻璃/磨砂效果
✓ 多语言支持（中/英）

**关键文件**:
- 颜色配置: `src/styles/globals.css`
- 布局配置: `src/layouts/MainLayout.tsx`
- 导航配置: `src/components/TopNavigation.tsx`
- 路由配置: `App.tsx`
- UI 组件: `src/components/ui/*`
