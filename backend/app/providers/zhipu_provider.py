"""智谱 GLM Provider"""

from typing import Optional, Dict, Any
from zhipuai import ZhipuAI
import json

from .base import BaseLLMProvider


class ZhipuProvider(BaseLLMProvider):
    """智谱 GLM API Provider"""

    def __init__(
        self,
        api_key: str,
        model: str = "glm-4",
        **kwargs
    ):
        super().__init__(model, **kwargs)
        self.client = ZhipuAI(api_key=api_key)

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

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature
        )

        content = response.choices[0].message.content
        return self._extract_json_from_response(content)
