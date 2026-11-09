#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { routeSourceMap, evaluateRouterBatchWithJev, validateRouterDecisionSet } from '../src/knowledge-router/index.ts';
import { TypeSafeClient } from '../src/decision/typesafe.ts';
import { auditHumanNote } from '../src/quality/index.ts';
import { evaluateHumanNoteWithJev } from '../src/quality/jev.ts';

const args = process.argv.slice(2);
const sourceMapPath = args.find(value => !value.startsWith('--'));
if (!sourceMapPath) throw new Error('usage: node --experimental-strip-types tools/knowledge-router-canary.mjs <source-map.json> [--note <note.md>] [--baseline <note.md>] [--out <dir>] [--mode shadow|active] [--live]');
const flagValue = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const mode = flagValue('--mode') ?? 'shadow';
if (mode !== 'shadow' && mode !== 'active') throw new Error('--mode must be shadow or active');
const notePath = flagValue('--note');
const baselinePath = flagValue('--baseline');
const lessonModelPath = flagValue('--lesson-model');
const live = args.includes('--live');
const repo = path.resolve(import.meta.dirname, '..');
const inputPath = path.resolve(repo, sourceMapPath);
const sourceMap = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const note = notePath ? fs.readFileSync(path.resolve(repo, notePath), 'utf8') : undefined;
const baseline = baselinePath ? fs.readFileSync(path.resolve(repo, baselinePath), 'utf8') : undefined;
const lessonModel = lessonModelPath ? JSON.parse(fs.readFileSync(path.resolve(repo, lessonModelPath), 'utf8')) : undefined;
const runId = `router-quality-${new Date().toISOString().replaceAll(/[-:.]/gu, '').replace('T', 'T').replace('Z', 'Z')}`;
const outputDir = path.resolve(repo, flagValue('--out') ?? `scratch/${runId}`);
fs.mkdirSync(outputDir, { recursive: true });
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const writeJson = (name, value) => fs.writeFileSync(path.join(outputDir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const readPrompt = name => fs.readFileSync(path.join(repo, 'prompts', name), 'utf8');

let router = routeSourceMap(sourceMap, mode);
let provider = 'deterministic';
let liveError = null;
let liveCallCount = 0;
const configuredApiKey = process.env.TEAMOROUTER_API_KEY ?? process.env.TYPESAFE_API_KEY;
const configuredBaseUrl = process.env.TEAMOROUTER_BASE_URL ?? (process.env.TEAMOROUTER_API_KEY ? 'https://api.teamorouter.cn/v1/systemone' : undefined);
const configuredModel = process.env.TEAMOROUTER_MODEL ?? process.env.TYPESAFE_MODEL ?? (process.env.TEAMOROUTER_API_KEY ? 'jev' : 'jev-1.13.0');
const createClient = () => new TypeSafeClient({ apiKey: configuredApiKey, model: configuredModel, ...(configuredBaseUrl ? { baseUrl: configuredBaseUrl } : {}) });
if (live) {
  if (!configuredApiKey) throw new Error('--live requires TEAMOROUTER_API_KEY or TYPESAFE_API_KEY; no request was sent');
  const client = createClient();
  try {
    for (let index = 0; index < sourceMap.units.length; index += 20) {
      router = await evaluateRouterBatchWithJev(client, sourceMap.units.slice(index, index + 20), router);
      liveCallCount += 1;
    }
    provider = 'jev';
  } catch (error) {
    liveError = String(error);
    provider = 'deterministic';
  }
}

const routerValidationErrors = validateRouterDecisionSet(router, sourceMap);
if (routerValidationErrors.length) throw new Error(`router decision validation failed: ${routerValidationErrors.join('; ')}`);
writeJson('router-decision.json', { ...router, provider, inputDigest: digest(fs.readFileSync(inputPath)), validation: { status: 'PASS', errors: [] }, prompt: { id: 'knowledge-router', version: '1', sha256: digest(readPrompt('knowledge-router.v1.md')) } });
let quality;
if (note !== undefined) {
  quality = auditHumanNote(note, sourceMap, lessonModel, baseline);
  if (live && !liveError) {
    const client = createClient();
    const qualityInput = lessonModel ?? { items: sourceMap.units.map(unit => ({ itemId: unit.unitId, kind: 'other', title: unit.keyTerms?.[0] ?? unit.unitId, statement: unit.summary ?? '', sourceUnitRefs: [unit.unitId] })) };
    quality = await evaluateHumanNoteWithJev(client, note, sourceMap, qualityInput, baseline);
    liveCallCount += 1;
  }
  writeJson('note-quality.json', { ...quality, prompt: { id: 'human-note-quality', version: '1', sha256: digest(readPrompt('human-note-quality.v1.md')) } });
}
const report = { runId, status: liveError ? 'completed_with_fallback' : 'completed', mode, provider, sourceMap: { path: inputPath, sourcePackageId: sourceMap.sourcePackageId, units: sourceMap.units.length, sha256: digest(fs.readFileSync(inputPath)) }, note: notePath ? path.resolve(repo, notePath) : null, liveRequested: live, liveError, modelCallCount: liveCallCount, routerBatchSize: 20, liveRouterBatches: live ? Math.ceil(sourceMap.units.length / 20) : 0, liveQualityCall: live && note !== undefined, artifacts: { routerDecision: 'router-decision.json', ...(note !== undefined ? { noteQuality: 'note-quality.json' } : {}) }, typeSafeModel: live ? configuredModel : null, typeSafeEndpoint: live ? (configuredBaseUrl ?? 'https://api.typesafe.ai/v1/systemone') : null };
writeJson('run-report.json', report);
fs.writeFileSync(path.join(outputDir, 'README.md'), `# Router / Quality Canary\n\n- status: ${report.status}\n- mode: ${mode}\n- provider: ${provider}\n- SourceMap units: ${sourceMap.units.length}\n- Router artifact: [router-decision.json](router-decision.json)\n${note !== undefined ? '- Quality artifact: [note-quality.json](note-quality.json)\n' : ''}- Production Vault modified: false\n- Core schemas modified: false\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
