"""FastAPI主应用"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from .routers import documents_router, questions_router, tests_router
from .routers.sessions import router as sessions_router
from .routers.stats import router as stats_router
from .config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="复习资料测试系统 - Python后端API"
)

# CORS配置
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# 从环境变量添加额外允许的域名
import os
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    allowed_origins.extend([origin.strip() for origin in cors_origins_env.split(",") if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(documents_router, prefix="/api")
app.include_router(questions_router, prefix="/api")
app.include_router(tests_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(stats_router, prefix="/api")


@app.get("/")
async def root():
    """根路径"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@app.get("/api/providers")
async def list_providers():
    """可用的LLM Provider列表"""
    return {
        "providers": [
            {"name": "openai", "label": "OpenAI", "models": ["gpt-3.5-turbo", "gpt-4"]},
            {"name": "anthropic", "label": "Anthropic Claude", "models": ["claude-3-5-sonnet-20241022"]},
            {"name": "deepseek", "label": "DeepSeek", "models": ["deepseek-chat"]},
            {"name": "zhipu", "label": "智谱 GLM", "models": ["glm-4"]},
            {"name": "ollama", "label": "Ollama (本地)", "models": ["llama2", "llama3", "qwen"]}
        ],
        "default": settings.LLM_PROVIDER
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)