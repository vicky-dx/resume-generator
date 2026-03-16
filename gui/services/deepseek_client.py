"""Concrete implementation of ILLMClient for DeepSeek API."""

import json
import os
import urllib.request
import urllib.error

from gui.services.ai_merger import ILLMClient


class DeepSeekClient(ILLMClient):
    """
    DeepSeek integration using their OpenAI-compatible endpoint.
    Retrieves the API key from DEEPSEEK_API_KEY environment variable.
    """

    def __init__(self, api_key: str | None = None):
        # Default to empty string instead of checking os.environ aggressively on init
        self.api_key = api_key or ""
        self.api_url = "https://api.deepseek.com/chat/completions"
        self.model = "deepseek-chat"

    def generate_json(self, prompt: str, system_prompt: str = "") -> dict:
        # always lazily grab the latest env variable to pick up any changes from the UI dialog
        current_api_key = self.api_key or os.environ.get("DEEPSEEK_API_KEY", "")
        if not current_api_key:
            raise ValueError(
                "DeepSeek API key not provided or found in environment variables."
            )

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {current_api_key}",
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        data = {
            "model": self.model,
            "messages": messages,
            "response_format": {"type": "json_object"},
        }

        req = urllib.request.Request(
            self.api_url,
            data=json.dumps(data).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req) as response:
                response_body = response.read().decode("utf-8")
                response_data = json.loads(response_body)
                content = response_data["choices"][0]["message"]["content"]
                return json.loads(content)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            raise RuntimeError(f"DeepSeek API error: HTTP {e.code} - {error_body}")
        except json.JSONDecodeError:
            raise RuntimeError(f"Failed to parse JSON out of DeepSeek response.")
