# 新闻推送页面样式更新

## 修改概述

已将"我的新闻"页面中的新闻列表按钮样式改为与"我的数据"页面一致。

## 主要修改

### 文件：`src/pages/products/NewsPush.tsx`

#### 1. 导入图标
添加了 `Eye` 和 `Trash2` 图标：
```typescript
import { Zap, Clock, TrendingUp, X, Calendar, Grid, List, Hash, CheckCircle2, ArrowRight, ArrowLeft, Eye, Trash2 } from 'lucide-react';
```

#### 2. 列表视图按钮样式更新
- 将按钮从 `variant="ghost"` 改为 `variant="outline"`
- 添加了图标：`Eye`（查看新闻）和 `Trash2`（删除）
- 改为垂直排列（`flex-col`）以匹配"我的数据"页面的布局
- 统一了圆角样式（`rounded-lg`）
- 添加了边框样式（`border-slate-200` 和 `border-red-200`）

#### 3. 网格视图按钮样式更新
- 同样的样式更新应用到网格视图
- 保持按钮垂直排列
- 添加相同的图标和样式

## 样式对比

### 修改前：
- 使用 `variant="ghost"` 按钮（透明背景）
- 无图标
- 水平排列
- 仅通过文字颜色区分按钮类型

### 修改后：
- 使用 `variant="outline"` 按钮（带边框）
- 添加了 `Eye` 和 `Trash2` 图标
- 垂直排列（与"我的数据"页面一致）
- 清晰的视觉层次和边框样式
- 删除按钮使用红色主题（`border-red-200 text-red-600 hover:bg-red-50`）

## 用户体验改进

1. **视觉一致性**：两个页面的按钮样式现在完全一致
2. **更清晰的操作提示**：图标使按钮功能更直观
3. **更好的可点击性**：outline 样式的按钮更容易识别为可交互元素
4. **更好的视觉层次**：垂直排列使操作按钮更清晰
