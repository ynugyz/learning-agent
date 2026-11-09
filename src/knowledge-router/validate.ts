import type { SourceMapInput } from './types';
import type { RouterDecisionSet, RouterRoute } from './types';

const routes = new Set<RouterRoute>(['compile', 'support', 'review', 'retain-only']);

export function validateRouterDecisionSet(decisions: RouterDecisionSet, sourceMap: SourceMapInput): string[] {
  const errors: string[] = [];
  if (decisions.contractVersion !== 'knowledge-router/0.1') errors.push('contractVersion must be knowledge-router/0.1');
  if (decisions.sourcePackageId !== sourceMap.sourcePackageId) errors.push('sourcePackageId mismatch');
  const expected = sourceMap.units.map(unit => unit.unitId);
  const actual = decisions.decisions.map(item => item.unitId);
  if (new Set(actual).size !== actual.length) errors.push('duplicate decision unitId');
  for (const unitId of expected) if (!actual.includes(unitId)) errors.push(`missing decision:${unitId}`);
  for (const unitId of actual) if (!expected.includes(unitId)) errors.push(`unknown decision:${unitId}`);
  for (const decision of decisions.decisions) {
    if (!routes.has(decision.route)) errors.push(`invalid route:${decision.unitId}`);
    if (!decision.sourceUnitRef || decision.sourceUnitRef !== decision.unitId) errors.push(`sourceUnitRef mismatch:${decision.unitId}`);
    if (decision.route === 'retain-only' && (decision.signals.requiresReview || decision.signals.learningValue === 'high' || decision.signals.preservation === 'must-preserve' || decision.signals.preservation === 'high')) errors.push(`high-value-or-uncertain retain-only:${decision.unitId}`);
  }
  const expectedSelected = decisions.decisions.filter(item => item.includeInLessonModel).map(item => item.unitId).sort();
  if (JSON.stringify(expectedSelected) !== JSON.stringify([...decisions.selectedForLessonModel].sort())) errors.push('selectedForLessonModel mismatch');
  return errors;
}
