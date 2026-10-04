import type { SourceMap, SourceUnit } from '../contracts/source-map';

export type RouterRoute = 'compile' | 'support' | 'review' | 'retain-only';
export type RouterMode = 'shadow' | 'active';

export interface RouterSignals {
  readonly learningValue: 'high' | 'medium' | 'low' | 'unknown';
  readonly uncertainty: 'high' | 'medium' | 'low';
  readonly preservation: SourceUnit['preservation']['priority'];
  readonly requiresReview: boolean;
  readonly reasons: readonly string[];
}

export interface RouterDecision {
  readonly unitId: string;
  readonly route: RouterRoute;
  readonly includeInLessonModel: boolean;
  readonly signals: RouterSignals;
  readonly sourceUnitRef: string;
  readonly confidence: 'deterministic' | 'low' | 'medium' | 'high';
  readonly provider: 'deterministic' | 'jev';
  readonly probabilities?: Readonly<Record<string, number>>;
}

export interface RouterDecisionSet {
  readonly contractVersion: 'knowledge-router/0.1';
  readonly sourcePackageId: string;
  readonly mode: RouterMode;
  readonly provider: 'deterministic' | 'jev' | 'mixed';
  readonly decisions: readonly RouterDecision[];
  readonly selectedForLessonModel: readonly string[];
  readonly retainedOnly: readonly string[];
  readonly counts: Readonly<Record<RouterRoute, number>>;
  readonly notes: readonly string[];
}

export interface RouterJevAnswer {
  readonly route: RouterRoute;
  readonly learningValue?: number;
  readonly uncertainty?: number;
  readonly confidence: number;
  readonly probabilities?: Readonly<Record<string, number>>;
}

export type RouterJevAnswers = Readonly<Record<string, RouterJevAnswer>>;

export type SourceMapInput = Pick<SourceMap, 'sourcePackageId' | 'units'>;
