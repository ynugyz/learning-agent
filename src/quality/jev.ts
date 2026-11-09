import type { LessonModel } from '../contracts/lesson-model';
import type { SourceMap } from '../contracts/source-map';
import { scoreQuestion, type TypeSafeClient, type TypeSafeResponse } from '../decision/typesafe.ts';
import type { HumanNoteQualityReport, QualityDimension, QualityIssue } from './types';

const LEVELS = ['Missing or unusable for review', 'Partially present; a local repair is needed', 'Sufficient and useful for review'];
const QUESTIONS = {
  coverage: scoreQuestion('Does this note preserve the important knowledge-bearing material represented by the supplied source and lesson items?', LEVELS),
  explanation: scoreQuestion('Are definitions, mechanisms, conditions, formulas, procedures, examples or comparisons present when the material requires them?', LEVELS),
  boundaries: scoreQuestion('Are uncertainty, teacher opinion, simplification, missing formula and scope boundaries expressed where needed?', LEVELS),
  preservation: scoreQuestion('Does the candidate preserve the supplied baseline note content without silently dropping useful material?', LEVELS),
  reviewability: scoreQuestion('Can a learner scan this note and recover the knowledge for later review?', LEVELS),
  noise: scoreQuestion('Does the note avoid transcript narration, machine metadata and unsupported expansion?', LEVELS),
} as const;

function scoreAnswer(response: TypeSafeResponse, id: string): QualityDimension {
  const answer = response.answers[id];
  const score = answer?.score ?? 0;
  const confidence = answer?.confidence ?? 0;
  return { score: Math.max(0, Math.min(1, score / 2)), confidence, provider: 'jev', ...(answer?.probabilities ? { probabilities: answer.probabilities } : {}) };
}

export async function evaluateHumanNoteWithJev(client: TypeSafeClient, note: string, sourceMap: Pick<SourceMap, 'units'>, lessonModel: Pick<LessonModel, 'items'>, baseline?: string): Promise<HumanNoteQualityReport> {
  const state = { note, baseline: baseline ?? null, sourceMap: sourceMap.units, lessonModel: lessonModel.items };
  const response = await client.systemOne(state, QUESTIONS);
  const dimensions: Record<string, QualityDimension> = Object.fromEntries(Object.keys(QUESTIONS).map(id => [id, scoreAnswer(response, id)]));
  const issues: QualityIssue[] = [];
  for (const [id, value] of Object.entries(dimensions)) {
    if (value.score < 0.5) issues.push({ code: `JEV_${id.toUpperCase()}_LOW`, severity: value.confidence < 0.4 ? 'medium' : 'high', target: id, message: `Jev rated ${id} below the local repair threshold.`, confidence: value.confidence });
  }
  const average = Object.values(dimensions).reduce((sum, value) => sum + value.score, 0) / Object.keys(dimensions).length;
  const status = issues.some(item => item.severity === 'high') ? 'FAIL' : issues.length ? 'REVIEW' : average >= 0.75 ? 'PASS' : 'REVIEW';
  return { contractVersion: 'human-note-quality/0.1', provider: 'jev', ...(response.model ? { model: response.model } : {}), status, dimensions, issues, patchTargets: issues.map(item => item.target ?? item.code), baselinePreserved: (dimensions.preservation?.score ?? 0) >= 0.5, sourceMarkers: [], notes: [`jevAverageScore=${average.toFixed(3)}`, 'Jev scores are routing signals, not factual verification.'] };
}
