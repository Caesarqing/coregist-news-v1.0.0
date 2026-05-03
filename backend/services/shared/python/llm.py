from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

logger = logging.getLogger(__name__)


class LLMProvider:
    def __init__(self) -> None:
        pass

    @staticmethod
    def _invoke_openrouter(
        *,
        base_url: str,
        api_key: str,
        remote_model: str,
        prompt: str,
        temperature: float,
        max_tokens: int,
        timeout: int,
        response_format_json: bool = False,
    ) -> str:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        referer = os.getenv("OPENROUTER_HTTP_REFERER", "").strip()
        title = os.getenv("OPENROUTER_TITLE", "").strip()
        if referer:
            headers["HTTP-Referer"] = referer
        if title:
            headers["X-Title"] = title
        payload = {
            "model": remote_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }
        if response_format_json:
            payload["response_format"] = {"type": "json_object"}
        response = requests.post(
            f"{base_url.rstrip('/')}/chat/completions",
            headers=headers,
            json=payload,
            timeout=timeout,
        )
        if (
            response_format_json
            and response.status_code in {400, 422}
            and "response_format" in response.text.lower()
        ):
            payload.pop("response_format", None)
            response = requests.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
                timeout=timeout,
            )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    @staticmethod
    def _openrouter_fallback_config() -> dict[str, str]:
        return {
            "base_url": os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").strip(),
            "api_key": os.getenv("OPENROUTER_API_KEY", "").strip(),
            "remote_model": os.getenv("OPENROUTER_MODEL", "").strip(),
        }

    def invoke(self, model_name: str, prompt: str, **kwargs: Any) -> str:
        model_name = (model_name or "mock").strip()
        temperature = kwargs.get("temperature", 0.2)
        max_tokens = kwargs.get("max_tokens", 1200)
        timeout = kwargs.get("timeout", 120)
        response_format_json = bool(kwargs.get("response_format_json", False))

        if model_name.startswith("openrouter"):
            base_url = kwargs.get("base_url") or os.getenv("OPENROUTER_BASE_URL") or "https://openrouter.ai/api/v1"
            api_key = kwargs.get("api_key") or os.getenv("OPENROUTER_API_KEY") or ""
            remote_model = kwargs.get("remote_model") or os.getenv("OPENROUTER_MODEL") or ""
            if not api_key:
                raise RuntimeError("OPENROUTER_API_KEY is not configured")
            if not remote_model:
                raise RuntimeError("OPENROUTER_MODEL is not configured")
            return self._invoke_openrouter(
                base_url=base_url,
                api_key=api_key,
                remote_model=remote_model,
                prompt=prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
                response_format_json=response_format_json,
            )

        if model_name.startswith("dmax"):
            base_url = (kwargs.get("base_url") or os.getenv("DMAX_BASE_URL") or "https://www.dmxapi.cn/v1").rstrip("/")
            raw_api_key = (kwargs.get("api_key") or os.getenv("DMAX_API") or "").strip()
            remote_model = kwargs.get("remote_model") or os.getenv("DMAX_REMOTE_MODEL") or "Qwen3.5-2B-free"
            fallback = self._openrouter_fallback_config()
            if not raw_api_key:
                if fallback["api_key"] and fallback["remote_model"]:
                    logger.warning("DMAX API key is not configured; using OpenRouter fallback")
                    return self._invoke_openrouter(
                        base_url=fallback["base_url"],
                        api_key=fallback["api_key"],
                        remote_model=fallback["remote_model"],
                        prompt=prompt,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        timeout=timeout,
                        response_format_json=response_format_json,
                    )
                raise RuntimeError("DMAX API key is not configured")
            auth_header = raw_api_key if raw_api_key.lower().startswith("bearer ") else f"Bearer {raw_api_key}"
            payload = {
                "model": remote_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": False,
            }
            if response_format_json:
                payload["response_format"] = {"type": "json_object"}
            try:
                response = requests.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": auth_header,
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=timeout,
                )
                if (
                    response_format_json
                    and response.status_code in {400, 422}
                    and "response_format" in response.text.lower()
                ):
                    payload.pop("response_format", None)
                    response = requests.post(
                        f"{base_url}/chat/completions",
                        headers={
                            "Authorization": auth_header,
                            "Content-Type": "application/json",
                        },
                        json=payload,
                        timeout=timeout,
                    )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except Exception:
                if fallback["api_key"] and fallback["remote_model"]:
                    logger.exception("DMAX invoke failed; using OpenRouter fallback")
                    return self._invoke_openrouter(
                        base_url=fallback["base_url"],
                        api_key=fallback["api_key"],
                        remote_model=fallback["remote_model"],
                        prompt=prompt,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        timeout=timeout,
                        response_format_json=response_format_json,
                    )
                raise

        if model_name == "mock":
            return self._mock_response(model_name, prompt)

        raise RuntimeError(f"Unsupported LLM provider: {model_name}. Only openrouter and dmax are enabled.")

    def invoke_json(self, model_name: str, prompt: str, default: Optional[Dict[str, Any]] = None, **kwargs: Any) -> Dict[str, Any]:
        strict = bool(kwargs.pop("strict", False))
        try:
            raw = self.invoke(model_name, prompt, **kwargs)
        except Exception as exc:
            logger.warning("LLM invoke failed model=%s error=%s", model_name, exc)
            if strict:
                raise
            fallback = default.copy() if default else {}
            fallback["_llm_error"] = str(exc)
            fallback["_llm_model"] = model_name
            return fallback
        try:
            return json.loads(raw)
        except Exception:
            start = raw.find("{")
            end = raw.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(raw[start:end + 1])
                except Exception:
                    pass
        if strict:
            raise ValueError(f"LLM did not return valid JSON for model {model_name}")
        return default.copy() if default else {"raw_text": raw}

    @staticmethod
    def _mock_response(model_name: str, prompt: str) -> str:
        excerpt = prompt.strip().replace("\n", " ")
        excerpt = excerpt[:280]
        return json.dumps(
            {
                "model": model_name,
                "message": f"Mock response generated for prompt: {excerpt}",
            },
            ensure_ascii=False,
        )


__all__ = ["LLMProvider"]
