"""Rewrite patient-facing sentences with Groq. The question tree stays in charge.

Only the question sentence and the final reason may change. Option ids,
urgency, the emergency flag, and specialties are copied through untouched.
Any failure, including a slow or empty model reply, keeps the original sentence.
"""
from __future__ import annotations

import logging

from ...services import llm

logger = logging.getLogger('medassist-ai.wording')

_POLISH_TIMEOUT = 8.0
_MAX_CHARS = 400

_QUESTION_SYSTEM = (
    'You rewrite one question a clinic app shows to a patient. '
    'The question and its answer buttons are already chosen. '
    'Rewrite only the question sentence so it is clear and refers to what the patient already said. '
    'Do not add advice, a diagnosis, a medicine, or a second question. '
    'Return only the sentence, with no quotes.'
)

_REASON_SYSTEM = (
    'You rewrite the explanation a clinic app shows after a symptom check-in. '
    'The urgency decision is already made and must stay the same. '
    'Rewrite only the reason in one or two plain sentences, using the symptoms the patient reported. '
    'Do not prescribe, do not add symptoms, and do not change how urgent it is. '
    'Return only the reason, with no quotes.'
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


def _clean(text: str) -> str:
    sentence = ' '.join(text.replace('\n', ' ').split()).strip().strip('"').strip("'")
    if not sentence or sentence.startswith('{') or sentence.startswith('```'):
        return ''
    if len(sentence) < 8 or len(sentence) > _MAX_CHARS:
        return ''
    return sentence


def _rewrite(system: str, user: str) -> str:
    return _clean(llm.chat_completion(
        system=system,
        user=user,
        temperature=0.2,
        max_tokens=160,
        timeout=_POLISH_TIMEOUT,
    ))


def polish_turn(turn: dict, messages: list[dict]) -> dict:
    """Return the same turn, with patient-facing text rewritten when Groq is available."""
    if not llm.is_configured() or not isinstance(turn, dict):
        return turn
    try:
        said = _patient_lines(messages)
        if turn.get('type') == 'question' and isinstance(turn.get('question'), dict):
            original = str(turn['question'].get('text') or '').strip()
            if not original:
                return turn
            rewritten = _rewrite(
                _QUESTION_SYSTEM,
                f'Question: {original}\n\nWhat the patient already said:\n{said or "(nothing yet)"}',
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
            )
            if rewritten:
                triage['reason'] = rewritten
    except Exception as exc:
        logger.warning('Symptom wording kept the original sentence: %s', exc.__class__.__name__)
    return turn
