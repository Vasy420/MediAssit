from app.config import settings
from app.services.llm import _visible_answer, is_configured


def test_think_tags_are_not_shown_to_the_patient():
    assert _visible_answer('<think>hidden steps</think> See a doctor today.') == 'See a doctor today.'


def test_groq_without_a_key_stays_offline(monkeypatch):
    monkeypatch.setattr(settings, 'llm_api_url', 'https://api.groq.com/openai/v1/chat/completions')
    monkeypatch.setattr(settings, 'llm_api_key', '')
    monkeypatch.setattr(settings, 'llm_model', 'openai/gpt-oss-120b')
    assert is_configured() is False


def test_retired_llama_model_is_replaced(monkeypatch):
    from app.services.llm import effective_model

    monkeypatch.setattr(settings, 'llm_api_url', 'https://api.groq.com/openai/v1/chat/completions')
    monkeypatch.setattr(settings, 'llm_model', 'llama-3.3-70b-versatile')
    assert effective_model() == 'openai/gpt-oss-20b'


def test_groq_with_a_key_is_configured(monkeypatch):
    monkeypatch.setattr(settings, 'llm_api_url', 'https://api.groq.com/openai/v1/chat/completions')
    monkeypatch.setattr(settings, 'llm_api_key', 'test-key')
    monkeypatch.setattr(settings, 'llm_model', 'openai/gpt-oss-120b')
    assert is_configured() is True
