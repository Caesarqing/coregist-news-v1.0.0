# 前端设计重构指导文档 — AI News 应用

> **目标读者**：Codex（AI 编码助手）  
> **版本**：v1.0 · 2026-03-09  
> **参考风格**：[AI Chatbot Platform Demo](https://ui-ux-pro-max-skill.nextlevelbuilder.io/demo/ai-chatbot-platform)  
> **设计语言**：极简 · AI 原生 · 玻璃卡片 · 中性色 + AI 蓝点缀

---

## 0. 项目概览

| 属性 | 值 |
|------|----|
| 框架 | React 18 + TypeScript |
| 构建 | Vite |
| 样式 | Tailwind CSS v3 + shadcn/ui (Radix UI) |
| 动画 | Framer Motion |
| 路由 | React Router DOM v6 |
| 图标 | lucide-react |
| 字体 | Inter（正文）/ Sora（标题） |

### 整体修改原则

1. **禁止引入新依赖**，仅使用已有技术栈。
2. **保留所有业务逻辑**，仅改动 `className`、CSS 变量及 JSX 结构中的视觉元素。
3. **不改动 API 层**（`src/api/`）、**路由配置**（`App.tsx`）和**国际化逻辑**（`src/contexts/`）。
4. 所有改动需同时兼容 `light` 和 `dark` 两套主题。
5. 每次修改一个文件，完成后验证 TypeScript 类型无报错再进行下一个。

---

## 1. 设计系统目标（Design Token 层）

### 1.1 核心风格关键词

| 维度 | 目标效果 | 实现方式 |
|------|----------|----------|
| 极简 | 减少视觉噪音，留白充足 | 减少 border、降低 shadow 层级、增大内边距 |
| AI 原生 | 有科技感、有生命力 | 微发光按钮、渐变点缀、AI 蓝高亮关键交互 |
| 玻璃卡片 | 半透明磨砂玻璃质感 | `backdrop-blur` + 半透明背景 + 极细边框 |
| 中性色底 | 背景平静不刺眼 | 调低 dark 背景的蓝色饱和度 → 近炭灰 |
| AI 蓝点缀 | 品牌色突出 CTA | Primary 按钮带发光，关键 icon 用 primary |

### 1.2 颜色 Token 调整规范

```
Light Mode（保持现有，微调）:
  background:   #f5f7fa   ← 略冷调，比 #f7f9fc 更中性
  card:         rgba(255,255,255,0.75)   ← 加半透明感
  border:       rgba(226,232,240,0.6)   ← 降低饱和度
  primary:      #2563eb   ← 保持 AI 蓝
  ring:         #3b82f6

Dark Mode（重点调整）:
  background:   #0c0e14   ← 近纯黑偏冷灰，去除蓝色调
  card:         rgba(16,22,36,0.7)   ← 带透明感的深色
  border:       rgba(38,55,84,0.45)  ← 更微弱的描边
  primary:      #4d9fff   ← 更亮更鲜艳的 AI 蓝
  muted:        #111827
  muted-foreground: #7d8fa3
```

---

## 2. 文件修改清单（按优先级排序）

---

### 📄 文件 1：`src/styles/globals.css`

**优先级：P0 — 最先执行，其他文件依赖此处变量**

#### 2.1 修改 CSS 变量（`:root` 和 `.dark`）

将 `:root` 块替换为：

```css
:root {
  --font-size: 14px;
  --text-2xl: 1.5rem;
  --text-xl: 1.25rem;
  --text-lg: 1.125rem;
  --text-base: 1rem;
  --text-sm: 0.875rem;
  --text-xs: 0.75rem;

  /* 背景：冷调中性白 */
  --background: #f5f7fa;
  --foreground: #0f172a;

  /* 卡片：带轻微透明感 */
  --card: rgba(255, 255, 255, 0.82);
  --card-foreground: #0f172a;
  --popover: rgba(255, 255, 255, 0.95);
  --popover-foreground: #0f172a;

  /* AI 蓝主色 */
  --primary: #2563eb;
  --primary-foreground: #f0f6ff;
  --primary-glow: rgba(37, 99, 235, 0.35);  /* 新增：按钮发光色 */

  /* 次级/静音色 */
  --secondary: #dbeafe;
  --secondary-foreground: #1e3a8a;
  --muted: #eef2f8;
  --muted-foreground: #5a6e8a;
  --accent: #eff6ff;
  --accent-foreground: #1e3a8a;

  /* 语义色 */
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;

  /* 描边：更轻 */
  --border: rgba(210, 220, 235, 0.7);
  --input: transparent;
  --input-background: rgba(255, 255, 255, 0.9);
  --switch-background: #cbd5e1;
  --ring: #3b82f6;

  --radius: 0.85rem;

  /* 图表色系 */
  --chart-1: #1d4ed8;
  --chart-2: #2563eb;
  --chart-3: #3b82f6;
  --chart-4: #60a5fa;
  --chart-5: #93c5fd;

  /* Sidebar */
  --sidebar: rgba(255, 255, 255, 0.9);
  --sidebar-foreground: #0f1720;
  --sidebar-primary: #2563eb;
  --sidebar-primary-foreground: #f8fbff;
  --sidebar-accent: #eff6ff;
  --sidebar-accent-foreground: #1f2937;
  --sidebar-border: rgba(210, 220, 235, 0.5);
  --sidebar-ring: #3b82f6;

  /* 品牌色阶 */
  --brand-50: #eff6ff;
  --brand-100: #dbeafe;
  --brand-500: #2563eb;
  --brand-600: #1d4ed8;
}

.dark {
  /* 背景：近纯黑冷灰，去掉蓝调 */
  --background: #0c0e14;
  --foreground: #e2e8f4;

  /* 卡片：深色磨砂玻璃 */
  --card: rgba(14, 20, 32, 0.72);
  --card-foreground: #e2e8f4;
  --popover: rgba(14, 20, 32, 0.95);
  --popover-foreground: #e2e8f4;

  /* AI 蓝：dark mode 更明亮 */
  --primary: #4d9fff;
  --primary-foreground: #030d1a;
  --primary-glow: rgba(77, 159, 255, 0.4);

  /* 次级/静音色 */
  --secondary: #162035;
  --secondary-foreground: #b8d0f5;
  --muted: #111827;
  --muted-foreground: #7d8fa3;
  --accent: #1a2e50;
  --accent-foreground: #c8deff;

  /* 语义色 */
  --destructive: #ef4444;
  --destructive-foreground: #fff8f8;

  /* 描边：极细极暗 */
  --border: rgba(38, 55, 84, 0.5);
  --input: rgba(10, 18, 32, 0.6);
  --input-background: rgba(12, 20, 35, 0.8);
  --switch-background: #334155;
  --ring: #4d9fff;

  /* 图表 */
  --chart-1: #4d9fff;
  --chart-2: #3b82f6;
  --chart-3: #2563eb;
  --chart-4: #1d4ed8;
  --chart-5: #93c5fd;

  /* Sidebar */
  --sidebar: rgba(14, 20, 32, 0.9);
  --sidebar-foreground: #e2e8f4;
  --sidebar-primary: #4d9fff;
  --sidebar-primary-foreground: #030d1a;
  --sidebar-accent: #111827;
  --sidebar-accent-foreground: #c8deff;
  --sidebar-border: rgba(38, 55, 84, 0.4);
  --sidebar-ring: #4d9fff;

  --brand-50: #1a2e50;
  --brand-100: #203a66;
  --brand-500: #4d9fff;
  --brand-600: #3b82f6;
}
```

#### 2.2 新增全局工具类（追加到文件末尾）

在文件末尾追加以下内容（**不删除原有内容，仅追加**）：

```css
/* ========================================
   AI Native Glass System
   ======================================== */

/* 玻璃卡片底层混合 - 用于高级玻璃效果 */
.glass-surface {
  background: var(--card);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  border: 1px solid var(--border);
}

/* AI 蓝光晕效果 - 用于 primary 按钮和重点 icon */
.ai-glow {
  box-shadow:
    0 0 0 1px rgba(37, 99, 235, 0.3),
    0 4px 24px var(--primary-glow),
    0 1px 4px rgba(0, 0, 0, 0.12);
}

.dark .ai-glow {
  box-shadow:
    0 0 0 1px rgba(77, 159, 255, 0.3),
    0 4px 30px var(--primary-glow),
    0 1px 4px rgba(0, 0, 0, 0.3);
}

/* 微发光 hover - 用于可点击卡片 */
.hover-glow:hover {
  box-shadow:
    0 0 0 1px rgba(37, 99, 235, 0.15),
    0 8px 32px rgba(37, 99, 235, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.08);
}

.dark .hover-glow:hover {
  box-shadow:
    0 0 0 1px rgba(77, 159, 255, 0.2),
    0 8px 40px rgba(77, 159, 255, 0.12),
    0 2px 10px rgba(0, 0, 0, 0.3);
}

/* 分隔线替换方案 - 用渐变淡出代替实线 */
.section-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--border) 30%,
    var(--border) 70%,
    transparent 100%
  );
  opacity: 0.5;
  margin: 0 auto;
  width: 80%;
  border: none;
}

/* AI 渐变文字 - 用于标题强调 */
.gradient-text-ai {
  background: linear-gradient(135deg, var(--primary) 0%, #60a5fa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 微动画脉冲 - AI dot indicator */
@keyframes ai-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

.animate-ai-pulse {
  animation: ai-pulse 2s ease-in-out infinite;
}

/* 平滑 fade-in-up - 页面元素进场 */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fade-in-up 0.5s ease forwards;
}

/* 覆盖 dark mode 下白色背景的遗留类 */
.dark .bg-white,
.dark .bg-white\/90,
.dark .bg-white\/95 {
  background-color: var(--card) !important;
}

.dark .text-gray-900,
.dark .text-slate-900 {
  color: var(--foreground) !important;
}

.dark .text-gray-700,
.dark .text-gray-600,
.dark .text-gray-500,
.dark .text-gray-400,
.dark .text-slate-700,
.dark .text-slate-600,
.dark .text-slate-500,
.dark .text-slate-400 {
  color: var(--muted-foreground) !important;
}

.dark .bg-gray-50,
.dark .bg-slate-50 {
  background-color: color-mix(in srgb, var(--background) 92%, #ffffff 8%) !important;
}

.dark .border-gray-200,
.dark .border-slate-200,
.dark .border-slate-100 {
  border-color: var(--border) !important;
}
```

> ⚠️ **注意**：`--card` 现在使用 `rgba()` 值而非十六进制，需要同步更新 `tailwind.config.js` 中的颜色引用方式（见文件 2）。

---

### 📄 文件 2：`tailwind.config.js`

**优先级：P0 — 与 globals.css 同步修改**

由于 `--card` 等变量改为 `rgba()` 值，Tailwind 使用 `hsl(var(--card))` 会失效。需将颜色系统改为直接引用 CSS 变量原始值，或使用 Tailwind 的 `opacity modifier` 支持方式。

**推荐方案**：将卡片/背景等透明色改为使用 CSS 变量 `var()` 语法（Tailwind v3.1+ 支持 arbitrary values）。

**将整个 `tailwind.config.js` 替换为**：

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  theme: {
    extend: {
      colors: {
        border:      "var(--border)",
        input:       "var(--input)",
        ring:        "var(--ring)",
        background:  "var(--background)",
        foreground:  "var(--foreground)",
        primary: {
          DEFAULT:    "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT:    "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT:    "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT:    "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT:    "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT:    "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT:    "var(--card)",
          foreground: "var(--card-foreground)",
        },
        sidebar: {
          DEFAULT:              "var(--sidebar)",
          foreground:           "var(--sidebar-foreground)",
          primary:              "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent:               "var(--sidebar-accent)",
          "accent-foreground":  "var(--sidebar-accent-foreground)",
          border:               "var(--sidebar-border)",
          ring:                 "var(--sidebar-ring)",
        },
      },
      borderRadius: {
        lg:   "var(--radius)",
        md:   "calc(var(--radius) - 2px)",
        sm:   "calc(var(--radius) - 4px)",
        xl:   "calc(var(--radius) + 4px)",
        "2xl":"calc(var(--radius) + 8px)",
        full: "9999px",
      },
      boxShadow: {
        "ai-glow":
          "0 0 0 1px rgba(37,99,235,0.3), 0 4px 24px rgba(37,99,235,0.35), 0 1px 4px rgba(0,0,0,0.12)",
        "ai-glow-lg":
          "0 0 0 1px rgba(37,99,235,0.2), 0 8px 40px rgba(37,99,235,0.3), 0 2px 8px rgba(0,0,0,0.1)",
        "card-glass":
          "0 8px 32px rgba(15,23,42,0.12), 0 1px 3px rgba(15,23,42,0.06)",
        "card-glass-hover":
          "0 16px 48px rgba(15,23,42,0.18), 0 2px 6px rgba(15,23,42,0.08)",
        "nav-pill":
          "0 8px 32px rgba(15,23,42,0.18), 0 1px 4px rgba(15,23,42,0.08)",
      },
      keyframes: {
        "ai-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%":       { opacity: "0.6", transform: "scale(0.85)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "glow-breathe": {
          "0%, 100%": { boxShadow: "0 0 12px rgba(37,99,235,0.3)" },
          "50%":       { boxShadow: "0 0 28px rgba(37,99,235,0.6)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "25%":       { transform: "translate(20px,-50px) scale(1.1)" },
          "50%":       { transform: "translate(-20px,20px) scale(0.9)" },
          "75%":       { transform: "translate(50px,50px) scale(1.05)" },
        },
      },
      animation: {
        "ai-pulse":     "ai-pulse 2s ease-in-out infinite",
        "fade-in-up":   "fade-in-up 0.5s ease forwards",
        "glow-breathe": "glow-breathe 3s ease-in-out infinite",
        blob:           "blob 7s infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
}
```

> **关键变化**：颜色从 `hsl(var(--xxx))` 改为 `var(--xxx)`，这样 Tailwind 能正确处理 `rgba()` 格式的 CSS 变量。同时删除了 `@theme inline` 块（在 globals.css 中可删除该块，因为 Tailwind v3 不需要此语法）。

---

### 📄 文件 3：`src/components/ui/button.tsx`

**优先级：P1 — 所有页面的主要交互元素**

**目标**：Primary 按钮需要 AI 蓝发光效果，CTA 按钮要有存在感。

**完整替换文件内容为**：

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  // 基础样式：圆角、字重、过渡、可访问性
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg",
    "text-sm font-semibold transition-all duration-200",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1",
    "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary — AI 蓝发光 CTA，最重要的交互按钮
        default: [
          "bg-primary text-primary-foreground",
          "border border-primary/80",
          // 发光效果：静态 + hover 增强
          "shadow-[0_0_0_1px_rgba(37,99,235,0.25),_0_4px_20px_rgba(37,99,235,0.3),_0_1px_4px_rgba(0,0,0,0.1)]",
          "hover:shadow-[0_0_0_1px_rgba(37,99,235,0.4),_0_6px_28px_rgba(37,99,235,0.45),_0_2px_6px_rgba(0,0,0,0.12)]",
          "hover:brightness-[1.06]",
          "active:translate-y-[1px] active:shadow-none",
        ].join(" "),

        // Destructive — 红色警告操作
        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-[0_2px_8px_rgba(220,38,38,0.25)]",
          "hover:brightness-95",
          "focus-visible:ring-destructive/20",
        ].join(" "),

        // Outline — 次级操作，轻描边
        outline: [
          "border border-border/80 bg-transparent text-foreground",
          "hover:bg-muted/50 hover:border-primary/30 hover:text-primary",
          "transition-colors",
        ].join(" "),

        // Secondary — 蓝色浅底
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:brightness-95",
        ].join(" "),

        // Ghost — 无背景，轻 hover
        ghost: [
          "hover:bg-muted/60 hover:text-foreground",
        ].join(" "),

        // Link — 文字链接
        link: "text-primary underline-offset-4 hover:underline",

        // AI CTA — 特殊渐变版 primary，用于 Hero 区域主按钮
        "ai-cta": [
          "bg-gradient-to-r from-primary to-blue-500 text-white",
          "border border-primary/60",
          "shadow-[0_0_0_1px_rgba(37,99,235,0.3),_0_8px_32px_rgba(37,99,235,0.4)]",
          "hover:shadow-[0_0_0_1px_rgba(37,99,235,0.5),_0_12px_40px_rgba(37,99,235,0.5)]",
          "hover:brightness-[1.08]",
          "active:translate-y-[1px]",
        ].join(" "),
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm:      "h-9 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg:      "h-11 px-6 has-[>svg]:px-4 text-base",
        xl:      "h-13 px-8 has-[>svg]:px-5 text-base",
        icon:    "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
```

**新增的 variant 说明**：
- `"ai-cta"` — Landing 页 Hero 区域的主 CTA 按钮，渐变蓝 + 强发光
- 现有 `"default"` variant 已增强为带发光阴影

**使用示例（Landing Hero 按钮改法）**：
```tsx
// 修改前：
<Button size="lg" onClick={() => navigate('/login')}>立即登录</Button>

// 修改后（主 CTA）：
<Button variant="ai-cta" size="lg" onClick={() => navigate('/login')}>立即登录</Button>

// 注册按钮保持 outline 但突出一点：
<Button size="lg" variant="outline" onClick={() => navigate('/register')}>
  免费注册
</Button>
```

---

### 📄 文件 4：`src/components/ui/card.tsx`

**优先级：P1 — 最核心的视觉容器**

**目标**：增强磨砂玻璃效果，降低阴影"厚重感"，改用更精致的光晕。

**完整替换文件内容为**：

```tsx
import * as React from "react";
import { cn } from "./utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // 玻璃底层
        "relative flex flex-col gap-6 rounded-2xl",
        "bg-card backdrop-blur-xl",
        // 描边：极细，半透明
        "border border-border/50",
        // 阴影：轻盈而有层次
        "shadow-[0_4px_24px_rgba(15,23,42,0.08),_0_1px_3px_rgba(15,23,42,0.04)]",
        // hover 效果
        "hover:border-primary/20",
        "hover:shadow-[0_8px_40px_rgba(15,23,42,0.12),_0_2px_6px_rgba(15,23,42,0.06)]",
        "transition-[border-color,box-shadow,background-color,transform] duration-250",
        "hover:-translate-y-0.5",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto]",
        "items-start gap-1.5 px-6 pt-6",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        // 注意：移除了 [.border-b]:pb-6 — 不使用 border-b 作为分隔
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h4
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      // 移除 [.border-t]:pt-6 — 不用 border-t 分隔
      className={cn("flex items-center px-6 pb-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
```

---

### 📄 文件 5：`src/components/ui/input.tsx`

**优先级：P1 — 表单核心元素**

**目标**：玻璃质感输入框，focus 时有 AI 蓝光晕。

```tsx
import * as React from "react";
import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // 基础布局
        "flex h-10 w-full min-w-0 rounded-lg px-3 py-2",
        "text-base md:text-sm",
        // 玻璃背景
        "bg-input-background backdrop-blur-sm",
        // 描边
        "border border-border/60",
        // 文字
        "text-foreground placeholder:text-muted-foreground/60",
        // 过渡
        "transition-[border-color,box-shadow,background-color] duration-200 outline-none",
        // Focus：AI 蓝光晕
        "focus-visible:border-primary/60",
        "focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.15),_0_1px_4px_rgba(37,99,235,0.1)]",
        // 文件输入
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        // 禁用态
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // 错误态
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
```

---

### 📄 文件 6：`src/components/ui/separator.tsx`

**优先级：P1 — 直接解决"贯穿式横线"问题**

**目标**：将分隔线改为渐变淡出样式，大幅降低视觉存在感。

```tsx
"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "./utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator-root"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0",
        orientation === "horizontal"
          ? [
              "h-px w-full",
              // 渐变淡出：两端透明，中间有描边色，整体透明度低
              "bg-gradient-to-r from-transparent via-border/40 to-transparent",
            ].join(" ")
          : "h-full w-px bg-border/30",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
```

---

### 📄 文件 7：`src/components/common/PageHero.tsx`

**优先级：P1 — 每个内页顶部的标题区域**

**目标**：移除 `border-b`（贯穿式横线），改用底部渐变淡出+细微背景渐变。

```tsx
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '~/components/ui/utils';

interface PageHeroProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradientClassName?: string;
  descriptionClassName?: string;
}

export function PageHero({
  title,
  description,
  icon: Icon,
  gradientClassName,
  descriptionClassName = 'text-muted-foreground',
}: PageHeroProps) {
  return (
    // 移除 border-b，改用底部渐变 + 极轻背景
    <div className="relative bg-background overflow-hidden">
      {/* 右上角 AI 蓝光晕装饰（极淡，仅 dark mode 明显） */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 right-0 h-40 w-64
                   bg-gradient-to-bl from-primary/8 via-primary/3 to-transparent
                   dark:from-primary/12 dark:via-primary/5 rounded-full blur-2xl"
      />
      {/* 底部渐变淡出替代 border-b */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px
                   bg-gradient-to-r from-transparent via-border/30 to-transparent"
      />

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
      >
        <div className="flex items-start gap-3">
          {/* Icon 容器：AI 蓝背景 */}
          <div className="flex items-center justify-center w-10 h-10 rounded-xl
                          bg-primary/10 text-primary shrink-0
                          shadow-[0_0_0_1px_rgba(37,99,235,0.15)]">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl text-foreground">
              {title}
            </h1>
            <p className={cn(
              'mt-1 max-w-3xl text-sm leading-6 sm:text-base sm:leading-7',
              descriptionClassName
            )}>
              {description}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

---

### 📄 文件 8：`src/components/common/Footer.tsx`

**优先级：P1 — 移除 border-t 贯穿横线**

**目标**：将 `border-t border-slate-200` 全部替换为渐变淡出或透明分隔；整体背景改为更融合的玻璃色。

```tsx
import { Link } from 'react-router-dom';
import { useLanguage } from '~/contexts/LanguageContext';

export function Footer() {
  const { t, language } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-muted/30 backdrop-blur-sm overflow-hidden">
      {/* 顶部渐变分隔（替代 border-t） */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px
                   bg-gradient-to-r from-transparent via-border/40 to-transparent"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Footer 内容网格 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* 产品 */}
          <div>
            <h3 className="text-foreground font-semibold text-sm mb-4 tracking-wide uppercase opacity-70">
              {t('products') || '产品'}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/news-push"
                  className="text-muted-foreground hover:text-primary transition-colors duration-150">
                  {t('newsPush') || '新闻推送'}
                </Link>
              </li>
              <li>
                <Link to="/news-data"
                  className="text-muted-foreground hover:text-primary transition-colors duration-150">
                  {t('newsDatabase') || '新闻数据库'}
                </Link>
              </li>
              <li>
                <Link to="/targeted-tracking"
                  className="text-muted-foreground hover:text-primary transition-colors duration-150">
                  {t('targetedTracking') || '定向跟踪'}
                </Link>
              </li>
            </ul>
          </div>

          {/* 关于 */}
          <div>
            <h3 className="text-foreground font-semibold text-sm mb-4 tracking-wide uppercase opacity-70">
              {t('aboutUs') || '关于我们'}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-150">{t('companyProfile') || '公司简介'}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-150">{t('news') || '新闻'}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-150">{t('careers') || '招聘'}</a></li>
            </ul>
          </div>

          {/* 资源 */}
          <div>
            <h3 className="text-foreground font-semibold text-sm mb-4 tracking-wide uppercase opacity-70">
              {t('resources') || '资源'}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-150">{t('documentation') || '文档'}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-150">{t('support') || '支持'}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-150">{t('blog') || '博客'}</a></li>
            </ul>
          </div>

          {/* 法律 */}
          <div>
            <h3 className="text-foreground font-semibold text-sm mb-4 tracking-wide uppercase opacity-70">
              {t('legal') || '法律'}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors duration-150">
                  {t('privacyPolicy') || '隐私政策'}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors duration-150">
                  {t('termsOfService') || '服务条款'}
                </Link>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-150">
                  {t('cookiePolicy') || 'Cookie政策'}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 底部版权 — 用间距和透明度区分，不用横线 */}
        <div className="pt-6 opacity-90">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground/70 text-xs">
              © {currentYear} {t('appName') || 'AI News'}{' '}
              {t('allRightsReserved') || 'All rights reserved.'}
            </p>
            <div className="flex gap-5">
              {(['Twitter', 'GitHub', 'LinkedIn'] as const).map((platform) => (
                <a key={platform} href="#"
                   className="text-muted-foreground/60 hover:text-primary transition-colors duration-150 text-xs">
                  {platform}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

---

### 📄 文件 9：`src/pages/auth/Login.tsx`

**优先级：P2 — 关键转化页面**

**仅修改 JSX 视觉部分**，不改动任何业务逻辑。具体改动点：

#### 9.1 移除"或"分隔线（贯穿横线）

**找到以下代码块并替换**：

```tsx
// 旧代码（删除）：
<div className="relative">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-card px-2 text-muted-foreground">{t('orUseFollowing')}</span>
  </div>
</div>

// 新代码（替换）：
<div className="flex items-center gap-3">
  {/* 渐变淡出线（代替贯穿横线） */}
  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border/40" />
  <span className="text-xs text-muted-foreground/60 whitespace-nowrap px-1 font-medium">
    {t('orUseFollowing')}
  </span>
  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border/40" />
</div>
```

#### 9.2 调整卡片容器背景

**找到 `<Card>` 的 className 并替换**：

```tsx
// 旧代码：
<Card className="w-full max-w-md border border-border">

// 新代码：
<Card className="w-full max-w-md border-border/50 backdrop-blur-xl">
```

#### 9.3 主登录按钮强调

**找到登录按钮并替换 variant**：

```tsx
// 旧代码：
<Button
  onClick={handleEmailLogin}
  className="w-full h-11 sm:h-12 font-semibold text-sm sm:text-base"
  disabled={!email || !password || isLoading}
>

// 新代码（添加 AI 蓝发光）：
<Button
  onClick={handleEmailLogin}
  className="w-full h-11 sm:h-12 font-semibold text-sm sm:text-base
             shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_28px_rgba(37,99,235,0.5)]"
  disabled={!email || !password || isLoading}
>
```

---

### 📄 文件 10：`src/pages/auth/Register.tsx`

**优先级：P2 — 与 Login 保持一致**

与 `Login.tsx` 相同的改动模式：

1. **移除"或"分隔横线** — 同 Login 9.1 的方式处理
2. **Card 容器** — 同 Login 9.2
3. **注册主按钮**（提交按钮）— 添加同样的 AI 蓝发光阴影

**找到注册提交按钮并添加**：
```tsx
className="w-full h-11 sm:h-12 font-semibold text-sm sm:text-base
           shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_28px_rgba(37,99,235,0.5)]"
```

---

### 📄 文件 11：`src/pages/landing/Landing.tsx`

**优先级：P2 — 对外展示的核心页面**

#### 11.1 Hero 区域主 CTA 按钮

**找到"立即登录"按钮并改用 `ai-cta` variant**：

```tsx
// 旧代码：
<Button
  size="lg"
  onClick={() => navigate('/login')}
  className="px-8 h-12 text-base font-semibold"
>
  {language === 'zh-CN' ? '立即登录' : 'Login Now'}
</Button>

// 新代码：
<Button
  variant="ai-cta"
  size="lg"
  onClick={() => navigate('/login')}
  className="px-8 h-12 text-base font-semibold"
>
  {language === 'zh-CN' ? '立即登录' : 'Login Now'}
</Button>
```

#### 11.2 移除 Section 间的贯穿横线

在 `Landing.tsx` 中搜索所有 `border-t`、`border-b` 作为 section 分隔的用法，替换方式：

```tsx
// 旧：section 之间用 <hr> 或 border-t 分隔
<div className="border-t border-border/40" />

// 新：用渐变替代，视觉上更柔和
<div className="h-px w-3/4 mx-auto bg-gradient-to-r from-transparent via-border/30 to-transparent" />
```

#### 11.3 Feature 卡片 Icon 增加 AI 蓝点缀

**找到 Feature 卡片 icon 容器并增强**：

```tsx
// 旧：
<div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mb-4 text-primary">
  <Icon className="w-6 h-6" />
</div>

// 新（增加光晕环）：
<div className="flex items-center justify-center w-12 h-12 rounded-xl mb-4
                bg-primary/10 text-primary
                shadow-[0_0_0_1px_rgba(37,99,235,0.15),_0_2px_12px_rgba(37,99,235,0.12)]
                group-hover:shadow-[0_0_0_1px_rgba(37,99,235,0.3),_0_4px_20px_rgba(37,99,235,0.2)]
                transition-shadow duration-200">
  <Icon className="w-6 h-6" />
</div>
```

---

### 📄 文件 12：`src/pages/home/Home.tsx`

**优先级：P3 — 内页首屏**

#### 12.1 产品卡片 Icon 容器增强

同 Landing 11.3 的 Icon 容器增强方式，对 `Home.tsx` 中的产品卡片 icon 容器做相同修改。

#### 12.2 "进入"按钮改为有 primary 颜色的 ghost

**找到"进入/Enter"按钮**：

```tsx
// 旧：
<Button
  variant="ghost"
  size="sm"
  className="inline-flex items-center gap-1 text-primary font-medium text-sm px-0 group-hover:gap-2 transition-all"
>

// 新（增加 hover 时的发光效果）：
<Button
  variant="ghost"
  size="sm"
  className="inline-flex items-center gap-1 text-primary font-medium text-sm px-0
             group-hover:gap-2 group-hover:text-primary/90 transition-all duration-200"
>
```

---

### 📄 文件 13：`src/components/TopNavigation.tsx`

**优先级：P3 — 应用内导航（已经较好，微调）**

#### 修改点：`active` 状态按钮的 AI 蓝更加明显

**找到 isActive 的 className 并增强**：

```tsx
// 旧：
isActive
  ? 'bg-primary/10 text-primary shadow-[0_0_0_1px_rgba(37,99,235,0.35)]'
  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'

// 新（active 更明显，inactive hover 更轻）：
isActive
  ? [
      'bg-primary/12 text-primary',
      'shadow-[0_0_0_1px_rgba(37,99,235,0.3),_0_2px_12px_rgba(37,99,235,0.15)]',
    ].join(' ')
  : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/40'
```

---

## 3. 全局搜索替换清单

在完成上述文件修改后，对整个 `src/` 目录执行以下搜索替换，消除遗留的贯穿横线：

### 3.1 移除贯穿式 border-b / border-t

使用 IDE 全局搜索（支持正则），逐一排查以下模式：

| 搜索关键词 | 处置方式 |
|-----------|---------|
| `border-t border-slate-200` | 删除，或改为渐变 `section-divider` 类 |
| `border-b border-slate-200` | 同上 |
| `border-t border-border` | 检查是否为页面分隔线，是则替换渐变 |
| `border-b border-border` | 同上 |
| `<span className="w-full border-t"` | 见 Login 9.1 的替换方案 |
| `[.border-b]:pb-6` | 已在 CardHeader 中删除 |
| `[.border-t]:pt-6` | 已在 CardFooter 中删除 |

**重要例外**（保留 border）：
- `border border-border/50` — Card/Input 的边框描边，**不是贯穿横线**，保留
- `border-b-2 border-primary` — Tab 下划线指示器，保留
- 表格 (`<table>`) 内的行分隔线，保留

### 3.2 替换遗留的 Separator 用法

搜索 `<Separator` 的使用位置，确认是否为视觉分隔目的（非数据表格）。如果是布局分隔，可直接删除，改用 `py-4`（增加垂直间距）替代视觉效果。

---

## 4. 关键按钮高亮规范

以下按钮需要明确使用 AI 蓝点缀，禁止使用无色/灰色方案：

| 位置 | 按钮文案 | 推荐 variant | 额外 className |
|------|---------|-------------|----------------|
| Landing Hero | 立即登录 / Login Now | `ai-cta` | `px-8 h-12` |
| Landing Hero | 免费注册 / Free Register | `outline` | `px-8 h-12` |
| Login 表单 | 登录 / Login | `default` | 添加发光 shadow |
| Register 表单 | 注册 / Register | `default` | 添加发光 shadow |
| Home 产品卡片 | 进入 / Enter | `ghost` | `text-primary` |
| TopNavigation | 注册按钮 | `default` | 保持发光 shadow |
| 所有模态框 | 确认/主要操作 | `default` | 发光 shadow |
| 所有模态框 | 取消/次要操作 | `outline` 或 `ghost` | 无特殊 |

---

## 5. 暗色模式注意事项

### 5.1 深色背景的玻璃卡片

在 `.dark` 模式下，Card 的 `backdrop-blur` 需要有足够暗的底色才能生效：

```tsx
// 确保 Card 的父容器背景足够暗
// 在 dark mode 下 bg-background 是 #0c0e14，足够暗，无需额外处理
```

### 5.2 主色按钮在暗色下的可见性

`--primary: #4d9fff`（明亮 AI 蓝）已在 dark mode 中设置，发光阴影颜色需要使用 CSS 变量以适配两种模式：

对于内联 Tailwind `shadow-[]` 中的颜色，推荐在关键位置使用以下统一类：

```tsx
// 适用于 dark/light 两用 AI 发光效果的按钮
className="shadow-[0_0_20px_var(--primary-glow)] hover:shadow-[0_0_28px_var(--primary-glow)]"
```

---

## 6. 执行顺序 & 验证清单

### 建议执行顺序

```
Step 1: tailwind.config.js         ← 颜色系统基础
Step 2: src/styles/globals.css     ← CSS 变量和全局工具类
Step 3: src/components/ui/button.tsx
Step 4: src/components/ui/card.tsx
Step 5: src/components/ui/input.tsx
Step 6: src/components/ui/separator.tsx
Step 7: src/components/common/PageHero.tsx
Step 8: src/components/common/Footer.tsx
Step 9: src/pages/auth/Login.tsx
Step 10: src/pages/auth/Register.tsx
Step 11: src/pages/landing/Landing.tsx
Step 12: src/pages/home/Home.tsx
Step 13: src/components/TopNavigation.tsx
Step 14: 全局搜索替换（Section 3）
```

### 每步验证清单

- [ ] `npm run build` 无 TypeScript 报错
- [ ] Light mode 截图：卡片有玻璃感，按钮 AI 蓝清晰
- [ ] Dark mode 截图：背景够深，发光效果可见
- [ ] 无贯穿全屏的 `border-t` / `border-b` 横线
- [ ] Landing Hero 主按钮有发光效果
- [ ] Login 表单"或"分隔改为渐变样式
- [ ] Footer 无 `border-t` 横线
- [ ] PageHero 无 `border-b` 横线

---

## 7. 参考截图说明

参考站点 [AI Chatbot Platform](https://ui-ux-pro-max-skill.nextlevelbuilder.io/demo/ai-chatbot-platform) 的核心设计特征：

- **导航栏**：悬浮胶囊型，`backdrop-blur` 背景，无下划线分隔 ✅（项目已实现）
- **卡片**：纯玻璃感，极细描边，无厚重阴影 → 本次优化目标
- **按钮**：Primary 有明显发光效果 → 本次优化目标
- **分隔**：Section 间无横线，靠间距和背景渐变区分 → 本次优化目标
- **色调**：深色背景近纯黑，主色用明亮 AI 蓝 → 本次 dark mode 优化目标

---

## 8. 禁止事项

> Codex 在执行时必须遵守以下限制：

1. ❌ **禁止修改任何 API 调用逻辑**（`src/api/` 目录下所有文件）
2. ❌ **禁止修改路由配置**（`App.tsx` 中的 `<Routes>` 结构）
3. ❌ **禁止修改国际化翻译内容**（`t()` 调用的 key 和 `LanguageContext`）
4. ❌ **禁止引入新 npm 包**（不得修改 `package.json`）
5. ❌ **禁止修改业务状态逻辑**（`useState`、`useEffect`、事件处理函数）
6. ❌ **禁止删除 `motion.div` 动画包装器**（保留现有 Framer Motion 动画）
7. ❌ **禁止修改 TypeScript 类型定义**（`src/types/` 目录）
8. ❌ **不得将 Card 的 `border` 完全删除** — 保留轻描边，只是降低不透明度

---

*文档结束 — 共 8 个章节，14 个文件修改指引*
