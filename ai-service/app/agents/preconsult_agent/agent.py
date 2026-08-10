"""Pre-consultation interview engine — collects structured patient info before doctor consultation."""
from __future__ import annotations

from typing import Optional

from .types import NOT_SURE, TOPICS, Option, PreConsultSummary, Question

WELCOME_MESSAGE = (
    "Welcome to your pre-consultation interview. "
    "I'll ask you a few questions to help your doctor prepare for your visit. "
    "This should only take a couple of minutes."
)

QUESTIONS = {
    'chief_complaint': Question(
        id='chief_complaint',
        prompt='What is the main reason for your visit today? Please describe briefly.',
        simple_prompt='What brings you in today?',
        options=[
            Option(id='free_text', emoji='', text='Type your answer'),
        ],
    ),
    'symptoms_duration': Question(
        id='symptoms_duration',
        prompt='How long have you been experiencing these symptoms?',
        simple_prompt='How long has this been going on?',
        options=[
            Option(id='less_than_day', emoji='', text='Less than a day'),
            Option(id='1_to_3_days', emoji='', text='1–3 days'),
            Option(id='4_to_7_days', emoji='', text='4–7 days'),
            Option(id='1_to_4_weeks', emoji='', text='1–4 weeks'),
            Option(id='more_than_month', emoji='', text='More than a month'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'symptoms_severity': Question(
        id='symptoms_severity',
        prompt='How would you rate the severity of your symptoms?',
        simple_prompt='How bad are your symptoms?',
        options=[
            Option(id='mild', emoji='', text='Mild — noticeable but not interfering'),
            Option(id='moderate', emoji='', text='Moderate — somewhat interfering'),
            Option(id='severe', emoji='', text='Severe — significantly affecting daily life'),
            Option(id='very_severe', emoji='', text='Very severe — unable to function normally'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'medications_current': Question(
        id='medications_current',
        prompt='Are you currently taking any medications (prescription or over-the-counter)?',
        simple_prompt='Are you on any medications?',
        options=[
            Option(id='yes_list', emoji='', text='Yes — I will list them'),
            Option(id='none', emoji='', text='None'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'medications_list': Question(
        id='medications_list',
        prompt='Please list your current medications, including dosage if you know it.',
        simple_prompt='What medications are you taking?',
        options=[
            Option(id='free_text', emoji='', text='Type your medications'),
        ],
    ),
    'allergies': Question(
        id='allergies',
        prompt='Do you have any known allergies (medications, food, latex, etc.)?',
        simple_prompt='Do you have any allergies?',
        options=[
            Option(id='yes_list', emoji='', text='Yes — I will list them'),
            Option(id='none', emoji='', text='None'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'allergies_list': Question(
        id='allergies_list',
        prompt='Please list your allergies.',
        simple_prompt='What are you allergic to?',
        options=[
            Option(id='free_text', emoji='', text='Type your allergies'),
        ],
    ),
    'history_conditions': Question(
        id='history_conditions',
        prompt='Do you have any chronic medical conditions (e.g., diabetes, hypertension, asthma)?',
        simple_prompt='Do you have any ongoing health conditions?',
        options=[
            Option(id='yes_list', emoji='', text='Yes — I will list them'),
            Option(id='none', emoji='', text='None'),
            Option(id=NOT_SURE, emoji='', text='Not sure'),
        ],
    ),
    'history_conditions_list': Question(
        id='history_conditions_list',
        prompt='Please list your chronic conditions or past major illnesses/surgeries.',
        simple_prompt='What ongoing conditions or past surgeries do you have?',
        options=[
            Option(id='free_text', emoji='', text='Type your history'),
        ],
    ),
    'lifestyle': Question(
        id='lifestyle',
        prompt='Do you smoke, drink alcohol, or use any recreational substances? (This helps the doctor understand your overall health.)',
        simple_prompt='Do you smoke or drink?',
        options=[
            Option(id='smoking', emoji='', text='Smoking'),
            Option(id='alcohol', emoji='', text='Alcohol consumption'),
            Option(id='both', emoji='', text='Both smoking and alcohol'),
            Option(id='none', emoji='', text='Neither'),
            Option(id='prefer_not', emoji='', text='Prefer not to say'),
        ],
    ),
    'vitals_temp': Question(
        id='vitals_temp',
        prompt='Do you know your current body temperature? If you have a thermometer at home.',
        simple_prompt='Do you have a fever? Do you know your temperature?',
        options=[
            Option(id='normal', emoji='', text='Normal (below 37.5°C / 99.5°F)'),
            Option(id='mild_fever', emoji='', text='Mild fever (37.5–38.5°C / 99.5–101.3°F)'),
            Option(id='high_fever', emoji='', text='High fever (above 38.5°C / 101.3°F)'),
            Option(id='unknown', emoji='', text='I don\'t know'),
        ],
    ),
    'confirm_done': Question(
        id='confirm_done',
        prompt='Thank you. I have collected all the information I need. Is there anything else you would like to add before I generate the summary?',
        simple_prompt='Anything else you want to mention?',
        options=[
            Option(id='add_more', emoji='', text='Yes, I want to add something'),
            Option(id='done', emoji='', text='No, I am done'),
        ],
    ),
}

TOPIC_QUESTIONS = {
    'chief_complaint': ['chief_complaint'],
    'symptoms': ['symptoms_duration', 'symptoms_severity'],
    'medications': ['medications_current', 'medications_list'],
    'allergies': ['allergies', 'allergies_list'],
    'history': ['history_conditions', 'history_conditions_list'],
    'lifestyle': ['lifestyle'],
    'vitals': ['vitals_temp'],
}

TOPIC_ORDER = ['chief_complaint', 'symptoms', 'medications', 'allergies', 'history', 'lifestyle', 'vitals']


def _next_unanswered_topic(answers: list[dict]) -> Optional[str]:
    answered_keys = {a['key'] for a in answers}
    for topic in TOPIC_ORDER:
        required = TOPIC_QUESTIONS[topic]
        all_done = all(
            k in answered_keys
            for k in required
            if k not in ('medications_list', 'allergies_list', 'history_conditions_list')
        )
        if not all_done:
            return topic
        if 'medications_current' in answered_keys and 'medications_list' not in answered_keys:
            med_answer = next((a['answer'] for a in answers if a['key'] == 'medications_current'), '')
            if med_answer == 'yes_list':
                return topic
        if 'allergies' in answered_keys and 'allergies_list' not in answered_keys:
            allergy_answer = next((a['answer'] for a in answers if a['key'] == 'allergies'), '')
            if allergy_answer == 'yes_list':
                return topic
        if 'history_conditions' in answered_keys and 'history_conditions_list' not in answered_keys:
            history_answer = next((a['answer'] for a in answers if a['key'] == 'history_conditions'), '')
            if history_answer == 'yes_list':
                return topic
    return None


def _next_question_for_topic(topic: str, answers: list[dict]) -> Optional[Question]:
    answered_keys = {a['key'] for a in answers}
    required = TOPIC_QUESTIONS[topic]
    for qid in required:
        if qid not in answered_keys:
            if qid == 'medications_list':
                med_answer = next((a['answer'] for a in answers if a['key'] == 'medications_current'), '')
                if med_answer != 'yes_list':
                    continue
            if qid == 'allergies_list':
                allergy_answer = next((a['answer'] for a in answers if a['key'] == 'allergies'), '')
                if allergy_answer != 'yes_list':
                    continue
            if qid == 'history_conditions_list':
                history_answer = next((a['answer'] for a in answers if a['key'] == 'history_conditions'), '')
                if history_answer != 'yes_list':
                    continue
            return QUESTIONS.get(qid)
    return None


def _build_summary(answers: list[dict], messages: list[dict], triage_context: Optional[dict] = None) -> dict:
    answer_map = {a['key']: a['answer'] for a in answers}
    free_texts = [m['text'] for m in messages if m['role'] == 'patient' and m['text'] not in answer_map.values()]

    chief_complaint = ''
    for m in messages:
        if m['role'] == 'patient' and 'chief_complaint' not in answer_map:
            chief_complaint = m['text']
            break

    symptoms = []
    if 'symptoms_duration' in answer_map:
        duration_labels = {
            'less_than_day': 'Less than a day',
            '1_to_3_days': '1–3 days',
            '4_to_7_days': '4–7 days',
            '1_to_4_weeks': '1–4 weeks',
            'more_than_month': 'More than a month',
        }
        symptoms.append({
            'duration': duration_labels.get(answer_map['symptoms_duration'], answer_map['symptoms_duration']),
            'severity': answer_map.get('symptoms_severity', 'Not reported'),
        })

    medications = []
    if 'medications_current' in answer_map and answer_map['medications_current'] == 'yes_list':
        med_list = answer_map.get('medications_list', '')
        if med_list:
            medications = [m.strip() for m in med_list.split(',') if m.strip()]

    allergies = []
    if 'allergies' in answer_map and answer_map['allergies'] == 'yes_list':
        allergy_list = answer_map.get('allergies_list', '')
        if allergy_list:
            allergies = [a.strip() for a in allergy_list.split(',') if a.strip()]

    medical_history = ''
    if 'history_conditions' in answer_map and answer_map['history_conditions'] == 'yes_list':
        medical_history = answer_map.get('history_conditions_list', '')

    lifestyle_labels = {
        'smoking': 'Smoking',
        'alcohol': 'Alcohol consumption',
        'both': 'Both smoking and alcohol',
        'none': 'None reported',
        'prefer_not': 'Prefer not to say',
    }
    lifestyle = lifestyle_labels.get(answer_map.get('lifestyle', 'none'), 'Not reported')

    vitals = {}
    temp_labels = {
        'normal': 'Normal (below 37.5°C)',
        'mild_fever': 'Mild fever (37.5–38.5°C)',
        'high_fever': 'High fever (above 38.5°C)',
        'unknown': 'Unknown',
    }
    if 'vitals_temp' in answer_map:
        vitals['temperature'] = temp_labels.get(answer_map['vitals_temp'], answer_map['vitals_temp'])

    from datetime import datetime
    return {
        'chief_complaint': chief_complaint,
        'symptoms': symptoms,
        'medications': medications,
        'allergies': allergies,
        'medical_history': medical_history,
        'lifestyle_notes': lifestyle,
        'vital_signs': vitals,
        'triage_context': triage_context or {},
        'generated_at': datetime.utcnow().isoformat(),
    }


def next_turn(
    messages: list[dict],
    answers: list[dict],
    triage_context: Optional[dict] = None,
    patient_context: Optional[dict] = None,
) -> dict:
    if len(messages) == 0:
        return {
            'type': 'question',
            'question': {
                'id': 'welcome',
                'key': '',
                'text': WELCOME_MESSAGE,
                'rephrased': False,
                'options': [
                    {'id': 'start', 'key': 'start', 'text': 'Let\'s begin', 'emoji': ''},
                ],
            },
            'done': False,
        }

    if len(answers) < 2 and not any(a.get('key') == 'chief_complaint' for a in answers):
        q = QUESTIONS['chief_complaint']
        return {
            'type': 'question',
            'question': {
                'id': q.id,
                'key': q.id,
                'text': q.prompt,
                'rephrased': False,
                'options': [{'id': o.id, 'key': o.id, 'text': o.text, 'emoji': o.emoji} for o in q.options],
            },
            'done': False,
        }

    if any(a.get('key') == 'confirm_done' for a in answers):
        done_answer = next((a['answer'] for a in answers if a.get('key') == 'confirm_done'), '')
        if done_answer == 'done':
            summary = _build_summary(answers, messages, triage_context)
            return {
                'type': 'result',
                'preconsult_summary': summary,
                'done': True,
            }
        else:
            q = QUESTIONS['chief_complaint']
            return {
                'type': 'question',
                'question': {
                    'id': q.id,
                    'key': 'chief_complaint_followup',
                    'text': 'What else would you like to add?',
                    'rephrased': False,
                    'options': [{'id': 'free_text', 'key': 'free_text', 'text': 'Type your answer', 'emoji': ''}],
                },
                'done': False,
            }

    topic = _next_unanswered_topic(answers)
    if topic is None:
        q = QUESTIONS['confirm_done']
        return {
            'type': 'question',
            'question': {
                'id': q.id,
                'key': q.id,
                'text': q.prompt,
                'rephrased': False,
                'options': [{'id': o.id, 'key': o.id, 'text': o.text, 'emoji': o.emoji} for o in q.options],
            },
            'done': False,
        }

    question = _next_question_for_topic(topic, answers)
    if question is None:
        q = QUESTIONS['confirm_done']
        return {
            'type': 'question',
            'question': {
                'id': q.id,
                'key': q.id,
                'text': q.prompt,
                'rephrased': False,
                'options': [{'id': o.id, 'key': o.id, 'text': o.text, 'emoji': o.emoji} for o in q.options],
            },
            'done': False,
        }

    return {
        'type': 'question',
        'question': {
            'id': question.id,
            'key': question.id,
            'text': question.prompt if len(answers) < 5 else question.simple_prompt,
            'rephrased': False,
            'options': [{'id': o.id, 'key': o.id, 'text': o.text, 'emoji': o.emoji} for o in question.options],
        },
        'done': False,
    }
