"""Optional OpenAI-compatible LLM client.

Used by the agents when ``LLM_API_URL`` (or ``LLM_MODEL``) is configured.
Uses only ``urllib`` from the standard library so the service stays light.
When the LLM is not configured, agents fall back to their deterministic
offline implementations.
"""
from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.request
from typing import Any

from ..config import settings

logger = logging.getLogger('medassist-ai.llm')

DEFAULT_URL = 'http://127.0.0.1:11434/v1/chat/completions'
_THINK = re.compile(r'<think>.*?</think>', re.IGNORECASE | re.DOTALL)


def is_configured() -> bool:
    url = settings.llm_api_url.strip()
    # A Groq URL without a key only produces 401s. Stay on the offline agents.
    if 'groq.com' in url.lower() and not settings.llm_api_key.strip():
        return False
    return bool(url or settings.llm_model.strip())


# These ids 404 on a normal Groq key. Llama 3.3 70B is enterprise-only.
_RETIRED_GROQ_MODELS = {
    'llama-3.3-70b-versatile': 'openai/gpt-oss-20b',
    'llama-3.1-8b-instant': 'openai/gpt-oss-20b',
}
_GROQ_DEFAULT = 'openai/gpt-oss-20b'


def effective_model() -> str:
    model = settings.llm_model.strip()
    if 'groq.com' not in settings.llm_api_url.lower():
        return model or 'medassist-default'
    replacement = _RETIRED_GROQ_MODELS.get(model)
    if replacement:
        logger.warning('Groq model %s is retired; using %s', model, replacement)
        return replacement
    return model or _GROQ_DEFAULT


def _safe_error(text: str) -> str:
    key = settings.llm_api_key.strip()
    if key:
        text = text.replace(key, '[redacted]')
    return text[:300]


def _visible_answer(text: str) -> str:
    return _THINK.sub('', text).strip()


def _complete(
    system: str,
    user: str,
    *,
    temperature: float,
    max_tokens: int,
    timeout: float | None,
    json_mode: bool,
) -> str:
    url = settings.llm_api_url or DEFAULT_URL
    payload: dict[str, Any] = {
        'model': effective_model(),
        'messages': [
            {'role': 'system', 'content': system},
            {'role': 'user', 'content': user},
        ],
        'temperature': temperature,
        'max_tokens': max_tokens,
    }
    # GPT-OSS puts a reasoning trace beside the answer. Ask for the answer only,
    # and keep the trace short so a chat turn finishes inside the API timeout.
    if 'groq.com' in url.lower():
        payload['reasoning_effort'] = 'low'
        payload['include_reasoning'] = False
    if json_mode:
        payload['response_format'] = {'type': 'json_object'}

    # Cloudflare rejects Python's default urllib signature with error 1010.
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'medassist-ai/1.0',
    }
    if settings.llm_api_key:
        headers['Authorization'] = 'Bearer ' + settings.llm_api_key

    body = json.dumps(payload).encode('utf-8')
    request = urllib.request.Request(url, data=body, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(request, timeout=timeout or settings.llm_timeout) as response:
            raw = response.read().decode('utf-8')
    except urllib.error.HTTPError as exc:
        detail = _safe_error(exc.read().decode('utf-8', errors='replace'))
        raise RuntimeError(f'LLM HTTP {exc.code}: {detail}') from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f'LLM unreachable: {exc.reason}') from exc

    data = json.loads(raw)
    try:
        content = _visible_answer(str(data['choices'][0]['message']['content'] or ''))
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError('Unexpected LLM response shape') from exc
    if not content:
        raise RuntimeError('LLM returned empty content')
    return content


def chat_completion(
    system: str,
    user: str,
    *,
    temperature: float = 0.2,
    max_tokens: int = 600,
    timeout: float | None = None,
    json_mode: bool = False,
) -> str:
    """Call the OpenAI-compatible endpoint and return the assistant text.

    Raises on network or shape errors so callers can fall back gracefully.
    A JSON-mode rejection is retried once as plain text. Callers already
    extract a JSON object from that text.
    """
    try:
        return _complete(
            system,
            user,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=timeout,
            json_mode=json_mode,
        )
    except RuntimeError as exc:
        if json_mode and 'HTTP 400' in str(exc):
            logger.warning('LLM JSON mode was rejected; retrying as plain text')
            return _complete(
                system,
                user,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
                json_mode=False,
            )
        raise