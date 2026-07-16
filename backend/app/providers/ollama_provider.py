"""Ollama Provider (本地模型)"""

from typing import Optional, Dict, Any
import httpx
import json

from .base import BaseLLMProvider


class OllamaProvider(BaseLLMProvider):
    """Ollama本地模型Provider"""

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "llama2",
        **kwargs
    ):
        super().__init__(model, **kwargs)
        self.base_url = base_url.rstrip("/")

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """生成文本"""
        url = f"{self.base_url}/api/generate"

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            }
        }

        if system_prompt:
            payload["system"] = system_prompt

        with httpx.Client(timeout=120.0) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            return result.get("response", "")

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

    def check_health(self) -> bool:
        """检查Ollama服务是否运行"""
        try:
            with httpx.Client(timeout=5.0) as client:
                response = client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:
            return False
