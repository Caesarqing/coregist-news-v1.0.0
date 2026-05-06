from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[3] / ".env", override=True)

logger = logging.getLogger(__name__)


class LLMProvider:
    def __init__(self) -> None:
        pass

    @staticmethod
    def _optional_float_env(name: str) -> Optional[float]:
        raw = os.getenv(name, "").strip()
        if not raw:
            return None
        return float(raw)

    @staticmethod
    def _json_env(name: str) -> Dict[str, Any]:
        raw = os.getenv(name, "").strip()
        if not raw:
            return {}
        value = json.loads(raw)
        if not isinstance(value, dict):
            raise ValueError(f"{name} must be a JSON object")
        return value

    @staticmethod
    def _normalise_provider(model_name: str) -> str:
        provider = (model_name or os.getenv("LLM_PROVIDER") or "mock").strip().lower()
        aliases = {
            "openai": "openai-compatible",
            "openai-compatible": "openai-compatible",
            "openai_compatible": "openai-compatible",
            "ollama": "openai-compatible",
            "anthropic": "anthropic",
            "claude": "anthropic",
            "mock": "mock",
        }
        return aliases.get(provider, provider)

    @staticmethod
    def _provider_env(model_name: str) -> tuple[str, str, str]:
        raw_provider = (model_name or os.getenv("LLM_PROVIDER") or "").strip().lower()
        if raw_provider in {"anthropic", "claude"}:
            return (
                os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com").strip(),
                os.getenv("ANTHROPIC_API_KEY", "").strip(),
                os.getenv("ANTHROPIC_MODEL", "").strip(),
            )
        return (
            os.getenv("LLM_BASE_URL", "").strip(),
            os.getenv("LLM_API_KEY", "").strip(),
            os.getenv("LLM_MODEL", "").strip(),
        )

    @staticmethod
    def _invoke_openai_compatible(
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
            headers["Authorization"] = api_key if api_key.lower().startswith("bearer ") else f"Bearer {api_key}"
        referer = os.getenv("LLM_HTTP_REFERER", "").strip()
        title = os.getenv("LLM_TITLE", "").strip()
        if referer:
            headers["HTTP-Referer"] = referer
        if title:
            headers["X-Title"] = title
        payload = {
            "model": remote_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "stream": False,
        }
        system_prompt = os.getenv("LLM_SYSTEM_PROMPT", "").strip()
        if system_prompt:
            payload["messages"].insert(0, {"role": "system", "content": system_prompt})
        token_field = os.getenv("LLM_TOKEN_FIELD", "max_tokens").strip() or "max_tokens"
        if token_field not in {"max_tokens", "max_completion_tokens"}:
            raise ValueError("LLM_TOKEN_FIELD must be max_tokens or max_completion_tokens")
        payload[token_field] = max_tokens
        top_p = LLMProvider._optional_float_env("LLM_TOP_P")
        frequency_penalty = LLMProvider._optional_float_env("LLM_FREQUENCY_PENALTY")
        presence_penalty = LLMProvider._optional_float_env("LLM_PRESENCE_PENALTY")
        if top_p is not None:
            payload["top_p"] = top_p
        if frequency_penalty is not None:
            payload["frequency_penalty"] = frequency_penalty
        if presence_penalty is not None:
            payload["presence_penalty"] = presence_penalty
        payload.update(LLMProvider._json_env("LLM_EXTRA_BODY_JSON"))
        if response_format_json:
            payload["response_format"] = {"type": "json_object"}
        url = f"{base_url.rstrip('/')}/chat/completions"
        response = requests.post(url, headers=headers, json=payload, timeout=timeout)
        if response_format_json and response.status_code in {400, 422, 500}:
            logger.warning(
                "OpenAI-compatible JSON mode failed status=%s model=%s; retrying without response_format",
                response.status_code,
                remote_model,
            )
            payload.pop("response_format", None)
            response = requests.post(url, headers=headers, json=payload, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    @staticmethod
    def _invoke_anthropic(
        *,
        base_url: str,
        api_key: str,
        remote_model: str,
        prompt: str,
        temperature: float,
        max_tokens: int,
        timeout: int,
    ) -> str:
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY or LLM_API_KEY is not configured")
        if not remote_model:
            raise RuntimeError("ANTHROPIC_MODEL or LLM_MODEL is not configured")
        response = requests.post(
            f"{base_url.rstrip('/')}/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": os.getenv("ANTHROPIC_VERSION", "2023-06-01"),
                "content-type": "application/json",
            },
            json={
                "model": remote_model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=timeout,
        )
        response.raise_for_status()
        data = response.json()
        blocks = data.get("content") or []
        return "".join(block.get("text", "") for block in blocks if block.get("type") == "text")

    def invoke(self, model_name: str, prompt: str, **kwargs: Any) -> str:
        model_name = (model_name or "mock").strip()
        provider = self._normalise_provider(model_name)
        temperature = kwargs.get("temperature", 0.2)
        max_tokens = kwargs.get("max_tokens", 1200)
        timeout = kwargs.get("timeout", 120)
        response_format_json = bool(kwargs.get("response_format_json", False))
        env_base_url, env_api_key, env_remote_model = self._provider_env(model_name)

        if provider == "openai-compatible":
            base_url = kwargs.get("base_url") or env_base_url
            api_key = kwargs.get("api_key") or env_api_key
            remote_model = kwargs.get("remote_model") or env_remote_model
            if not remote_model:
                raise RuntimeError("LLM_MODEL is not configured")
            return self._invoke_openai_compatible(
                base_url=base_url,
                api_key=api_key,
                remote_model=remote_model,
                prompt=prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
                response_format_json=response_format_json,
            )

        if provider == "anthropic":
            base_url = kwargs.get("base_url") or env_base_url
            api_key = kwargs.get("api_key") or env_api_key
            remote_model = kwargs.get("remote_model") or env_remote_model
            return self._invoke_anthropic(
                base_url=base_url,
                api_key=api_key,
                remote_model=remote_model,
                prompt=prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
            )

        if model_name == "mock":
            return self._mock_response(model_name, prompt)

        raise RuntimeError(f"Unsupported LLM provider: {model_name}. Use openai-compatible, anthropic, or mock.")

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
