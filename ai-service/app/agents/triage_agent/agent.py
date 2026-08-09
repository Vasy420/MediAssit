"""Adaptive rule-based triage engine.

Faithful port of ``backend/src/services/triage/engine.ts`` so the two
implementations behave identically and the backend's test scenarios hold
whether the local engine or this service handles the conversation.
"""
from __future__ import annotations

from typing import Optional

from ...services.languages import lang
from . import lexicon as L
from .lexicon import CATEGORIES, QUESTIONS
from .types import PatientContext, Question

DISCLAIMER = lang.t('disclaimer', _fallback='This is AI-assisted guidance, not a medical diagnosis.')

URGENCY_LABEL = {level: lang.t('urgency_label.' + level, _fallback=level) for level in ('green', 'yellow', 'orange', 'red')}
SEVERITY_LABEL = {level: lang.t('severity_label.' + level, _fallback=level) for level in ('mild', 'moderate', 'severe')}

SEV_FALLBACK = 'moderate'

SEV_KEYS = [
    'Q_fever_severity', 'Q_stomach_sev', 'Q_chest_sev', 'Q_breath_sev', 'Q_head_sev',
    'Q_bone_sev', 'Q_skin_sev', 'Q_ent_sev', 'Q_women_sev', 'Q_child_sev',
]

ONSET_KEYS = [
    'Q_fever_onset', 'Q_stomach_onset', 'Q_chest_onset', 'Q_head_onset', 'Q_bone_onset',
    'Q_skin_onset', 'Q_ent_onset', 'Q_women_onset', 'Q_child_onset',
]

ASSOC_KEYS = [
    'Q_fever_assoc', 'Q_chest_assoc', 'Q_head_assoc', 'Q_breath_when', 'Q_breath_fever',
    'Q_bone_cause', 'Q_skin_type', 'Q_child_fever',
]

SYMPTOM_PHRASES = [
    ('bone', 'knee pain'), ('bone', 'back pain'), ('bone', 'joint pain'), ('bone', 'leg pain'),
    ('bone', 'fracture'), ('chest', 'chest pain'), ('chest', 'palpitations'), ('head', 'headache'),
    ('head', 'dizziness'), ('head', 'blurred vision'), ('head', 'numbness'), ('head', 'weakness'),
    ('breathing', 'cough'), ('breathing', 'difficulty breathing'), ('breathing', 'wheezing'),
    ('stomach', 'stomach pain'), ('stomach', 'nausea'), ('stomach', 'vomiting'),
    ('stomach', 'diarrhoea'), ('fever', 'fever'), ('skin', 'rash'), ('skin', 'itching'),
    ('ent', 'sore throat'), ('ent', 'ear pain'), ('ent', 'hearing'),
]

# ----------------------------- helpers -----------------------------


def patient_texts(messages: list[dict]) -> list[str]:
    return [m['text'] for m in messages if m.get('role') == 'patient']


def word_list(texts: list[str]) -> str:
    return ' ' + ' '.join(texts).lower() + ' '


def has_word(haystack: str, word: str) -> bool:
    return (' ' + word + ' ') in haystack or (' ' + word + '.') in haystack or (' ' + word + ',') in haystack


def answer_value(answers: list[dict], key: str) -> Optional[str]:
    for a in answers:
        if a.get('key') == key and a.get('answer') != 'not_sure':
            return str(a.get('answer'))
    return None


def answer_indent(answers: list[dict], key: str) -> Optional[dict]:
    for a in answers:
        if a.get('key') == key:
            return a
    return None


def answer_sev(answers: list[dict]) -> Optional[str]:
    for key in SEV_KEYS:
        value = answer_value(answers, key)
        if value is not None:
            return value
    return None


def answer_onset(answers: list[dict]) -> dict:
    value = None
    for key in ONSET_KEYS:
        found = answer_value(answers, key)
        if found is not None:
            value = found
            break
    if value == 'today':
        return {'label': 'Started today', 'days': 0}
    if value == 'days_2_3':
        return {'label': 'Started 2-3 days ago', 'days': 2}
    if value == 'week_more':
        return {'label': 'Been there for more than a week', 'days': 8}
    return {'label': 'Duration not clear yet'}


def collect_assoc(answers: list[dict]) -> set:
    out = set()
    for key in ASSOC_KEYS:
        value = answer_value(answers, key)
        if value is not None:
            out.add(value)
    return out


def extract_symptoms(texts: list[str]) -> list[dict]:
    t = word_list(texts)
    out = []
    for cat, phrase in SYMPTOM_PHRASES:
        if (' ' + phrase) in t:
            out.append({'name': phrase, 'category': cat})
    return out

def compute_warn_signs(cats: list[str], assoc: set, texts: list[str], sev_in: Optional[str]) -> list[str]:
    t = word_list(texts)
    signs = []
    if 'chest' in cats and bool(assoc & {'sweating', 'arm_jaw', 'breathing'}):
        signs.append('Chest pain together with sweating, pain in the arm or jaw, or trouble breathing may point to a heart problem.')
    if 'chest' in cats and has_word(t, 'sweating'):
        signs.append('Chest pain together with sweating may point to a heart problem.')
    if 'breathing' in cats and bool(assoc & {'rest', 'sleep'}):
        signs.append('Breathing difficulty while at rest or while sleeping needs immediate attention.')
    if 'head' in cats and bool(assoc & {'vision', 'weak'}):
        signs.append('Sudden vision change or weakness/numbness on one side may be a sign of stroke.')
    if any(has_word(t, w) for w in ('seizure', 'convulsion', 'fainted', 'unconscious')):
        signs.append('Seizure, fainting or loss of consciousness requires urgent care.')
    if 'bone' in cats and 'fall' in assoc and sev_in == 'severe':
        signs.append('An injury with severe pain may need urgent examination.')
    if has_word(t, 'bleeding') and sev_in == 'severe':
        signs.append('Bleeding that is not stopping needs urgent care.')
    return signs


def compute_specialties(cats: list[str], patient: Optional[PatientContext]) -> list[dict]:
    scores: dict[str, int] = {}
    for cat in cats:
        for code, score in (L.CATEGORY_SPECIALTY_SCORES.get(cat) or {}).items():
            scores[code] = scores.get(code, 0) + score

    age = patient.age if patient else None
    conditions = [c.lower() for c in (patient.existing_conditions or [])] if patient else []
    if age is not None:
        if age < 18:
            scores['D007'] = scores.get('D007', 0) + 6
        if age >= 60:
            scores['D001'] = scores.get('D001', 0) + 3
    for c in conditions:
        if any(k in c for k in ('heart', 'hypertension', 'blood pressure', 'bp')):
            scores['D002'] = scores.get('D002', 0) + 4
            scores['D001'] = scores.get('D001', 0) + 2
        if 'diabet' in c:
            scores['D010'] = scores.get('D010', 0) + 4
            scores['D001'] = scores.get('D001', 0) + 2
        if 'asthma' in c or 'lung' in c:
            scores['D009'] = scores.get('D009', 0) + 4

    if not cats:
        scores['D001'] = scores.get('D001', 0) + 8

    ordered = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))[:3]
    max_score = ordered[0][1] if ordered else 1
    out = []
    for code, sc in ordered:
        meta = L.SPECIALTIES.get(code, {})
        out.append({
            'code': code,
            'specialty': meta.get('name', code),
            'department': meta.get('department', ''),
            'relevance': round(sc / max_score, 2),
        })
    return out

# ----------------------------- turn builders -----------------------------


def to_out(q: Question, rephrased: bool) -> dict:
    return {
        'id': q.id,
        'key': q.id,
        'text': q.simple_prompt if rephrased else q.prompt,
        'rephrased': rephrased,
        'options': [
            {'id': o.id, 'key': q.id + '.' + o.id, 'text': o.text, 'emoji': o.emoji}
            for o in q.options
        ],
    }


def build_category_question() -> dict:
    options = [
        {'id': c, 'key': 'category.' + c, 'text': L.CATEGORY_LABEL[c], 'emoji': L.CATEGORY_EMOJI[c]}
        for c in CATEGORIES
    ]
    options.append({'id': 'not_sure', 'key': 'category.not_sure', 'text': L.NOT_SURE.text, 'emoji': L.NOT_SURE.emoji})
    return {
        'id': 'category',
        'key': 'category',
        'text': lang.t('category_question', _fallback='What problem are you having?'),
        'rephrased': False,
        'options': options,
    }


def build_fallback_general() -> dict:
    return {
        'symptoms': [],
        'duration': {'label': 'Duration not clear yet'},
        'severity': {'level': 'mild', 'label': SEVERITY_LABEL['mild']},
        'urgency': {'level': 'green', 'label': URGENCY_LABEL['green']},
        'recommended_specialties': [
            {'code': 'D001', 'specialty': 'General Physician', 'department': 'General Medicine', 'relevance': 1}
        ],
        'emergency_flag': False,
        'warning_signs': [],
        'reason': lang.t('fallback_reason', _fallback='We could not identify a specific problem. Please start with a general physician.'),
        'disclaimer': DISCLAIMER,
    }

def build_result(cats: list[str], answers: list[dict], texts: list[str], patient: Optional[PatientContext]) -> dict:
    assoc = collect_assoc(answers)
    sev_raw = answer_sev(answers)
    onset = answer_onset(answers)
    warn_signs = compute_warn_signs(cats, assoc, texts, sev_raw)

    sev_map = {'little': 'mild', 'medium': 'moderate', 'severe': 'severe'}
    sev_level = sev_map.get(sev_raw, SEV_FALLBACK) if sev_raw else SEV_FALLBACK

    urgency = 'green'
    if warn_signs:
        urgency = 'red'
    elif sev_level == 'severe':
        urgency = 'orange'
    elif sev_level == 'moderate':
        urgency = 'yellow'
    elif onset.get('days') is not None and onset['days'] >= 8:
        urgency = 'yellow'

    if urgency == 'red':
        reason = lang.t('reason.red')
    elif urgency == 'orange':
        reason = lang.t('reason.orange')
    elif urgency == 'yellow':
        reason = lang.t('reason.yellow')
    else:
        reason = lang.t('reason.routine')

    return {
        'symptoms': extract_symptoms(texts),
        'duration': onset,
        'severity': {'level': sev_level, 'label': SEVERITY_LABEL[sev_level]},
        'urgency': {'level': urgency, 'label': URGENCY_LABEL[urgency]},
        'recommended_specialties': compute_specialties(cats, patient),
        'emergency_flag': urgency == 'red',
        'warning_signs': warn_signs,
        'reason': reason,
        'disclaimer': DISCLAIMER,
    }


def next_chat_turn(messages: list[dict], answers: list[dict], patient: Optional[dict] = None) -> dict:
    """Main adaptive conversation driver (see the TS port).

    Returns ``{'type': 'question', ...}`` or ``{'type': 'result', triage: ...}``.
    """
    texts = patient_texts(messages)
    answers = answers or []
    p = PatientContext(
        age=patient.get('age') if patient else None,
        gender=patient.get('gender') if patient else None,
        existing_conditions=patient.get('existing_conditions') if patient else None,
    )

    cats = L.detect_categories(texts)

    if not cats and answers:
        seen_cats: set[str] = set()
        for a in answers:
            ak = a.get('key', '')
            if ak == 'category':
                continue
            for cat, qlist in QUESTIONS.items():
                if any(q.id == ak for q in qlist):
                    seen_cats.add(cat)
                    break
        for c in seen_cats:
            cats.append(c)

    if not cats and not answers:
        return {'type': 'question', 'question': build_category_question(), 'done': False}

    cat_answer = answer_indent(answers, 'category')
    if cat_answer and cat_answer.get('answer') != 'not_sure':
        chosen = str(cat_answer.get('answer'))
        if chosen not in cats:
            cats.insert(0, chosen)
    if not cats and cat_answer and cat_answer.get('answer') == 'not_sure':
        return {'type': 'result', 'triage': build_fallback_general()}

    assoc = collect_assoc(answers)
    sev_raw = answer_sev(answers)
    warn_signs = compute_warn_signs(cats, assoc, texts, sev_raw)
    high_risk = [c for c in cats if c in ('chest', 'head', 'breathing')]
    if warn_signs and high_risk:
        return {'type': 'result', 'triage': build_result(cats, answers, texts, p)}

    index = 0
    while True:
        progressed = False
        found = None
        for cat in cats:
            qlist = QUESTIONS.get(cat, [])
            if index < len(qlist):
                progressed = True
                q = qlist[index]
                prev = answer_indent(answers, q.id)
                if prev and prev.get('answer') == 'not_sure' and not prev.get('rephrased'):
                    found = {'type': 'question', 'question': to_out(q, True), 'done': False}
                    break
                if prev is None:
                    found = {'type': 'question', 'question': to_out(q, False), 'done': False}
                    break
        if found:
            return found
        if not progressed:
            break
        index += 1

    return {'type': 'result', 'triage': build_result(cats, answers, texts, p)}