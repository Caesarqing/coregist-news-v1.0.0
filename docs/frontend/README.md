# 📰 AI-News 前端项目 | 项目说明文档

> 一个现代化、模块化的 React + TypeScript + Vite 新闻推荐应用

**版本**: 1.0.0  
**最后更新**: 2026年1月26日  
**状态**: ✅ 生产就绪

---

## 📋 目录

1. [项目简介](#项目简介)
2. [主要功能](#主要功能)
3. [技术栈](#技术栈)
4. [项目结构](#项目结构)
5. [路由系统](#路由系统)
6. [配置说明](#配置说明)
7. [关键文件说明](#关键文件说明)
8. [开发规范](#开发规范)

---

## 🎯 项目简介

**AI-News** 是一个基于 React 18.2.0 + TypeScript + Vite 7.1.2 的智能新闻推荐和阅读应用。采用现代化的模块化架构，支持：

- ✅ 用户认证（登录/注册/忘记密码）
- ✅ 新闻浏览和搜索
- ✅ 个性化推送设置
- ✅ 个人资料管理
- ✅ 多语言支持（中文/英文/繁体）
- ✅ 响应式设计
- ✅ 完整的 URL 路由系统

---

## ✨ 主要功能

| 功能模块 | 说明 | 路由 |
|---------|------|------|
| **落地页** | 品牌展示和信息介绍（未登录用户） | `/landing`, `/` |
| **认证系统** | 登录、注册、忘记密码 | `/login`, `/register`, `/forgot-password` |
| **新闻浏览** | 新闻列表、详情页、搜索 | `/app/news`, `/app/news/:id` |
| **智能推送** | 关键词设置、推送配置 | `/app/home` |
| **个人中心** | 用户信息、资料编辑 | `/app/profile` |
| **设置系统** | 通用设置、隐私设置、通知设置 | `/app/settings/*` |
| **多语言** | 支持中英繁三种语言切换 | 全局 |

---

## 🛠️ 技术栈

### 核心框架
- **React** 18.2.0 - UI 框架
- **TypeScript** - 类型安全
- **Vite** 7.1.2 - 构建工具

### 路由和状态
- **React Router** v6 - 客户端路由
- **React Context API** - 全局状态管理（语言等）

### UI 和样式
- **Tailwind CSS** 3.3.0 - 原子化 CSS
- **Shadcn UI** - 高质量 UI 组件库
- **Lucide React** - 图标库

### 开发工具
- **ESLint** - 代码规范检查
- **PostCSS** - CSS 处理
- **Node.js** 环境

---

## 📁 项目结构 (重构后)

### 目录树

```
frontend3/
├── src/
│   ├── pages/                          # 📄 页面组件
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── ForgotPassword.tsx
│   │   ├── landing/
│   │   │   └── Landing.tsx
│   │   ├── home/
│   │   │   └── Home.tsx
│   │   ├── news/
│   │   │   ├── List.tsx
│   │   │   └── Detail.tsx
│   │   ├── profile/
│   │   │   └── Profile.tsx
│   │   └── settings/
│   │       ├── EditProfile.tsx
│   │       ├── GeneralSettings.tsx
│   │       ├── NotificationSettings.tsx
│   │       ├── PrivacySettings.tsx
│   │       └── HelpFeedback.tsx
│   │
│   ├── layouts/
│   │   ├── MainLayout.tsx
│   │   └── PublicHeader.tsx
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Logo.tsx
│   │   │   ├── BrandName.tsx
│   │   │   └── ImageWithFallback.tsx
│   │   ├── ui/                         # Shadcn UI 组件库 (30+)
│   │   ├── TopNavigation.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── ...
│   │
│   ├── api/
│   │   └── apiClient.ts                # 集中管理 API
│   │
│   ├── contexts/
│   │   └── LanguageContext.tsx         # 语言管理
│   │
│   ├── types/
│   │   ├── google.d.ts
│   │   └── api.d.ts
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   ├── App.tsx                         # 路由配置
│   └── index.tsx                       # React 入口
│
├── index.html
├── package.json
├── tsconfig.json                       # ⭐ 路径别名配置
├── vite.config.ts                      # ⭐ Vite 配置
├── tailwind.config.js
├── postcss.config.js
│
└── 📄 文档
    ├── README.md                       # 项目说明（本文件）
    ├── QUICK_START.md                  # 快速开始指南
    └── REFACTOR_GUIDE.md               # 重构指南（后续修改）
```

---

## 🛣️ 路由系统

### 路由结构

```
根路由 (/)
├── 公开路由（无需认证）
│   ├── / 或 /landing          → Landing 页面
│   ├── /login                 → 登录页
│   ├── /register              → 注册页
│   ├── /forgot-password       → 忘记密码
│   ├── /privacy               → 隐私政策
│   └── /terms                 → 使用条款
│
└── 受保护路由（需认证，前缀 /app）
    └── /app
        ├── /home             → 智能推送首页
        ├── /news             → 新闻列表
        ├── /news/:id         → 新闻详情（带 ID 参数）
        ├── /profile          → 个人资料
        └── /settings
            ├── /general      → 通用设置
            ├── /notification → 通知设置
            ├── /privacy      → 隐私设置
            ├── /edit-profile → 编辑资料
            └── /help         → 帮助反馈
```

### 路由配置（App.tsx）

```tsx
<BrowserRouter>
  <Routes>
    {/* 公开路由 */}
    <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
    <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
    
    {/* 受保护路由 */}
    <Route path="/app" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
      <Route path="home" element={<Home />} />
      <Route path="news" element={<NewsList />} />
      <Route path="news/:id" element={<NewsDetail />} />
    </Route>
  </Routes>
</BrowserRouter>
```

### 导航方式

所有页面使用 `useNavigate` hook：

```tsx
const navigate = useNavigate();

// 导航到其他页面
navigate('/login');
navigate('/app/news');
navigate(`/app/news/${id}`);
navigate(-1);  // 返回上一页
```

---

## ⚙️ 核心配置

### 路径别名配置 (tsconfig.json)

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "~/*": ["src/*"]
    }
  }
}
```

**使用效果**：

```tsx
// ✅ 推荐
import { Button } from '~/components/ui/button';
import { useLanguage } from '~/contexts/LanguageContext';

// ❌ 避免
import { Button } from '../../../components/ui/button';
```

### Vite 配置 (vite.config.ts)

```typescript
resolve: {
  alias: {
    '~': path.resolve(__dirname, './src'),
  },
}
```

---

## 🔑 关键文件

| 文件 | 作用 | 何时修改 |
|------|------|---------|
| `src/App.tsx` | 路由配置和应用入口 | 添加新页面或修改路由 |
| `src/index.tsx` | React 应用入口 | 添加全局 Provider |
| `src/contexts/LanguageContext.tsx` | 多语言管理 | 添加新语言或翻译 |
| `src/api/apiClient.ts` | API 客户端定义 | 添加新 API 接口 |
| `src/layouts/MainLayout.tsx` | 认证用户布局 | 调整应用布局 |
| `tsconfig.json` | TypeScript 配置 | 调整路径别名 |

---

## 📖 开发规范

### 文件命名

```
页面组件:    LoginPage.tsx (PascalCase + Page 后缀)
UI 组件:     Button.tsx (PascalCase)
钩子:        useLanguage.ts (use 前缀)
类型文件:    api.d.ts (小写 + .d.ts)
```

### 导入规范

```tsx
import { Button } from '~/components/ui/button';      // ✅
import { LoginPage } from '~/pages/auth/Login';       // ✅
import { Button } from '../../../components/Button';  // ❌
```

### 多语言使用

```tsx
const { t } = useLanguage();

<h1>{t('welcome')}</h1>
```

---

## 🚀 构建和部署

```bash
# 开发
npm run dev        # 启动开发服务器 (localhost:5173)

# 构建
npm run build      # 生成生产版本到 dist/

# 预览
npm run preview    # 预览生产构建
```

---

## 📚 更多文档

- **[快速开始](./QUICK_START.md)** - 快速上手指南
- **[重构指南](./REFACTOR_GUIDE.md)** - 后续修改和扩展参考

---

**最后更新**: 2026年1月26日 | **版本**: 1.0.0
