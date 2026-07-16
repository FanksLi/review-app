"""Anthropic Claude Provider"""

from typing import Optional, Dict, Any
from anthropic import Anthropic
import json

from .base import BaseLLMProvider


class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude API Provider"""

    def __init__(
        self,
        api_key: str,
        model: str = "claude-3-5-sonnet-20241022",
        **kwargs
    ):
        super().__init__(model, **kwargs)
        self.client = Anthropic(api_key=api_key)

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """生成文本"""
        kwargs = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}]
        }

        if system_prompt:
            kwargs["system"] = system_prompt

        response = self.client.messages.create(**kwargs)
        return response.content[0].text

    def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """生成JSON"""
        enhanced_prompt = f"{prompt}\n\n请以JSON格式返回结果。"
        response_text = self.generate(enhanced_prompt, system_prompt, temperature)
        return self._extract_json_from_response(response_text)
