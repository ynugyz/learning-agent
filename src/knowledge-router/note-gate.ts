import type { TypeSafeAnswer, TypeSafeClient, TypeSafeResponse } from '../decision/typesafe.ts';
import { choiceQuestion, scoreQuestion } from '../decision/typesafe.ts';

export type NoteGateRoute = 'include' | 'include-boundary' | 'defer' | 'skip-duplicate';
export type NoteKnowledgeRole = 'concept' | 'mechanism' | 'example' | 'comparison' | 'formula' | 'method' | 'boundary' | 'study-guidance' | 'relation';

export interface NoteGateCandidate {
  readonly candidateId: string;
  readonly operationKind: string;
  readonly targetRefs: readonly string[];
  readonly lessonItemRefs: readonly string[];
  readonly sourceUnitRefs: readonly string[];
  readonly rationale: string;
  readonly proposedText?: string;
  readonly risks?: readonly string[];
  readonly existingCoverage?: 'new' | 'partial' | 'covered' | 'unknown';
}

export interface NoteGateDecision {
  readonly candidateId: string;
  readonly route: NoteGateRoute;
  readonly role: NoteKnowledgeRole;
  readonly confidence: number;
  readonly learningValue: number;
  readonly evidenceSufficiency: number;
  readonly redundancy: number;
  readonly reviewUtility: number;
  readonly targetRefs: readonly string[];
  readonly lessonItemRefs: readonly string[];
  readonly sourceUnitRefs: readonly string[];
  readonly provider: 'deterministic' | 'jev' | 'mixed';
  readonly rationale: string;
  readonly probabilities?: Readonly<Record<string, number>>;
}

export interface NoteGateDecisionSet {
  readonly contractVersion: 'human-note-gate/0.1';
  readonly mode: 'shadow' | 'active';
  readonly provider: 'deterministic' | 'jev' | 'mixed';
  readonly decisions: readonly NoteGateDecision[];
  readonly counts: Readonly<Record<NoteGateRoute, number>>;
  readonly notes: readonly string[];
}

const ROUTE_CRITERIA: Readonly<Record<NoteGateRoute, string>> = {
  include: '将该候选作为直接知识内容写入 Human Note；证据足够，且具有独立复习价值。',
  'include-boundary': '写入 Human Note，但必须用边界、课程口径、类比或教师观点的方式表达，不能写成无条件事实。',
  defer: '候选有潜在价值，但证据、公式、术语、范围或来源不足，本轮只保留为待补项。',
  'skip-duplicate': '已有知识页已经覆盖，写入会制造重复；保留链接或机器层 provenance 即可。',
};

const ROLE_CRITERIA: Readonly<Record<NoteKnowledgeRole, string>> = {
  concept: '定义、分类或核心知识对象。',
  mechanism: '解释如何运作、为何成立或前后条件。',
  example: '帮助恢复机制的最小例子、类比或应用。',
  comparison: '并列概念之间的差异、取舍或适用范围。',
  formula: '公式、变量、推导或计算规则。',
  method: '步骤、判断路径、做题方法或操作流程。',
  boundary: '限制、反例、证据缺口、冲突或适用边界。',
  'study-guidance': '复习建议、检查表或学习动作。',
  relation: '与已有页面的有意义连接或前置/后续关系。',
};

const SCORE_LEVELS = ['没有或不可用', '部分有用，需要局部处理', '充分且可直接复用'];
const DEFER_PATTERN = /(?:暂缓|deferred|证据不足|无法确定|不确定|损坏|缺失|不稳定|uncertain|uncertainty|unstable|damaged|missing|unclear|cannot|not reliably|not fully specified)/iu;
const BOUNDARY_PATTERN = /(?:观点|类比|建议|口径|范围|边界|风险|不作为|analogy|opinion|advice)/iu;

function count(decisions: readonly NoteGateDecision[]): Readonly<Record<NoteGateRoute, number>> {
  return {
    include: decisions.filter(item => item.route === 'include').length,
    'include-boundary': decisions.filter(item => item.route === 'include-boundary').length,
    defer: decisions.filter(item => item.route === 'defer').length,
    'skip-duplicate': decisions.filter(item => item.route === 'skip-duplicate').length,
  };
}

function roleFor(candidate: NoteGateCandidate): NoteKnowledgeRole {
  const text = `${candidate.rationale} ${candidate.proposedText ?? ''}`;
  if (/公式|formula|推导|计算/u.test(text)) return 'formula';
  if (/例子|类比|example|analogy/u.test(text)) return 'example';
  if (/比较|差异|取舍|comparison/u.test(text)) return 'comparison';
  if (/步骤|方法|流程|procedure|method/u.test(text)) return 'method';
  if (/关系|链接|前置|后续|relation|link/u.test(text)) return 'relation';
  if (BOUNDARY_PATTERN.test(text)) return 'boundary';
  return candidate.operationKind === 'link' || candidate.operationKind === 'add_relation' ? 'relation' : 'concept';
}

function deterministicRoute(candidate: NoteGateCandidate): NoteGateRoute {
  const text = `${candidate.rationale} ${(candidate.risks ?? []).join(' ')} ${candidate.proposedText ?? ''}`;
  if (DEFER_PATTERN.test(text)) return 'defer';
  if (candidate.operationKind === 'no_change' || candidate.existingCoverage === 'covered') return 'skip-duplicate';
  if (candidate.operationKind === 'link' || candidate.operationKind === 'add_relation') return 'include-boundary';
  return BOUNDARY_PATTERN.test(text) ? 'include-boundary' : 'include';
}

export function routeNoteCandidates(candidates: readonly NoteGateCandidate[], mode: 'shadow' | 'active' = 'shadow'): NoteGateDecisionSet {
  const decisions = candidates.map(candidate => {
    const route = deterministicRoute(candidate);
    const evidence = route === 'defer' ? 0 : 1;
    const covered = route === 'skip-duplicate';
    return {
      candidateId: candidate.candidateId,
      route,
      role: roleFor(candidate),
      confidence: route === 'defer' || route === 'skip-duplicate' ? 0.9 : 0.7,
      learningValue: covered ? 0.5 : 1,
      evidenceSufficiency: evidence,
      redundancy: covered ? 1 : 0,
      reviewUtility: covered ? 0.5 : 1,
      targetRefs: candidate.targetRefs,
      lessonItemRefs: candidate.lessonItemRefs,
      sourceUnitRefs: candidate.sourceUnitRefs,
      provider: 'deterministic' as const,
      rationale: route === 'defer' ? '证据或语境不足，保留为待补项。' : route === 'skip-duplicate' ? '已有知识状态覆盖或本操作不产生正文。' : '候选具有独立学习价值。',
    } satisfies NoteGateDecision;
  });
  return { contractVersion: 'human-note-gate/0.1', mode, provider: 'deterministic', decisions, counts: count(decisions), notes: ['Deterministic evidence floor applied.', 'This sidecar controls candidate inclusion only; it cannot delete existing Human Note content.'] };
}

export function buildNoteGateState(candidates: readonly NoteGateCandidate[]): readonly Record<string, unknown>[] {
  return candidates.map(candidate => ({
    candidateId: candidate.candidateId,
    operationKind: candidate.operationKind,
    targetRefs: candidate.targetRefs,
    lessonItemRefs: candidate.lessonItemRefs,
    sourceUnitRefs: candidate.sourceUnitRefs,
    existingCoverage: candidate.existingCoverage ?? 'unknown',
    rationale: candidate.rationale,
    proposedText: candidate.proposedText ?? '',
    risks: candidate.risks ?? [],
  }));
}

export function buildNoteGateQuestions(candidates: readonly NoteGateCandidate[]): Readonly<Record<string, Readonly<Record<string, unknown>>>> {
  const questions: Record<string, Readonly<Record<string, unknown>>> = {};
  for (const candidate of candidates) {
    questions[`${candidate.candidateId}:route`] = choiceQuestion('这条候选内容是否应该进入 Human Note？只根据提供的候选、关系和证据判断，不补写事实。', ROUTE_CRITERIA);
    questions[`${candidate.candidateId}:role`] = choiceQuestion('如果进入 Human Note，它最主要承担什么知识角色？', ROLE_CRITERIA);
    questions[`${candidate.candidateId}:learningValue`] = scoreQuestion('这条候选对长期理解和复习的价值有多高？', SCORE_LEVELS);
    questions[`${candidate.candidateId}:evidenceSufficiency`] = scoreQuestion('现有来源是否足以支持准确表达这条候选？', SCORE_LEVELS);
    questions[`${candidate.candidateId}:redundancy`] = scoreQuestion('这条候选与已有知识的重复程度有多高？', SCORE_LEVELS);
    questions[`${candidate.candidateId}:reviewUtility`] = scoreQuestion('这条候选对未来快速恢复知识有多大帮助？', SCORE_LEVELS);
  }
  return questions;
}

function answer(response: TypeSafeResponse, id: string): TypeSafeAnswer | undefined {
  return response.answers[id];
}

function mergeRoute(base: NoteGateRoute, suggested: NoteGateRoute, evidence: number, redundancy: number): NoteGateRoute {
  if (base === 'defer' || evidence < 0.5) return 'defer';
  if (base === 'skip-duplicate' || redundancy >= 0.75) return 'skip-duplicate';
  if (base === 'include-boundary' || suggested === 'include-boundary') return 'include-boundary';
  return suggested === 'defer' ? base : suggested;
}

export function mergeJevNoteGateAnswers(base: NoteGateDecisionSet, response: TypeSafeResponse): NoteGateDecisionSet {
  const decisions = base.decisions.map(item => {
    const routeAnswer = answer(response, `${item.candidateId}:route`);
    const normalizeScore = (score: number | undefined, fallback: number): number => {
      if (score === undefined) return fallback;
      return score > 1 ? score / 2 : score;
    };
    const evidence = normalizeScore(answer(response, `${item.candidateId}:evidenceSufficiency`)?.score, item.evidenceSufficiency);
    const redundancy = normalizeScore(answer(response, `${item.candidateId}:redundancy`)?.score, item.redundancy);
    const suggested = routeAnswer?.choice && Object.prototype.hasOwnProperty.call(ROUTE_CRITERIA, routeAnswer.choice) ? routeAnswer.choice as NoteGateRoute : item.route;
    // Role is a presentation hint. The deterministic role is derived from
    // the candidate's explicit operation/evidence wording and remains the
    // stable value used by downstream rendering. Jev still answers the role
    // question for audit, but a free-form semantic guess must not silently
    // relabel a concept as generic study guidance.
    const role = item.role;
    return {
      ...item,
      route: mergeRoute(item.route, suggested, evidence, redundancy),
      role,
      confidence: routeAnswer?.confidence ?? item.confidence,
      learningValue: normalizeScore(answer(response, `${item.candidateId}:learningValue`)?.score, item.learningValue),
      evidenceSufficiency: evidence,
      redundancy,
      reviewUtility: normalizeScore(answer(response, `${item.candidateId}:reviewUtility`)?.score, item.reviewUtility),
      provider: 'mixed' as const,
      ...(routeAnswer?.probabilities ? { probabilities: routeAnswer.probabilities } : {}),
      rationale: routeAnswer?.choice === 'defer' || item.route === 'defer' ? 'Jev 判断与确定性证据规则均要求暂缓。' : 'Jev 对候选的进入路径和知识角色进行了结构化判断。',
    } satisfies NoteGateDecision;
  });
  return { ...base, provider: 'mixed', decisions, counts: count(decisions), notes: [...base.notes, 'Jev Choice/Score answers were merged under the deterministic evidence floor.'] };
}

export async function evaluateNoteGateBatchWithJev(client: TypeSafeClient, candidates: readonly NoteGateCandidate[], base: NoteGateDecisionSet): Promise<NoteGateDecisionSet> {
  const response = await client.systemOne(buildNoteGateState(candidates), buildNoteGateQuestions(candidates));
  return mergeJevNoteGateAnswers(base, response);
}

export function validateNoteGateDecisionSet(result: NoteGateDecisionSet, candidates: readonly NoteGateCandidate[]): readonly string[] {
  const errors: string[] = [];
  const expected = new Set(candidates.map(item => item.candidateId));
  const seen = new Set<string>();
  for (const item of result.decisions) {
    if (!expected.has(item.candidateId)) errors.push(`unknown candidate ${item.candidateId}`);
    if (seen.has(item.candidateId)) errors.push(`duplicate decision ${item.candidateId}`);
    seen.add(item.candidateId);
    if (item.route === 'include' && item.evidenceSufficiency < 0.5) errors.push(`include with insufficient evidence ${item.candidateId}`);
    if (item.route === 'defer' && item.confidence >= 0.95 && item.evidenceSufficiency >= 0.9) errors.push(`defer contradicts high evidence ${item.candidateId}`);
  }
  for (const candidate of candidates) if (!seen.has(candidate.candidateId)) errors.push(`missing decision ${candidate.candidateId}`);
  return errors;
}
