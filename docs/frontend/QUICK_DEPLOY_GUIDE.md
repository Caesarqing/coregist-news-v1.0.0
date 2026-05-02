# 快速部署指南 - coregist-news.com

## 最简单的方案：使用 Vercel（推荐）

### 步骤 1：准备工作
```bash
# 确保代码已提交到 GitHub
git add .
git commit -m "准备部署到 coregist-news.com"
git push origin main
```

### 步骤 2：部署到 Vercel

1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "Import Project"
4. 选择你的 GitHub 仓库
5. 配置构建设置（通常自动检测）：
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. 点击 "Deploy"

### 步骤 3：添加自定义域名

1. 在 Vercel 项目设置中，找到 "Domains"
2. 添加域名：`coregist-news.com`
3. 添加域名：`www.coregist-news.com`
4. Vercel 会显示需要配置的 DNS 记录

### 步骤 4：配置 DNS

在你的域名注册商（如阿里云、腾讯云、GoDaddy）的 DNS 管理面板中添加：

```
类型    名称    值                      TTL
A       @       76.76.21.21            3600
CNAME   www     cname.vercel-dns.com   3600
```

### 步骤 5：等待生效

- DNS 传播通常需要 5-30 分钟
- 访问 https://coregist-news.com 验证

## 方案二：使用 Netlify

### 步骤 1：部署到 Netlify

1. 访问 [netlify.com](https://netlify.com)
2. 使用 GitHub 账号登录
3. 点击 "New site from Git"
4. 选择你的 GitHub 仓库
5. 配置构建设置：
   - Build command: `npm run build`
   - Publish directory: `dist`
6. 点击 "Deploy site"

### 步骤 2：添加自定义域名

1. 在 Netlify 项目设置中，找到 "Domain management"
2. 点击 "Add custom domain"
3. 输入：`coregist-news.com`
4. 按照提示配置 DNS

### 步骤 3：配置 DNS

```
类型    名称    值                          TTL
A       @       75.2.60.5                  3600
CNAME   www     your-site.netlify.app      3600
```

## 方案三：使用自己的服务器

### 前提条件
- 一台 Linux 服务器（Ubuntu/CentOS）
- 已安装 Nginx
- 已安装 Node.js

### 步骤 1：构建项目

```bash
# 在本地构建
npm run build

# 或在服务器上构建
git clone your-repo-url
cd your-project
npm install
npm run build
```

### 步骤 2：上传到服务器

```bash
# 使用 rsync 上传
rsync -avz --delete dist/ user@your-server:/var/www/coregist-news.com/

# 或使用 scp
scp -r dist/* user@your-server:/var/www/coregist-news.com/
```

### 步骤 3：配置 Nginx

```bash
# 复制配置文件
sudo cp nginx.conf.example /etc/nginx/sites-available/coregist-news.com

# 创建符号链接
sudo ln -s /etc/nginx/sites-available/coregist-news.com /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载
sudo systemctl reload nginx
```

### 步骤 4：安装 SSL 证书

```bash
# 安装 Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d coregist-news.com -d www.coregist-news.com

# 测试自动续期
sudo certbot renew --dry-run
```

### 步骤 5：配置 DNS

```
类型    名称    值                      TTL
A       @       your-server-ip         3600
A       www     your-server-ip         3600
```

## 使用 Cloudflare（推荐用于 CDN 和安全）

### 步骤 1：添加网站到 Cloudflare

1. 访问 [cloudflare.com](https://cloudflare.com)
2. 注册/登录账号
3. 点击 "Add a Site"
4. 输入：`coregist-news.com`
5. 选择免费计划

### 步骤 2：更改 DNS 服务器

Cloudflare 会提供两个 nameserver，例如：
```
ns1.cloudflare.com
ns2.cloudflare.com
```

在你的域名注册商处，将 DNS 服务器改为 Cloudflare 提供的 nameserver。

### 步骤 3：配置 DNS 记录

在 Cloudflare DNS 管理面板中添加：

```
类型    名称    值                      代理状态
A       @       your-server-ip         已代理（橙色云朵）
CNAME   www     coregist-news.com      已代理（橙色云朵）
```

### 步骤 4：配置 SSL/TLS

1. 在 Cloudflare 面板中，进入 "SSL/TLS"
2. 选择 "Full" 或 "Full (strict)" 模式
3. 启用 "Always Use HTTPS"
4. 启用 "Automatic HTTPS Rewrites"

### 步骤 5：优化设置

1. 启用 "Auto Minify"（CSS, JS, HTML）
2. 启用 "Brotli" 压缩
3. 配置缓存规则
4. 启用 "Rocket Loader"（可选）

## 验证部署

### 1. 检查 DNS

```bash
# 检查 A 记录
dig coregist-news.com A

# 检查 CNAME 记录
dig www.coregist-news.com CNAME

# 在线检查 DNS 传播
# 访问：https://dnschecker.org
```

### 2. 检查 SSL

```bash
# 命令行检查
openssl s_client -connect coregist-news.com:443 -servername coregist-news.com

# 在线检查
# 访问：https://www.ssllabs.com/ssltest/
```

### 3. 测试网站

- [ ] 访问 http://coregist-news.com（应重定向到 HTTPS）
- [ ] 访问 https://coregist-news.com
- [ ] 访问 https://www.coregist-news.com
- [ ] 测试所有页面路由
- [ ] 测试刷新页面（不应出现 404）
- [ ] 测试移动端访问
- [ ] 检查控制台是否有错误

## 常见问题排查

### DNS 未生效

```bash
# 清除本地 DNS 缓存
# Windows
ipconfig /flushdns

# macOS
sudo dscacheutil -flushcache

# Linux
sudo systemd-resolve --flush-caches
```

### 404 错误（刷新页面）

检查以下配置：
- Vercel: `vercel.json` 中的 routes 配置
- Netlify: `netlify.toml` 或 `_redirects` 文件
- Nginx: `try_files` 配置

### SSL 证书错误

```bash
# 检查证书有效期
openssl x509 -in /etc/letsencrypt/live/coregist-news.com/fullchain.pem -noout -dates

# 手动续期
sudo certbot renew
```

## 性能测试

部署完成后，使用以下工具测试性能：

1. **Google PageSpeed Insights**
   - https://pagespeed.web.dev/

2. **GTmetrix**
   - https://gtmetrix.com/

3. **WebPageTest**
   - https://www.webpagetest.org/

## 监控设置

### 1. 网站可用性监控

推荐工具：
- UptimeRobot（免费）
- Pingdom
- StatusCake

### 2. 错误监控

推荐工具：
- Sentry（前端错误追踪）
- LogRocket（用户会话回放）

### 3. 分析工具

- Google Analytics
- Plausible（隐私友好）
- Umami（开源）

## 自动部署（CI/CD）

### GitHub Actions 示例

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        vercel-args: '--prod'
```

## 下一步

1. [ ] 选择部署平台
2. [ ] 配置 DNS
3. [ ] 等待 DNS 生效
4. [ ] 验证网站访问
5. [ ] 配置监控
6. [ ] 优化性能
7. [ ] 设置备份策略

## 需要帮助？

如果遇到问题，请检查：
1. DNS 是否正确配置
2. SSL 证书是否有效
3. 服务器/平台日志
4. 浏览器控制台错误
5. 网络连接是否正常
