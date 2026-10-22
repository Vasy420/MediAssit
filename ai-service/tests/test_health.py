def test_health_returns_ok(client):
    res = client.get('/health')
    assert res.status_code == 200
    body = res.json()
    assert body['status'] == 'ok'
    assert body['service'] == 'medassist-ai'
    assert body['llm'] in ('configured', 'offline')
    assert 'gsk_' not in str(body)
    assert 'api_key' not in body


def test_root_info(client):
    res = client.get('/')
    assert res.status_code == 200
    assert 'docs' in res.json()