import type { SourceUnit } from '../contracts/source-map';
import { choiceQuestion, scoreQuestion, type TypeSafeClient, type TypeSafeResponse } from '../decision/typesafe.ts';
import { mergeJevRouterAnswers } from './router.ts';
import type { RouterDecisionSet, RouterJevAnswer, RouterJevAnswers, RouterRoute } from './types';

const ROUTE_CRITERIA: Readonly<Record<RouterRoute, string>> = {
  compile: '核心知识、机制、定义、公式、过程或需要形成长期知识对象的内容。',
  support: '有学习价值的例子、类比、方法提醒、边界或教师观点，供知识对象引用。',
  review: '有价值但存在 ASR、术语、公式、来源或语境不确定，需要保留并带入后续判断。',
  'retain-only': '行政安排、纯粹过渡或无学习价值的噪声；仍保留在 SourceMap，不进入 LessonModel。',
};

const VALUE_LEVELS = ['没有可复用的学习信息', '有少量上下文价值', '包含应进入知识库的学习信息'];
const UNCERTAINTY_LEVELS = ['来源稳定，可以直接路由', '存在局部不确定，需要保留边界', '证据损坏或冲突，必须进入 review'];

function answerFor(response: TypeSafeResponse, unitId: string): RouterJevAnswer | undefined {
  const answer = response.answers[`${unitId}:route`];
  if (!answer?.choice || !['compile', 'support', 'review', 'retain-only'].includes(answer.choice)) return undefined;
  const value = response.answers[`${unitId}:value`];
  const uncertainty = response.answers[`${unitId}:uncertainty`];
  return { route: answer.choice as RouterRoute, confidence: answer.confidence ?? 0, ...(value?.score !== undefined ? { learningValue: value.score } : {}), ...(uncertainty?.score !== undefined ? { uncertainty: uncertainty.score } : {}), ...(answer.probabilities ? { probabilities: answer.probabilities } : {}) };
}

export function buildRouterQuestions(units: readonly SourceUnit[]): Readonly<Record<string, Readonly<Record<string, unknown>>>> {
  const questions: Record<string, Readonly<Record<string, unknown>>> = {};
  for (const unit of units) {
    questions[`${unit.unitId}:route`] = choiceQuestion('这条来源单元下一步应走哪条路径？只根据该单元提供的内容判断，不纠正事实。', ROUTE_CRITERIA);
    questions[`${unit.unitId}:value`] = scoreQuestion('这条来源单元包含多少可复用的学习信息？', VALUE_LEVELS);
    questions[`${unit.unitId}:uncertainty`] = scoreQuestion('这条来源单元的证据不确定性有多高？', UNCERTAINTY_LEVELS);
  }
  return questions;
}

export function buildRouterState(units: readonly SourceUnit[]): readonly Record<string, unknown>[] {
  return units.map(unit => ({ unitId: unit.unitId, contentType: unit.contentType, epistemicStatus: unit.epistemicStatus, preservation: unit.preservation, summary: unit.summary ?? '', keyTerms: unit.keyTerms ?? [], observations: unit.observations ?? [], confidence: unit.confidence ?? null }));
}

export async function evaluateRouterBatchWithJev(client: TypeSafeClient, units: readonly SourceUnit[], base: RouterDecisionSet): Promise<RouterDecisionSet> {
  const response = await client.systemOne(buildRouterState(units), buildRouterQuestions(units));
  const answers: Record<string, RouterJevAnswer> = {};
  for (const unit of units) {
    const route = answerFor(response, unit.unitId);
    if (route) answers[unit.unitId] = route;
  }
  const mapped: RouterJevAnswers = answers;
  return mergeJevRouterAnswers(base, mapped);
}
