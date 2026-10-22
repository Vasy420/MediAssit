"""Mirrors backend tests/ai.test.ts to guarantee chat-contract parity."""


def test_unknown_text_asks_category_first(client):
    res = client.post('/ai/chat', json={
        'messages': [{'role': 'patient', 'text': 'Something feels off but I cannot explain'}],
        'answers': [],
    })
    assert res.status_code == 200
    data = res.json()
    assert data['type'] == 'question'
    assert data['question']['id'] == 'category'
    assert data['question']['options'][-1]['id'] == 'not_sure'


def test_knee_flow_targets_orthopedic_specialty(client):
    messages = [{'role': 'patient', 'text': 'My knee hurts after I fell and now I cannot walk properly'}]
    answers: list[dict] = []

    turn = client.post('/ai/chat', json={'messages': messages, 'answers': answers}).json()
    assert turn['type'] == 'question'

    answers.append({'key': 'Q_bone_sev', 'answer': 'severe'})
    turn = client.post('/ai/chat', json={'messages': [], 'answers': answers}).json()

    if turn['type'] == 'question':
        answers.append({'key': 'Q_bone_cause', 'answer': 'fall'})
        turn = client.post('/ai/chat', json={'messages': [], 'answers': answers}).json()

    guard = 0
    while turn['type'] == 'question' and guard < 20:
        q = turn['question']
        opt = q['options'][0]
        answers.append({'key': q['id'], 'answer': opt['id']})
        turn = client.post('/ai/chat', json={'messages': [], 'answers': answers}).json()
        guard += 1

    assert turn['type'] == 'result', f'Expected result, got {turn["type"]} after {guard} turns'
    triage = turn['triage']
    assert len(triage['recommended_specialties']) >= 1
    assert triage['recommended_specialties'][0]['code'] == 'D003'
    assert 'not a medical diagnosis' in triage['disclaimer']


def test_chest_pain_sweating_flags_emergency(client):
    messages = [{'role': 'patient', 'text': 'I have chest pain and I am sweating heavily'}]
    answers: list[dict] = []

    turn = client.post('/ai/chat', json={'messages': messages, 'answers': answers}).json()
    if turn['type'] == 'question':
        answers.append({'key': turn['question']['id'], 'answer': 'not_sure'})
        answers.append({'key': 'Q_chest_assoc', 'answer': 'sweating'})
        turn = client.post('/ai/chat', json={'messages': [], 'answers': answers}).json()
    if turn['type'] == 'question':
        answers.append({'key': turn['question']['id'], 'answer': 'severe'})
        turn = client.post('/ai/chat', json={'messages': [], 'answers': answers}).json()

    assert turn['type'] == 'result'
    triage = turn['triage']
    assert triage['urgency']['level'] == 'red'
    assert triage['emergency_flag'] is True
    assert triage['care']['setting'] == 'emergency'
    assert 'emergency' in triage['reason'].lower()


def test_named_fever_skips_the_category_buttons(client):
    res = client.post('/ai/chat', json={
        'messages': [{'role': 'patient', 'text': 'I have a fever'}],
        'answers': [],
    })
    data = res.json()
    assert data['type'] == 'question'
    assert data['question']['id'] == 'Q_fever_severity'
    assert data['question']['text'] == 'How bad do you feel with the fever?'
    assert data['question']['options'][0]['id'] == 'little'


def test_mild_fever_finishes_with_home_care_and_a_summary(client):
    messages = [{'role': 'patient', 'text': 'I have a fever'}]
    answers: list[dict] = []
    turn = client.post('/ai/chat', json={'messages': messages, 'answers': answers}).json()
    assert turn['question']['id'] == 'Q_fever_severity'

    answers.append({'key': 'Q_fever_severity', 'answer': 'little'})
    turn = client.post('/ai/chat', json={'messages': messages, 'answers': answers}).json()
    assert turn['question']['id'] == 'Q_fever_onset'

    answers.append({'key': 'Q_fever_onset', 'answer': 'today'})
    turn = client.post('/ai/chat', json={'messages': messages, 'answers': answers}).json()
    assert turn['question']['id'] == 'Q_fever_assoc'

    answers.append({'key': 'Q_fever_assoc', 'answer': 'chills'})
    turn = client.post('/ai/chat', json={'messages': messages, 'answers': answers}).json()
    assert turn['type'] == 'result'
    triage = turn['triage']
    assert triage['urgency']['level'] == 'green'
    assert triage['care']['setting'] == 'home'
    assert triage['care']['steps']
    assert 'I have a fever' in triage['ai_summary']
    assert 'home' in triage['ai_summary'].lower()