import assert from 'node:assert/strict';
import { TypeSafeClient, choiceQuestion, scoreQuestion } from '../src/decision/typesafe.ts';

let request;
const client = new TypeSafeClient({
  apiKey: 'test-key',
  model: 'jev-1.13.0',
  baseUrl: 'https://example.test/v1/systemone',
  fetchImpl: async (url, init) => {
    request = { url, init };
    return { ok: true, status: 200, async json() { return { model: 'jev-1.13.0', answers: { route: { type: 'choice', choice: 'compile', confidence: 0.9, probabilities: { compile: 0.9, review: 0.1 } }, value: { type: 'score', score: 1.5, confidence: 0.8, probabilities: { '0': 0.1, '1': 0.2, '2': 0.7 } } } }; }, async text() { return ''; } };
  },
});
const response = await client.systemOne({ unitId: 'u1' }, { route: choiceQuestion('route?', { compile: 'compile', review: 'review' }), value: scoreQuestion('value?', ['low', 'high']) });
assert.equal(response.model, 'jev-1.13.0');
assert.equal(response.answers.route.choice, 'compile');
assert.equal(request.url, 'https://example.test/v1/systemone');
assert.equal(request.init.headers.authorization, 'Bearer test-key');
const body = JSON.parse(request.init.body);
assert.equal(body.model, 'jev-1.13.0');
assert.equal(body.questions.route.type, 'choice');
assert.equal(body.questions.value.type, 'score');
console.log('TypeSafe adapter checks passed');
