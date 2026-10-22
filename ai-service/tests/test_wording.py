from app.agents.triage_agent.wording import polish_turn


def _question() -> dict:
    return {
        'type': 'question',
        'done': False,
        'question': {
            'id': 'Q_ent_sev',
            'key': 'Q_ent_sev',
            'text': 'How bad is the sore throat?',
            'rephrased': False,
            'options': [{'id': 'little', 'key': 'Q_ent_sev.little', 'text': 'A little', 'emoji': ''}],
        },
    }


def _result() -> dict:
    return {
        'type': 'result',
        'triage': {
            'urgency': {'level': 'yellow', 'label': 'Soon'},
            'reason': 'See a doctor in the next day or two.',
            'emergency_flag': False,
            'recommended_specialties': [{'specialty': 'ENT'}],
        },
    }


def test_offline_wording_keeps_the_question(monkeypatch):
    monkeypatch.setattr('app.agents.triage_agent.wording.llm.is_configured', lambda: False)
    turn = _question()
    assert polish_turn(turn, [{'role': 'user', 'text': 'I have a sore throat'}]) is turn
    assert turn['question']['text'] == 'How bad is the sore throat?'
    assert turn['question']['options'][0]['id'] == 'little'


def test_groq_replies_in_chat_then_asks_the_same_question(monkeypatch):
    monkeypatch.setattr('app.agents.triage_agent.wording.llm.is_configured', lambda: True)

    def _reply(**kwargs):
        assert 'Buttons: A little' in kwargs['user']
        return 'A sore throat is a rough way to start the day. How painful is it right now?'

    monkeypatch.setattr('app.agents.triage_agent.wording.llm.chat_completion', _reply)
    turn = polish_turn(_question(), [{'role': 'user', 'text': 'I have a sore throat'}])
    assert turn['question']['text'].startswith('A sore throat')
    assert '?' in turn['question']['text']
    assert turn['question']['id'] == 'Q_ent_sev'
    assert turn['question']['options'][0]['key'] == 'Q_ent_sev.little'


def test_chat_reply_without_the_question_is_rejected(monkeypatch):
    monkeypatch.setattr('app.agents.triage_agent.wording.llm.is_configured', lambda: True)
    monkeypatch.setattr(
        'app.agents.triage_agent.wording.llm.chat_completion',
        lambda **_kwargs: 'I am sorry you are dealing with that.',
    )
    turn = polish_turn(_question(), [{'role': 'user', 'text': 'I have a sore throat'}])
    assert turn['question']['text'] == 'How bad is the sore throat?'


def test_groq_rewrites_only_the_reason(monkeypatch):
    monkeypatch.setattr('app.agents.triage_agent.wording.llm.is_configured', lambda: True)
    monkeypatch.setattr(
        'app.agents.triage_agent.wording.llm.chat_completion',
        lambda **_kwargs: 'A sore throat at this level should be checked in the next day or two.',
    )
    turn = polish_turn(_result(), [{'role': 'user', 'text': 'sore throat'}])
    assert turn['triage']['reason'].startswith('A sore throat')
    assert turn['triage']['urgency']['level'] == 'yellow'
    assert turn['triage']['emergency_flag'] is False
    assert turn['triage']['recommended_specialties'] == [{'specialty': 'ENT'}]


def test_rejected_wording_keeps_the_original(monkeypatch):
    monkeypatch.setattr('app.agents.triage_agent.wording.llm.is_configured', lambda: True)
    monkeypatch.setattr(
        'app.agents.triage_agent.wording.llm.chat_completion',
        lambda **_kwargs: '{"question": "something else"}',
    )
    turn = polish_turn(_question(), [])
    assert turn['question']['text'] == 'How bad is the sore throat?'


def test_model_error_keeps_the_original(monkeypatch):
    def _boom(**_kwargs):
        raise RuntimeError('LLM HTTP 500')

    monkeypatch.setattr('app.agents.triage_agent.wording.llm.is_configured', lambda: True)
    monkeypatch.setattr('app.agents.triage_agent.wording.llm.chat_completion', _boom)
    turn = polish_turn(_result(), [])
    assert turn['triage']['reason'] == 'See a doctor in the next day or two.'
