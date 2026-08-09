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
    turn = client.post('/ai/chat', json={
        'messages': [{'role': 'patient', 'text': 'My knee hurts after I fell and now I cannot walk properly'}],
        'answers': [],
    }).json()
    assert turn['type'] == 'question'

    # 1. Answer severity = severe
    turn = client.post('/ai/chat', json={
        'messages': [],
        'answers': [{'key': 'Q_bone_sev', 'answer': 'severe'}],
    }).json()
    if turn['type'] == 'question':
        # 2. Answer fall/injury question
        turn = client.post('/ai/chat', json={
            'messages': [],
            'answers': [{'key': 'Q_bone_cause', 'answer': 'fall'}],
        }).json()

    guard = 0
    while turn['type'] == 'question' and guard < 20:
        q = turn['question']
        opt = q['options'][0]
        turn = client.post('/ai/chat', json={
            'messages': [],
            'answers': [{'key': q['id'], 'answer': opt['id']}],
        }).json()
        guard += 1

    assert turn['type'] == 'result'
    triage = turn['triage']
    assert len(triage['recommended_specialties']) >= 1
    assert triage['recommended_specialties'][0]['code'] == 'D003'
    assert 'not a medical diagnosis' in triage['disclaimer']


def test_chest_pain_sweating_flags_emergency(client):
    turn = client.post('/ai/chat', json={
        'messages': [{'role': 'patient', 'text': 'I have chest pain and I am sweating heavily'}],
        'answers': [],
    }).json()
    if turn['type'] == 'question':
        q = turn['question']
        turn = client.post('/ai/chat', json={
            'messages': [],
            'answers': [
                {'key': q['id'], 'answer': 'not_sure'},
                {'key': 'Q_chest_assoc', 'answer': 'sweating'},
            ],
        }).json()
    if turn['type'] == 'question':
        q = turn['question']
        turn = client.post('/ai/chat', json={
            'messages': [],
            'answers': [{'key': q['id'], 'answer': 'severe'}],
        }).json()

    assert turn['type'] == 'result'
    triage = turn['triage']
    assert triage['urgency']['level'] == 'red'
    assert triage['emergency_flag'] is True
    assert 'emergency' in triage['reason'].lower()