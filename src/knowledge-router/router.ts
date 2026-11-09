import type { SourceUnit } from '../contracts/source-map';
import type { RouterDecision, RouterDecisionSet, RouterRoute, RouterSignals, SourceMapInput } from './types';

const reviewObservations = new Set([
  'asr-suspect',
  'terminology-unstable',
  'has-notational-risk',
  'needs-cross-source-check',
  'needs-human-review',
]);

const learningContent = new Set([
  'definition', 'claim', 'explanation', 'derivation', 'worked-example', 'example',
  'analogy', 'opinion', 'problem-solving-tip', 'common-mistake', 'boundary-condition',
  'exam-pointer', 'exercise', 'formula', 'procedure',
]);

const supportContent = new Set(['example', 'worked-example', 'analogy', 'opinion', 'problem-solving-tip', 'common-mistake', 'exam-pointer']);

function hasReviewSignal(unit: SourceUnit): boolean {
  return unit.epistemicStatus === 'uncertain' || unit.epistemicStatus === 'conflict' ||
    unit.confidence?.level === 'low' || (unit.observations ?? []).some(item => reviewObservations.has(item.observation));
}

function signalsFor(unit: SourceUnit): RouterSignals {
  const reasons: string[] = [];
  const review = hasReviewSignal(unit);
  const learning = learningContent.has(unit.contentType) || Boolean(unit.keyTerms?.length);
  const highPreservation = unit.preservation.priority === 'must-preserve' || unit.preservation.priority === 'high';
  if (learning) reasons.push('learning-bearing content type or terms');
  if (highPreservation) reasons.push(`preservation=${unit.preservation.priority}`);
  if (review) reasons.push('source uncertainty or review observation');
  if (unit.contentType === 'administrative' || unit.contentType === 'narration') reasons.push(`non-knowledge contentType=${unit.contentType}`);
  if (unit.epistemicStatus === 'opinion' || unit.epistemicStatus === 'analogy') reasons.push(`epistemicStatus=${unit.epistemicStatus}`);
  const learningValue: RouterSignals['learningValue'] = learning || highPreservation ? 'high' : unit.contentType === 'unknown' ? 'unknown' : 'low';
  const uncertainty: RouterSignals['uncertainty'] = review ? 'high' : unit.confidence?.level === 'medium' ? 'medium' : 'low';
  return { learningValue, uncertainty, preservation: unit.preservation.priority, requiresReview: review, reasons };
}

export function routeSourceUnit(unit: SourceUnit): RouterDecision {
  const signals = signalsFor(unit);
  let route: RouterRoute;
  if (signals.requiresReview) route = 'review';
  else if (supportContent.has(unit.contentType)) route = 'support';
  else if (learningContent.has(unit.contentType) || signals.learningValue === 'high') route = 'compile';
  else route = 'retain-only';
  const includeInLessonModel = route !== 'retain-only';
  return {
    unitId: unit.unitId,
    sourceUnitRef: unit.unitId,
    route,
    includeInLessonModel,
    signals,
    confidence: 'deterministic',
    provider: 'deterministic',
  };
}

export function routeSourceMap(sourceMap: SourceMapInput, mode: 'shadow' | 'active' = 'shadow'): RouterDecisionSet {
  const decisions = sourceMap.units.map(routeSourceUnit);
  const counts: Record<RouterRoute, number> = { compile: 0, support: 0, review: 0, 'retain-only': 0 };
  for (const decision of decisions) counts[decision.route] += 1;
  return {
    contractVersion: 'knowledge-router/0.1',
    sourcePackageId: sourceMap.sourcePackageId,
    mode,
    provider: 'deterministic',
    decisions,
    selectedForLessonModel: decisions.filter(decision => decision.includeInLessonModel).map(decision => decision.unitId),
    retainedOnly: decisions.filter(decision => !decision.includeInLessonModel).map(decision => decision.unitId),
    counts,
    notes: [
      'Router is a high-recall routing sidecar; retain-only units remain in SourceMap.',
      mode === 'shadow' ? 'Shadow mode does not change LessonModel input.' : 'Active mode selects compile, support and review units for LessonModel input.',
    ],
  };
}

export function mergeJevRouterAnswers(base: RouterDecisionSet, answers: Readonly<Record<string, { readonly route: RouterRoute; readonly confidence: number; readonly probabilities?: Readonly<Record<string, number>> }>>): RouterDecisionSet {
  const decisions = base.decisions.map(decision => {
    const answer = answers[decision.unitId];
    if (!answer) return decision;
    // Deterministic evidence-risk signals are the safety floor. Jev may refine
    // a stable unit, but it cannot turn a unit with no source risk into a
    // review-only item merely because the question is ambiguous.
    const route = decision.signals.requiresReview ? 'review' : answer.route === 'review' ? decision.route : answer.route;
    const confidence: RouterDecision['confidence'] = answer.confidence >= 0.75 ? 'high' : answer.confidence >= 0.4 ? 'medium' : 'low';
    return { ...decision, route, includeInLessonModel: route !== 'retain-only', confidence, provider: 'jev' as const, ...(answer.probabilities ? { probabilities: answer.probabilities } : {}) };
  });
  const counts: Record<RouterRoute, number> = { compile: 0, support: 0, review: 0, 'retain-only': 0 };
  for (const decision of decisions) counts[decision.route] += 1;
  return { ...base, provider: 'mixed', decisions, selectedForLessonModel: decisions.filter(decision => decision.includeInLessonModel).map(decision => decision.unitId), retainedOnly: decisions.filter(decision => !decision.includeInLessonModel).map(decision => decision.unitId), counts };
}
