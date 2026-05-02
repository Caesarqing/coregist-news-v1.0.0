# 数据中心页面悬浮效果修复

## 问题描述

在数据中心页面中，"总数据库"和"今日更新"两个卡片的悬浮效果与"我的空间"卡片不一致。鼠标移动到这两个卡片上时，只有中间一部分有悬浮效果，而不是整个框都有弹簧式悬浮效果。

## 根本原因

"总数据库"和"今日更新"使用了嵌套的结构：

```tsx
<button className="...">
  <Card className="border-0 bg-transparent shadow-none">
    <CardContent className="p-4 sm:p-5">
      {/* 内容 */}
    </CardContent>
  </Card>
</button>
```

这种嵌套结构导致：
1. 外层 `<button>` 有边框和背景色
2. 内层 `<Card>` 和 `<CardContent>` 添加了额外的 padding
3. 悬浮效果只应用在内层，而不是整个按钮区域
4. 视觉上看起来只有中间部分在悬浮

而"我的空间"卡片直接在 `<button>` 上应用所有样式，没有嵌套 Card 组件。

## 修复方案

### 文件：`src/pages/products/NewsData.tsx`

#### 修改前结构：
```tsx
<button className="...">
  <Card className="border-0 bg-transparent shadow-none">
    <CardContent className="p-4 sm:p-5">
      <p>总数据库</p>
      <p>{newsItems.length}</p>
    </CardContent>
  </Card>
</button>
```

#### 修改后结构：
```tsx
<button className="... p-4 sm:p-5">
  <p>总数据库</p>
  <p>{newsItems.length}</p>
</button>
```

### 关键改动：

1. **移除嵌套的 Card 组件**
   - 删除 `<Card>` 和 `<CardContent>` 包装
   - 直接在 `<button>` 内放置内容

2. **将 padding 移到 button 上**
   - 从 `<CardContent className="p-4 sm:p-5">` 
   - 移到 `<button className="... p-4 sm:p-5">`

3. **保持所有其他样式不变**
   - 边框、背景色、过渡效果等都保持原样
   - 只是改变了 DOM 结构

## 修改后的效果

现在三个卡片的结构完全一致：

### 总数据库：
```tsx
<button className="lg:col-span-3 rounded-2xl border-2 text-left transition-all duration-200 p-4 sm:p-5 ...">
  <p>总数据库</p>
  <p>{newsItems.length}</p>
</button>
```

### 今日更新：
```tsx
<button className="lg:col-span-3 rounded-2xl border-2 text-left transition-all duration-200 p-4 sm:p-5 ...">
  <p>今日更新</p>
  <p>{todayCount}</p>
</button>
```

### 我的空间：
```tsx
<button className="lg:col-span-6 rounded-2xl border-2 ... transition-all duration-200">
  <div className="p-5 sm:p-6 ...">
    <p>我的空间</p>
    <p>{mySpaceIds.length}</p>
  </div>
</button>
```

## 视觉效果改进

修复后，所有三个卡片都具有一致的悬浮效果：

1. **整体悬浮**：鼠标移动到卡片上时，整个卡片区域都会响应
2. **边框变化**：`hover:border-primary/40`
3. **背景变化**：`hover:bg-primary/5`
4. **平滑过渡**：`transition-all duration-200`

## 技术细节

### 统一的样式规格：
- 圆角：`rounded-2xl`
- 边框：`border-2`
- 文本对齐：`text-left`
- 过渡效果：`transition-all duration-200`
- 内边距：`p-4 sm:p-5`（移动端 16px，桌面端 20px）

### 响应式布局：
- 移动端：每个卡片占满整行
- 桌面端：
  - 总数据库：3列（lg:col-span-3）
  - 今日更新：3列（lg:col-span-3）
  - 我的空间：6列（lg:col-span-6）

## 验证

修复后应该验证：
1. 鼠标悬停时整个卡片都有响应
2. 边框颜色变化平滑
3. 背景色变化平滑
4. 三个卡片的悬浮效果一致
5. 点击功能正常
6. 响应式布局正常
