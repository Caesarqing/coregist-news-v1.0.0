# 前端说明

## 技术栈

- React 18
- TypeScript
- Vite
- React Router v6
- Tailwind CSS
- shadcn/ui
- Firebase Auth

## 目录结构

```text
frontend/src/app/             应用入口、路由和 providers
frontend/src/api/             API client
frontend/src/config/          Firebase 等配置
frontend/src/contexts/        全局上下文
frontend/src/pages/           页面
frontend/src/shared/          共享组件、布局、UI 和 i18n
frontend/src/styles/          全局样式
frontend/src/types/           类型声明
frontend/src/utils/           工具函数
```

## 路由

公开路由：

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/privacy`
- `/terms`

受保护路由：

- `/home`
- `/home/news-push`
- `/home/news-push/:id`
- `/home/news-push/:id/news`
- `/home/news-data`
- `/home/news-data/:id`
- `/home/news-data/my-space`
- `/home/news-data/my-space/:id`
- `/home/targeted-tracking`
- `/home/targeted-tracking/:id`
- `/news`
- `/news/:id`
- `/profile`
- `/profile/general`
- `/profile/notification`
- `/profile/privacy`
- `/profile/edit-profile`
- `/profile/help`

旧的公开产品入口会跳转到登录页并携带 `return_url`：

- `/news-push`
- `/news-data`
- `/targeted-tracking`

## API 调用

前端统一通过同源 `/api` 访问 Gateway。生产环境不要直接把前端指向内部微服务端口。

推荐生产配置：

```env
VITE_API_BASE_URL=/api
```

## 开发命令

```bash
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend run preview
```

## 构建输出

生产构建输出在 `frontend/dist/`。部署时由 Web 服务器或静态托管平台服务前端资源，API 请求反向代理到 Gateway。
