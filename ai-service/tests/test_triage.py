def test_triage_one_shot_with_answers(client):
    res = client.post('/ai/triage', json={
        'patient_context': {'age': 34, 'gender': 'male', 'existing_conditions': []},
        'messages': [{'role': 'patient', 'text': 'I have a severe headache and blurred vision'}],
        'answers': [
            {'key': 'Q_head_sev', 'answer': 'severe'},
            {'key': 'Q_head_assoc', 'answer': 'vision'},
        ],
    })
    assert res.status_code == 200
    data = res.json()
    # Head + vision warning sign is high-risk → immediate result
    assert data['type'] == 'result'
    triage = data['triage']
    assert triage['urgency']['level'] in ('red', 'orange', 'yellow')
    assert triage['symptoms']
    codes = [s['code'] for s in triage['recommended_specialties']]
    assert 'D005' in codes  # Neurologist


def test_triage_fallback_for_not_sure(client):
    res = client.post('/ai/triage', json={
        'messages': [],
        'answers': [{'key': 'category', 'answer': 'not_sure'}],
    })
    assert res.status_code == 200
    data = res.json()
    assert data['type'] == 'result'
    assert data['triage']['recommended_specialties'][0]['code'] == 'D001'


def test_patient_age_biases_pediatrics(client):
    res = client.post('/ai/triage', json={
        'patient_context': {'age': 5, 'gender': 'female', 'existing_conditions': []},
        'messages': [{'role': 'patient', 'text': 'my child has fever and a rash'}],
        'answers': [],
    })
    data = res.json()
    assert data['type'] == 'question'  # adaptive flow continues
    q = data['question']
    assert q['id'].startswith('Q_')