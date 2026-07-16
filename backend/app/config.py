"""配置管理"""

from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置"""

    # 应用
    APP_NAME: str = "Review App Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # LLM Provider配置
    LLM_PROVIDER: str = "deepseek"  # openai, anthropic, deepseek, zhipu, ollama

    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Anthropic
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"

    # DeepSeek
    DEEPSEEK_API_KEY: Optional[str] = None
    DEEPSEEK_MODEL: str = "deepseek-v4-pro"
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"

    # 智谱
    ZHIPU_API_KEY: Optional[str] = None
    ZHIPU_MODEL: str = "glm-4"
    ZHIPU_BASE_URL: str = "https://open.bigmodel.cn/api/paas/v4"

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama2"

    # Embedding
    EMBEDDING_PROVIDER: str = "openai"  # openai, local, qwen
    QWEN_API_KEY: Optional[str] = None
    QWEN_BASE_URL: Optional[str] = None
    QWEN_EMBEDDING_MODEL: str = "text-embedding-v3"

    # ChromaDB
    CHROMA_PERSIST_DIR: str = "data/chroma"
    CHROMA_COLLECTION_NAME: str = "documents"

    # 文件处理
    UPLOAD_DIR: str = "data/uploads"
    MAX_FILE_SIZE: int = 20 * 1024 * 1024  # 20MB
    ALLOWED_EXTENSIONS: list = ["pdf", "docx", "doc", "txt"]

    # 文本分段
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    # LLM调用
    LLM_TIMEOUT: int = 30
    LLM_MAX_RETRIES: int = 3
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 2000

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()