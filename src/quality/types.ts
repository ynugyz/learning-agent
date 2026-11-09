export type QualityStatus = 'PASS' | 'REVIEW' | 'FAIL';

export interface QualityDimension {
  readonly score: number;
  readonly confidence: number;
  readonly provider: 'deterministic' | 'jev';
  readonly rationale?: string;
  readonly probabilities?: Readonly<Record<string, number>>;
}

export interface QualityIssue {
  readonly code: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly target?: string;
  readonly message: string;
  readonly evidenceRefs?: readonly string[];
  readonly confidence: number;
}

export interface HumanNoteQualityReport {
  readonly contractVersion: 'human-note-quality/0.1';
  readonly provider: 'deterministic' | 'jev' | 'mixed';
  readonly model?: string;
  readonly status: QualityStatus;
  readonly dimensions: Readonly<Record<string, QualityDimension>>;
  readonly issues: readonly QualityIssue[];
  readonly patchTargets: readonly string[];
  readonly baselinePreserved: boolean;
  readonly sourceMarkers: readonly string[];
  readonly notes: readonly string[];
}
