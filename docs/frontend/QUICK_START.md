# 🚀 快速开始指南 | AI-News 前端项目

> 5 分钟快速上手 AI-News 项目开发

---

## ⚡ 60 秒快速启动

### 1️⃣ 安装依赖
```bash
cd frontend
npm install
```

### 2️⃣ 启动开发服务器
```bash
npm run dev
```

### 3️⃣ 打开浏览器
访问 **http://localhost:5173/**

✅ 完成！项目已运行

---

## 📚 最常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 🔥 启动开发服务器（热更新） |
| `npm run build` | 📦 构建生产版本 |
| `npm run preview` | 👀 预览生产构建 |

---

## 🗂️ 项目文件夹速查

```
src/
├── pages/          📄 所有页面都在这里
│   ├── auth/       → 登录、注册、忘记密码
│   ├── home/       → 首页
│   ├── news/       → 新闻列表和详情
│   └── settings/   → 各种设置页面
│
├── components/     🧩 可复用组件
│   ├── ui/         → 按钮、输入框等
│   └── common/     → Logo、导航等通用组件
│
├── api/            🔌 API 相关
│   └── apiClient.ts → 所有 API 定义都在这里
│
├── contexts/       🌍 全局状态
│   └── LanguageContext.tsx → 语言切换
│
└── App.tsx         🚀 路由配置
```

---

## 💡 常见任务

### ✨ 添加新页面

**第 1 步**：在 `src/pages/` 新建文件

```tsx
export function MyPageComponent() {
  return <h1>我的新页面</h1>;
}
```

**第 2 步**：在 `src/App.tsx` 添加路由

```tsx
import { MyPageComponent } from '~/pages/mypage/MyPage';
<Route path="/mypage" element={<PublicLayout><MyPageComponent /></PublicLayout>} />
```

### 🌐 添加新语言翻译

编辑 `src/contexts/LanguageContext.tsx`：

```tsx
const translations = {
  'zh-CN': {
    'myKey': '我的翻译',
  },
  'en': {
    'myKey': 'My Translation',
  },
};
```

### 🔌 调用 API

在 `src/pages/` 的任何页面中：

```tsx
import { authApi } from '~/api/apiClient';

const result = await authApi.login(email, password);
```

---

## ❌ 常见问题

**Q: 页面白屏？**
- 按 F12 查看 Console 的错误信息
- 确认组件是否正确导出

**Q: 导入路径错误？**
- 使用 `~` 别名：`import { X } from '~/components/...'`
- 不要使用相对路径

**Q: 如何修改 API 地址？**
- 编辑 `src/api/apiClient.ts` 的 `getApiBaseUrl()` 函数

---

## 🚀 部署

```bash
npm run build      # 生成 dist/ 文件夹
                   # 直接部署到任何静态服务器
```

---

查看更多文档：
- **[README.md](./README.md)** - 详细项目说明
- **[REFACTOR_GUIDE.md](./REFACTOR_GUIDE.md)** - 重构指南和架构

**最后更新**: 2026年1月26日
