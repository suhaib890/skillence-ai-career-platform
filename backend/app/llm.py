"""Optional LLM client for the Transition Intelligence AI Coach.

Best-effort and provider-agnostic. If no API key is configured, the provider
is unknown, or the network call fails for any reason, every function returns
``None`` so callers fall back to the deterministic engine. The feature never
depends on this succeeding.

Secrets are read from settings (env / .env) and are never logged.
"""

from __future__ import annotations

import json
import urllib.request
import urllib.error

from .config import settings

_ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
_OPENAI_URL = "https://api.openai.com/v1/chat/completions"
_GOOGLE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"


def _post(url: str, payload: dict, headers: dict) -> dict | None:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=settings.LLM_TIMEOUT_SECONDS) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, OSError):
        return None


def _extract_json(text: str) -> dict | None:
    """Pull the first JSON object out of a model's text response."""
    if not text:
        return None
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except ValueError:
        return None


def generate_json(system: str, prompt: str) -> dict | None:
    """Ask the configured LLM for a JSON object. Returns None on any failure."""
    if not settings.llm_enabled:
        return None

    provider = settings.LLM_PROVIDER.strip().lower()
    key = settings.LLM_API_KEY.strip()
    model = settings.LLM_MODEL.strip()

    if provider == "anthropic":
        body = _post(
            _ANTHROPIC_URL,
            {
                "model": model,
                "max_tokens": 1024,
                "system": system,
                "messages": [{"role": "user", "content": prompt}],
            },
            {
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        )
        if not body:
            return None
        try:
            text = "".join(
                block.get("text", "")
                for block in body.get("content", [])
                if block.get("type") == "text"
            )
        except (AttributeError, TypeError):
            return None
        return _extract_json(text)

    if provider == "openai":
        body = _post(
            _OPENAI_URL,
            {
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                "response_format": {"type": "json_object"},
            },
            {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        )
        if not body:
            return None
        try:
            text = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            return None
        return _extract_json(text)

    if provider == "google":
        body = _post(
            _GOOGLE_URL.format(model=model, key=key),
            {
                "system_instruction": {"parts": [{"text": system}]},
                "contents": [{"parts": [{"text": prompt}]}],
            },
            {"Content-Type": "application/json"},
        )
        if not body:
            return None
        try:
            text = body["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError):
            return None
        return _extract_json(text)

    return None
