import { test, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app, auth, setupDb, teardownDb, tokenFrom } from './helpers.js';

before(async () => {
  await setupDb();
});
after(async () => {
  await teardownDb();
});

async function patientToken(email = 'ai@test.com') {
  const res = await request(app())
    .post('/api/auth/register')
    .send({ name: 'AI ' + email, email, password: 'Secret@123' });
  return tokenFrom(res.body);
}

test('POST /api/ai/chat asks a category question first for unknown text', async () => {
  const res = await request(app())
    .post('/api/ai/chat')
    .set(auth(await patientToken()))
    .send({ message: 'Something feels off but I cannot explain' });
  assert.strictEqual(res.status, 200);
  const data = res.body.data;
  assert.strictEqual(data.type, 'question');
  assert.strictEqual(data.question.id, 'category');
  assert.ok(data.conversation_id);
});

test('POST /api/ai/chat targets a specialty after adaptive question flow', async () => {
  const token = await patientToken('ai-knee@test.com');
  const headers = { Authorization: 'Bearer ' + token };
  let conversation_id: string | undefined;
  let turn: any;

  // 1. Patient describes knee problem
  let r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ message: 'My knee hurts after I fell and now I cannot walk properly' });
  conversation_id = r.body.data.conversation_id;
  turn = r.body.data;
  assert.ok(turn.type === 'question');

  // 2. Answer severity = very bad
  r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ conversation_id, answers: [{ key: 'Q_bone_sev', answer: 'severe' }] });
  turn = r.body.data;
  if (turn.type === 'question') {
    // 3. Answer fall/injury question
    r = await request(app())
      .post('/api/ai/chat')
      .set(headers)
      .send({ conversation_id, answers: [{ key: 'Q_bone_cause', answer: 'fall' }] });
    turn = r.body.data;
  }

  while (turn.type === 'question') {
    const q = turn.question;
    const opt = q.options[0];
    r = await request(app())
      .post('/api/ai/chat')
      .set(headers)
      .send({ conversation_id, answers: [{ key: q.id, answer: opt.id }] });
    turn = r.body.data;
  }

  assert.strictEqual(turn.type, 'result');
  const triage = turn.triage;
  assert.ok(triage.recommended_specialties.length >= 1);
  assert.strictEqual(triage.recommended_specialties[0].code, 'D003');
  assert.ok(triage.disclaimer.includes('not a medical diagnosis'));
});

test('POST /api/ai/chat flags an emergency for chest pain with sweating', async () => {
  const token = await patientToken('ai-chest@test.com');
  const headers = { Authorization: 'Bearer ' + token };
  let r = await request(app())
    .post('/api/ai/chat')
    .set(headers)
    .send({ message: 'I have chest pain and I am sweating heavily' });
  let turn = r.body.data;
  if (turn.type === 'question') {
    const q = turn.question;
    r = await request(app())
      .post('/api/ai/chat')
      .set(headers)
      .send({ conversation_id: r.body.data.conversation_id, answers: [{ key: q.id, answer: 'not_sure' }, { key: 'Q_chest_assoc', answer: 'sweating' }] });
    turn = r.body.data;
  }
  if (turn.type === 'question') {
    const q = turn.question;
    r = await request(app())
      .post('/api/ai/chat')
      .set(headers)
      .send({ conversation_id: r.body.data.conversation_id, answers: [{ key: q.id, answer: 'severe' }] });
    turn = r.body.data;
  }
  assert.strictEqual(turn.type, 'result');
  assert.strictEqual(turn.triage.urgency.level, 'red');
  assert.strictEqual(turn.triage.emergency_flag, true);
  assert.ok(turn.triage.reason.includes('emergency'));
});