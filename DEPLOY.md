# 阿里云服务器部署指南

## 一、服务器准备

### 1.1 连接服务器
```bash
ssh root@your_server_ip
```

### 1.2 安装 Docker 和 Docker Compose
```bash
# 更新包管理器
apt update && apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker 并设置开机自启
systemctl start docker
systemctl enable docker

# 安装 Docker Compose
apt install docker-compose -y

# 验证安装
docker --version
docker-compose --version
```

### 1.3 配置防火墙
```bash
# 开放必要端口（80、443）
ufw allow 80
ufw allow 443
ufw enable
```

阿里云控制台安全组也要放行：
- 入方向：80、443 端口

---

## 二、上传项目代码

### 方式一：Git 克隆（推荐）
```bash
# 在服务器上
cd /opt
git clone https://github.com/your-username/review-app.git
cd review-app
```

### 方式二：SCP 上传
```bash
# 在本地执行
scp -r D:/projects/learn/review-app root@your_server_ip:/opt/
```

---

## 三、配置环境变量

### 3.1 创建 .env 文件
```bash
cd /opt/review-app
vim .env
```

### 3.2 填写配置
```env
# LLM Provider（选择一个）
LLM_PROVIDER=deepseek

# DeepSeek（推荐，便宜）
DEEPSEEK_API_KEY=your_deepseek_api_key

# 或 OpenAI
# OPENAI_API_KEY=your_openai_api_key

# 或 智谱
# ZHIPU_API_KEY=your_zhipu_api_key

# CORS 允许的域名（多个用逗号分隔）
CORS_ORIGINS=http://your-domain.com,http://your_server_ip

# 如需使用 Ollama 本地模型
# OLLAMA_BASE_URL=http://host.docker.internal:11434
```

---

## 四、构建和启动

### 4.1 构建镜像
```bash
cd /opt/review-app
docker-compose build
```

### 4.2 启动服务
```bash
docker-compose up -d
```

### 4.3 查看状态
```bash
docker-compose ps
docker-compose logs -f
```

---

## 五、验证部署

### 5.1 检查服务状态
```bash
# 测试 backend
curl http://localhost/health

# 测试 documents API
curl http://localhost/api/documents/
```

### 5.2 访问前端
浏览器打开：`http://your_server_ip`

---

## 六、域名配置（可选）

### 6.1 域名解析
在域名服务商添加 A 记录：
- 主机记录：`@` 或 `www`
- 记录值：服务器 IP

### 6.2 HTTPS 证书（推荐）

#### 使用 Certbot 自动配置
```bash
# 安装 Certbot
apt install certbot python3-certbot-nginx -y

# 获取证书（nginx 容器需先启动）
# 先修改 nginx.conf 暴露 80 端口用于验证
certbot certonly --standalone -d your-domain.com

# 证书位置
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

#### 更新 nginx 配置支持 HTTPS
创建 `nginx/nginx-ssl.conf`：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location /health {
        proxy_pass http://backend:8000/health;
    }

    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 更新 docker-compose.yml
```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

#### 自动续期
```bash
# 测试续期
certbot renew --dry-run

# 添加定时任务
crontab -e
# 添加以下行
0 3 * * * certbot renew --quiet && docker-compose -f /opt/review-app/docker-compose.yml restart nginx
```

---

## 七、常用运维命令

### 查看日志
```bash
docker-compose logs -f nginx
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 重启服务
```bash
docker-compose restart
```

### 停止服务
```bash
docker-compose down
```

### 更新代码
```bash
git pull
docker-compose build
docker-compose up -d
```

### 备份数据
```bash
# 备份数据库和上传文件
tar -czf backup-$(date +%Y%m%d).tar.gz backend/data backend/db
```

---

## 八、故障排查

### 8.1 页面空白或 loading
```bash
# 检查容器状态
docker-compose ps

# 检查 nginx 日志
docker-compose logs nginx

# 检查 backend 是否正常
docker-compose logs backend
curl http://localhost/health
```

### 8.2 API 502 Bad Gateway
```bash
# backend 容器可能未启动或崩溃
docker-compose logs backend
docker-compose restart backend
```

### 8.3 CORS 错误
检查 `.env` 文件中的 `CORS_ORIGINS` 是否包含前端域名

### 8.4 文件上传失败
```bash
# 检查文件大小限制
# nginx.conf 中 client_max_body_size 已设为 20M
# backend config.py 中 MAX_FILE_SIZE 已设为 20MB
```

---

## 九、性能优化建议

### 9.1 启用 Gzip 压缩
在 `nginx/nginx.conf` 添加：
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
gzip_min_length 1000;
```

### 9.2 静态资源缓存
```nginx
location /_next/static/ {
    proxy_pass http://frontend:3000;
    proxy_cache_valid 200 365d;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

### 9.3 数据库优化
定期清理 FAISS 索引和 ChromaDB 数据

---

## 十、安全建议

1. **更换 SSH 端口**
   ```bash
   vim /etc/ssh/sshd_config
   # Port 22 改为其他端口
   systemctl restart sshd
   ```

2. **禁用 root 密码登录**（使用密钥登录）

3. **定期更新系统**
   ```bash
   apt update && apt upgrade -y
   ```

4. **配置 fail2ban 防暴力破解**
   ```bash
   apt install fail2ban -y
   ```

---

## 快速部署命令汇总

```bash
# 1. 连接服务器
ssh root@your_server_ip

# 2. 安装 Docker
curl -fsSL https://get.docker.com | sh && apt install docker-compose -y

# 3. 克隆代码
cd /opt && git clone https://github.com/your-username/review-app.git && cd review-app

# 4. 配置环境变量
vim .env

# 5. 构建并启动
docker-compose build && docker-compose up -d

# 6. 验证
curl http://localhost/health
```
