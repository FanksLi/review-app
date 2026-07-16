"""Provider工厂"""

from typing import Optional
from .base import BaseLLMProvider
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .deepseek_provider import DeepSeekProvider
from .zhipu_provider import ZhipuProvider
from .ollama_provider import OllamaProvider


def create_provider(
    provider_name: str,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    base_url: Optional[str] = None,
    **kwargs
) -> BaseLLMProvider:
    """创建LLM Provider实例

    Args:
        provider_name: Provider名称 (openai, anthropic, deepseek, zhipu, ollama)
        api_key: API密钥
        model: 模型名称
        base_url: API基础URL
        **kwargs: 其他配置参数

    Returns:
        Provider实例

    Raises:
        ValueError: 不支持的Provider或缺少必需参数
    """

    providers = {
        "openai": {
            "class": OpenAIProvider,
            "default_model": "gpt-3.5-turbo",
            "requires_key": True
        },
        "anthropic": {
            "class": AnthropicProvider,
            "default_model": "claude-3-5-sonnet-20241022",
            "requires_key": True
        },
        "deepseek": {
            "class": DeepSeekProvider,
            "default_model": "deepseek-chat",
            "requires_key": True,
            "default_base_url": "https://api.deepseek.com"
        },
        "zhipu": {
            "class": ZhipuProvider,
            "default_model": "glm-4",
            "requires_key": True
        },
        "ollama": {
            "class": OllamaProvider,
            "default_model": "llama2",
            "requires_key": False,
            "default_base_url": "http://localhost:11434"
        }
    }

    if provider_name not in providers:
        raise ValueError(f"不支持的Provider: {provider_name}。支持的Provider: {list(providers.keys())}")

    config = providers[provider_name]
    ProviderClass = config["class"]

    # 使用默认模型如果未指定
    if not model:
        model = config["default_model"]

    # 检查API Key
    if config["requires_key"] and not api_key:
        raise ValueError(f"{provider_name}需要API Key")

    # 构建参数
    params = {"model": model, **kwargs}

    if api_key:
        params["api_key"] = api_key

    if base_url or config.get("default_base_url"):
        params["base_url"] = base_url or config["default_base_url"]

    return ProviderClass(**params)


def get_available_providers() -> list:
    """获取可用的Provider列表"""
    return ["openai", "anthropic", "deepseek", "zhipu", "ollama"]