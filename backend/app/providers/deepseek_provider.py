"""DeepSeek Provider (兼容OpenAI API)"""

from typing import Optional, Dict, Any
from openai import OpenAI
import json

from .base import BaseLLMProvider


class DeepSeekProvider(BaseLLMProvider):
    """DeepSeek API Provider (使用OpenAI兼容接口)"""

    def __init__(
        self,
        api_key: str,
        model: str = "deepseek-chat",
        base_url: str = "https://api.deepseek.com",
        **kwargs
    ):
        super().__init__(model, **kwargs)
        self.client = OpenAI(api_key=api_key, base_url=base_url)

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """生成文本"""
        messages = self._build_messages(prompt, system_prompt)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )

        return response.choices[0].message.content

    def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """生成JSON"""
        messages = self._build_messages(prompt, system_prompt)

        # DeepSeek支持response_format
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception:
            # 降级处理
            response_text = self.generate(prompt, system_prompt, temperature)
            return self._extract_json_from_response(response_text)