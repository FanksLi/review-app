FROM python:3.11-slim

WORKDIR /app

# 安装最小依赖（大部分 Python 包有预编译版本）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY app ./app

# 创建数据目录
RUN mkdir -p /app/data/chroma /app/data/uploads /app/db

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]