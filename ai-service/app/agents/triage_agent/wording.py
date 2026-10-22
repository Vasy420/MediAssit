"""Let Groq talk like a short clinic chat. The question tree stays in charge.

A question keeps its own sentence and buttons. Groq may add one acknowledgment
above it. A result may become a short closing message with the same guidance.
Option ids, urgency, the emergency flag, care setting, and specialties stay
untouched. A failed, slow, or off-script reply keeps the original text.
"""
from __future__ import annotations

import logging
import re

from ...services import llm

logger = logging.getLogger('medassist-ai.wording')

_POLISH_TIMEOUT = 8.0
_MAX_CHARS = 520
_SENTENCE_END = re.compile(r'[.!?]+')

_LEAD_SYSTEM = (
    'You are a clinic chat assistant. '
    'Write one short sentence that shows you heard the patient. '
    'Do not ask a question. Do not give advice, a diagnosis, or a medicine. '
    'Do not name a new symptom. The app asks the next question itself. '
    'Return only that sentence, with no quotes.'
)

_SIMPLE_LEAD_SYSTEM = (
    'You are a clinic chat assistant using very easy words. '
    'Write one short sentence that shows you heard the patient. '
    'Do not ask a question. Do not give advice, a diagnosis, or a medicine. '
    'Return only that sentence.'
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


def _clean(text: str, *, require_question: bool, lead: bool = False) -> str:
    sentence = ' '.join(text.replace('\n', ' ').split()).strip().strip('"').strip("'")
    if not sentence or sentence.startswith('{') or sentence.startswith('```'):
        return ''
    limit = 220 if lead else _MAX_CHARS
    if len(sentence) < 8 or len(sentence) > limit:
        return ''
    if lead and '?' in sentence:
        return ''
    if require_question and '?' not in sentence:
        return ''
    endings = _SENTENCE_END.findall(sentence)
    if not endings or len(endings) > (1 if lead else 4):
        return ''
    lowered = sentence.lower()
    if 'diagnos' in lowered or 'prescri' in lowered:
        return ''
    return sentence


def _rewrite(system: str, user: str, *, require_question: bool, lead: bool = False) -> str:
    return _clean(llm.chat_completion(
        system=system,
        user=user,
        temperature=0.4,
        max_tokens=220,
        timeout=_POLISH_TIMEOUT,
    ), require_question=require_question, lead=lead)


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
            lead = _rewrite(
                _SIMPLE_LEAD_SYSTEM if simple else _LEAD_SYSTEM,
                f'What the patient already said:\n{said or "(nothing yet)"}',
                require_question=False,
                lead=True,
            )
            if lead:
                turn['question']['lead'] = lead
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
