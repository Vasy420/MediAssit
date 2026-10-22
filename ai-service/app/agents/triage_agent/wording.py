"""Let Groq talk like a short clinic chat. The question tree stays in charge.

A question turn may become two or three sentences: a reply to what the patient
just said, then the same question. A result may become a short closing message
with the same guidance. Option ids, urgency, the emergency flag, and specialties
stay untouched. A failed, slow, or off-script reply keeps the original text.
"""
from __future__ import annotations

import logging
import re

from ...services import llm

logger = logging.getLogger('medassist-ai.wording')

_POLISH_TIMEOUT = 8.0
_MAX_CHARS = 520
_SENTENCE_END = re.compile(r'[.!?]+')

_QUESTION_SYSTEM = (
    'You are a clinic chat assistant. The next question and its answer buttons are already chosen. '
    'Write two short sentences, like a person texting. '
    'First, reply to what the patient just said, without adding symptoms, advice, a diagnosis, or a medicine. '
    'Second, ask the required question in plain language. It must mean the same thing, so the buttons still answer it. '
    'Do not ask a different question. Return only those sentences, with no quotes.'
)

_SIMPLE_QUESTION_SYSTEM = (
    'You are a clinic chat assistant using very easy words. '
    'Write at most two short sentences. '
    'First, show you heard the patient. Second, ask the required question. '
    'Do not add advice, a diagnosis, a medicine, or a different question. '
    'Return only those sentences.'
)

_REASON_SYSTEM = (
    'You are a clinic chat assistant closing a symptom check. '
    'Write two or three short sentences to the patient. '
    'Start from what they told you, then give the same care guidance as the reason below. '
    'Do not make it more or less urgent. Do not prescribe, and do not add symptoms. '
    'Return only those sentences, with no quotes.'
)


def _patient_lines(messages: list[dict]) -> str:
    lines: list[str] = []
    for message in messages or []:
        role = str(message.get('role') or '')
        if role not in ('user', 'patient'):
            continue
        text = ' '.join(str(message.get('text') or '').split())
        if text:
            lines.append(text[:300])
    return '\n'.join(lines[-4:])


def _option_labels(question: dict) -> str:
    labels: list[str] = []
    for option in question.get('options') or []:
        if not isinstance(option, dict):
            continue
        label = ' '.join(str(option.get('text') or '').split())
        if label:
            labels.append(label)
    return ', '.join(labels[:8])


def _clean(text: str, *, require_question: bool) -> str:
    sentence = ' '.join(text.replace('\n', ' ').split()).strip().strip('"').strip("'")
    if not sentence or sentence.startswith('{') or sentence.startswith('```'):
        return ''
    if len(sentence) < 8 or len(sentence) > _MAX_CHARS:
        return ''
    if require_question and '?' not in sentence:
        return ''
    endings = _SENTENCE_END.findall(sentence)
    if not endings or len(endings) > 4:
        return ''
    lowered = sentence.lower()
    if 'diagnos' in lowered or 'prescri' in lowered:
        return ''
    return sentence


def _rewrite(system: str, user: str, *, require_question: bool) -> str:
    return _clean(llm.chat_completion(
        system=system,
        user=user,
        temperature=0.4,
        max_tokens=220,
        timeout=_POLISH_TIMEOUT,
    ), require_question=require_question)


def polish_turn(turn: dict, messages: list[dict], simple: bool = False) -> dict:
    """Return the same turn, with a short chat reply when Groq is available."""
    if not llm.is_configured() or not isinstance(turn, dict):
        return turn
    try:
        said = _patient_lines(messages)
        if turn.get('type') == 'question' and isinstance(turn.get('question'), dict):
            original = str(turn['question'].get('text') or '').strip()
            if not original:
                return turn
            buttons = _option_labels(turn['question'])
            rewritten = _rewrite(
                _SIMPLE_QUESTION_SYSTEM if simple else _QUESTION_SYSTEM,
                (
                    f'Required question: {original}\n'
                    f'Buttons: {buttons or "(none)"}\n\n'
                    f'What the patient already said:\n{said or "(nothing yet)"}'
                ),
                require_question=True,
            )
            if rewritten:
                turn['question']['text'] = rewritten
        elif turn.get('type') == 'result' and isinstance(turn.get('triage'), dict):
            triage = turn['triage']
            original = str(triage.get('reason') or '').strip()
            urgency = triage.get('urgency') if isinstance(triage.get('urgency'), dict) else {}
            label = str(urgency.get('label') or urgency.get('level') or '').strip()
            if not original:
                return turn
            rewritten = _rewrite(
                _REASON_SYSTEM,
                (
                    f'Urgency that must stay the same: {label or "unchanged"}\n'
                    f'Reason: {original}\n\n'
                    f'What the patient said:\n{said or "(nothing yet)"}'
                ),
                require_question=False,
            )
            if rewritten:
                triage['reason'] = rewritten
    except Exception as exc:
        logger.warning('Symptom chat kept the original wording: %s', exc.__class__.__name__)
    return turn
