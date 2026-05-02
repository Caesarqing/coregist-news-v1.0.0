# 域名绑定配置指南

## 域名信息
- 目标域名：`coregist-news.com`
- 项目名称：AI News Assistant

## 配置步骤

### 1. DNS 配置（在域名注册商处）

您需要在域名注册商（如 GoDaddy、Namecheap、阿里云、腾讯云等）的 DNS 管理面板中添加以下记录：

#### 如果使用传统服务器部署：

```
类型    名称    值                      TTL
A       @       your-server-ip         3600
A       www     your-server-ip         3600
```

#### 如果使用 Vercel 部署：

```
类型      名称    值                          TTL
A         @       76.76.21.21                3600
CNAME     www     cname.vercel-dns.com       3600
```

#### 如果使用 Netlify 部署：

```
类型      名称    值                          TTL
A         @       75.2.60.5                  3600
CNAME     www     your-site.netlify.app      3600
```

#### 如果使用 Cloudflare Pages：

```
类型      名称    值                          TTL
CNAME     @       your-project.pages.dev     Auto
CNAME     www     your-project.pages.dev     Auto
```

### 2. 项目配置文件

#### 2.1 创建 `public/CNAME` 文件（用于 GitHub Pages）

如果使用 GitHub Pages 部署，需要创建此文件：

```
coregist-news.com
```

#### 2.2 创建 `vercel.json`（用于 Vercel 部署）

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

#### 2.3 创建 `netlify.toml`（用于 Netlify 部署）

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

#### 2.4 创建 `_redirects` 文件（Netlify 备用方案）

在 `public/_redirects` 文件中添加：

```
/*    /index.html   200
```

### 3. Nginx 配置（如果使用自己的服务器）

创建 `/etc/nginx/sites-available/coregist-news.com` 配置文件：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name coregist-news.com www.coregist-news.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name coregist-news.com www.coregist-news.com;

    # SSL 证书配置（使用 Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/coregist-news.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/coregist-news.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 网站根目录
    root /var/www/coregist-news.com/dist;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # 安全头
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # SPA 路由配置
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/coregist-news.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL 证书配置

#### 使用 Let's Encrypt（免费）

```bash
# 安装 Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d coregist-news.com -d www.coregist-news.com

# 自动续期
sudo certbot renew --dry-run
```

#### 使用 Cloudflare（推荐）

1. 将域名 DNS 托管到 Cloudflare
2. 在 Cloudflare 面板中启用 SSL/TLS（Full 或 Full (strict) 模式）
3. 自动获得免费的 SSL 证书和 CDN 加速

### 5. 环境变量配置

创建 `.env.production` 文件：

```env
VITE_APP_NAME=AI News Assistant
VITE_APP_DOMAIN=coregist-news.com
VITE_API_BASE_URL=https://api.coregist-news.com
VITE_APP_URL=https://coregist-news.com
```

### 6. 更新 package.json

添加部署脚本：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy:vercel": "vercel --prod",
    "deploy:netlify": "netlify deploy --prod",
    "deploy:server": "npm run build && rsync -avz --delete dist/ user@server:/var/www/coregist-news.com/"
  }
}
```

### 7. 更新 vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    open: true,
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
        }
      }
    }
  },
  base: '/' // 确保使用根路径
});
```

## 部署方案对比

### Vercel（推荐 - 最简单）

**优点：**
- 自动 HTTPS
- 全球 CDN
- 自动部署（Git 集成）
- 零配置

**步骤：**
1. 在 Vercel 导入 GitHub 仓库
2. 在 Vercel 项目设置中添加自定义域名 `coregist-news.com`
3. 按照 Vercel 提示配置 DNS
4. 等待 DNS 生效（通常 5-30 分钟）

### Netlify

**优点：**
- 自动 HTTPS
- 全球 CDN
- 表单处理
- 函数支持

**步骤：**
1. 在 Netlify 导入 GitHub 仓库
2. 在 Netlify 项目设置中添加自定义域名
3. 配置 DNS
4. 等待生效

### 自己的服务器

**优点：**
- 完全控制
- 可以运行后端服务
- 成本可控

**步骤：**
1. 配置 Nginx
2. 安装 SSL 证书
3. 部署构建文件
4. 配置 DNS

### Cloudflare Pages

**优点：**
- 免费 CDN
- DDoS 防护
- 分析工具
- 无限带宽

**步骤：**
1. 连接 GitHub 仓库
2. 配置构建设置
3. 添加自定义域名
4. 自动配置 DNS

## 验证步骤

### 1. DNS 验证

```bash
# 检查 A 记录
dig coregist-news.com A

# 检查 CNAME 记录
dig www.coregist-news.com CNAME

# 检查 DNS 传播
https://dnschecker.org
```

### 2. SSL 证书验证

```bash
# 检查 SSL 证书
openssl s_client -connect coregist-news.com:443 -servername coregist-news.com

# 在线检查
https://www.ssllabs.com/ssltest/
```

### 3. 网站访问测试

- 访问 `http://coregist-news.com`（应该重定向到 HTTPS）
- 访问 `https://coregist-news.com`（主域名）
- 访问 `https://www.coregist-news.com`（www 子域名）
- 测试所有路由是否正常工作

## 常见问题

### DNS 未生效

**原因：** DNS 传播需要时间（5分钟到48小时）

**解决：**
- 等待 DNS 传播完成
- 清除本地 DNS 缓存：`ipconfig /flushdns`（Windows）或 `sudo dscacheutil -flushcache`（Mac）
- 使用 `8.8.8.8` 或 `1.1.1.1` 等公共 DNS 测试

### SSL 证书错误

**原因：** 证书未正确配置或域名不匹配

**解决：**
- 确保证书包含所有域名（主域名和 www）
- 检查证书是否过期
- 重新生成证书

### 404 错误（刷新页面）

**原因：** SPA 路由未正确配置

**解决：**
- 确保服务器配置了 fallback 到 `index.html`
- 检查 Nginx 的 `try_files` 配置
- 检查 Vercel/Netlify 的重定向规则

### CORS 错误

**原因：** API 服务器未配置正确的 CORS 头

**解决：**
- 在 API 服务器添加 CORS 头
- 允许来自 `coregist-news.com` 的请求

## 性能优化建议

1. **启用 CDN**：使用 Cloudflare 或其他 CDN 服务
2. **启用 Gzip/Brotli 压缩**
3. **配置缓存策略**：静态资源长期缓存
4. **使用 HTTP/2**
5. **优化图片**：使用 WebP 格式，懒加载
6. **代码分割**：已在 vite.config.ts 中配置
7. **预加载关键资源**

## 监控和维护

1. **设置 SSL 证书自动续期**
2. **配置网站监控**（如 UptimeRobot）
3. **设置错误日志收集**（如 Sentry）
4. **定期备份**
5. **监控性能指标**（如 Google Analytics、Lighthouse）

## 安全检查清单

- [ ] HTTPS 已启用
- [ ] SSL 证书有效且自动续期
- [ ] 安全头已配置（X-Frame-Options, CSP 等）
- [ ] 隐藏文件无法访问
- [ ] 敏感信息不在前端代码中
- [ ] API 密钥使用环境变量
- [ ] 启用 CORS 保护
- [ ] 配置 DDoS 防护（如 Cloudflare）

## 下一步

1. 选择部署平台（推荐 Vercel）
2. 配置 DNS 记录
3. 等待 DNS 生效
4. 验证网站访问
5. 配置监控和分析
6. 优化性能
