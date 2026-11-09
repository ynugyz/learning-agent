import fs from 'node:fs';
import path from 'node:path';
import { TypeSafeClient } from '../src/decision/typesafe.ts';
import { evaluateNoteGateBatchWithJev, routeNoteCandidates, validateNoteGateDecisionSet } from '../src/knowledge-router/note-gate.ts';

const args = process.argv.slice(2);
const value = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const changePlanPath = args[0];
const alignmentPath = value('--alignment');
const outputDir = value('--out') ?? 'scratch/canary/note-inclusion-canary';
const live = args.includes('--live');
if (!changePlanPath || !alignmentPath) {
  console.error('usage: node --experimental-strip-types tools/note-inclusion-canary.mjs <change-plan.json> --alignment <alignment.json> [--out <dir>] [--live]');
  process.exit(2);
}

const readJson = file => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8').replace(/^\uFEFF/u, ''));
const writeJson = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8'); };
const plan = readJson(changePlanPath);
const alignment = readJson(alignmentPath);
const alignmentById = new Map((alignment.candidates ?? []).map(item => [item.alignmentId, item]));
const candidates = (plan.operations ?? []).map(operation => {
  const alignmentItem = (operation.alignmentRefs ?? []).map(ref => alignmentById.get(ref)).find(Boolean);
  const rationale = [operation.rationale, alignmentItem?.rationale, alignmentItem?.scopeNote].filter(Boolean).join(' ');
  const risks = [...(operation.risks ?? []), ...(alignmentItem?.scopeNote ? [alignmentItem.scopeNote] : [])];
  const existingCoverage = alignmentItem?.relation === 'NO_CHANGE' && alignmentItem?.resolutionState === 'resolved' ? 'covered' : operation.kind === 'create' ? 'new' : operation.kind === 'no_change' ? 'unknown' : 'partial';
  return { candidateId: operation.operationId, operationKind: operation.kind, targetRefs: operation.targetRefs ?? [], lessonItemRefs: operation.lessonItemRefs ?? [], sourceUnitRefs: operation.sourceUnitRefs ?? [], rationale, ...(operation.proposedText ? { proposedText: operation.proposedText } : {}), ...(risks.length ? { risks } : {}), existingCoverage };
});

const startedAt = Date.now();
let result = routeNoteCandidates(candidates, 'shadow');
let liveCalls = 0;
let liveError = null;
if (live) {
  const apiKey = process.env.TEAMOROUTER_API_KEY ?? process.env.TYPESAFE_API_KEY;
  if (!apiKey) throw new Error('--live requires TEAMOROUTER_API_KEY or TYPESAFE_API_KEY');
  const client = new TypeSafeClient({ apiKey, model: process.env.TEAMOROUTER_MODEL ?? 'jev', baseUrl: process.env.TEAMOROUTER_BASE_URL ?? 'https://api.teamorouter.cn/v1/systemone' });
  try {
    for (let index = 0; index < candidates.length; index += 20) {
      result = await evaluateNoteGateBatchWithJev(client, candidates.slice(index, index + 20), result);
      liveCalls += 1;
    }
  } catch (error) {
    liveError = String(error);
  }
}

const errors = validateNoteGateDecisionSet(result, candidates);
const report = {
  status: errors.length || liveError ? 'REVIEW' : 'completed',
  mode: live ? 'shadow-live' : 'shadow-deterministic',
  provider: result.provider,
  contractVersion: result.contractVersion,
  input: { changePlan: path.resolve(changePlanPath), alignment: path.resolve(alignmentPath), operations: candidates.length },
  liveCalls,
  liveError,
  validation: { status: errors.length ? 'FAIL' : 'PASS', errors },
  counts: result.counts,
  durationMs: Date.now() - startedAt,
};
const out = path.resolve(outputDir);
writeJson(path.join(out, 'note-gate.json'), result);
writeJson(path.join(out, 'run-report.json'), report);
fs.writeFileSync(path.join(out, 'README.md'), `# Human Note Inclusion Gate\n\n本目录是只读 canary。Jev 只判断 ChangePlan 候选是否进入 Human Note、以什么知识角色进入，不能删除已有正文，也没有写入 Production Vault。\n\n- 模式：${report.mode}\n- 候选数：${candidates.length}\n- Jev 请求数：${liveCalls}\n- 结果：${report.status}\n- 路由：${JSON.stringify(result.counts)}\n- 验证：${report.validation.status}\n\n文件：\n- note-gate.json：Choice/Score 结构化判断\n- run-report.json：运行与验证信息\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
