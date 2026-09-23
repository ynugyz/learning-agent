/**
 * Human Note Composer v2 prototype types.
 *
 * These are implementation-facing prototype types, not an M1B schema. They
 * keep the two axes of LessonModel v2 explicit: concept structure is used for
 * semantic routing, while lecture flow controls presentation order only.
 */

export type TeachingFunction =
  | 'INTRO'
  | 'RECALL'
  | 'DEFINE'
  | 'EXPLAIN'
  | 'CAUSE'
  | 'MECHANISM'
  | 'COMPARE'
  | 'EXAMPLE'
  | 'COUNTEREXAMPLE'
  | 'DERIVE'
  | 'BOUNDARY'
  | 'WARNING'
  | 'METHOD'
  | 'TIP'
  | 'TRANSITION'
  | 'SUMMARY';

export type TransitionType =
  | 'CONTINUE'
  | 'CAUSE_TO_RESULT'
  | 'PROBLEM_TO_SOLUTION'
  | 'GENERAL_TO_SPECIFIC'
  | 'CONTRAST'
  | 'EXAMPLE_TO_ABSTRACTION'
  | 'LIMITATION_TO_NEXT_METHOD'
  | 'RECALL_TO_NEW_TOPIC';

export type ExpansionLevel = 'MENTION' | 'EXPLAINED' | 'DEVELOPED' | 'ANCHOR';

export type CoverageDisposition =
  | 'MAIN_NOTE'
  | 'RECALL_CONTEXT'
  | 'EXAMPLE'
  | 'WARNING'
  | 'SELF_TEST'
  | 'INTENTIONALLY_OMITTED';

export interface LectureFlowEntry {
  readonly flowOrder: number;
  readonly sourceModuleRefs: readonly string[];
  readonly currentTeachingFocus: string;
  readonly teachingFunction: TeachingFunction;
  readonly transitionType: TransitionType;
  readonly expansionEvidence: {
    readonly sourceUnitCount: number;
    readonly composition: Readonly<Record<string, number>>;
    readonly sourceSpan?: Readonly<{ start: string; end: string }>;
    readonly signals: readonly string[];
  };
  readonly expansionLevel: ExpansionLevel;
}

export interface LessonModelV2Module {
  readonly moduleId: string;
  readonly readingOrder: number;
  readonly kind: string;
  readonly title: string;
  readonly oneLine: string;
  readonly thesis: string | null;
  readonly sourceUnitRefs: readonly string[];
  readonly conceptStructure: {
    readonly definitions: readonly string[];
    readonly mechanisms: readonly string[];
    readonly boundaries: readonly string[];
    readonly examples: readonly string[];
    readonly comparisons: readonly string[];
    readonly prerequisite: readonly string[];
    readonly relations: readonly string[];
    readonly pedagogicalRole: string;
  };
  readonly lectureFlow: LectureFlowEntry;
  readonly uncertainty: Readonly<Record<string, unknown>>;
}

export interface KnowledgeAnchor {
  readonly anchorId: string;
  readonly moduleRefs: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly coreStatement: string;
  readonly expansionLevel: ExpansionLevel;
  readonly distinctInformation: readonly string[];
  readonly optionalExample?: string;
  readonly uncertainty: readonly string[];
  readonly mustNotExpandWith: readonly string[];
}

export interface CoverageLedgerEntry {
  readonly moduleRef: string;
  readonly disposition: CoverageDisposition;
  readonly sectionId: string;
  readonly accountedAs: string;
  readonly warning?: string;
}

export interface HumanNotePlan {
  readonly caseId: string;
  readonly noteGoal: string;
  readonly lessonThesis: string;
  readonly priorKnowledgeRecall: readonly string[];
  readonly orderedSections: readonly {
    readonly sectionId: string;
    readonly title: string;
    readonly moduleRefs: readonly string[];
    readonly prose: readonly string[];
    readonly anchors: readonly string[];
    readonly examples: readonly string[];
    readonly warnings: readonly string[];
    readonly selfTest?: readonly string[];
  }[];
  readonly knowledgeAnchors: readonly KnowledgeAnchor[];
  readonly coverageLedger: readonly CoverageLedgerEntry[];
}

export interface HumanNoteQualityAudit {
  readonly rhetoricalQuestionCount: number;
  readonly questionHeadingCount: number;
  readonly unsupportedAdditionCandidates: readonly string[];
  readonly redundancyCandidates: readonly string[];
  readonly expansionClicheHits: readonly string[];
  readonly relationProseExpansionCandidates: readonly string[];
  readonly machineMetadataLeakage: readonly string[];
  readonly lectureFlowOrder: 'PASS' | 'FAIL';
  readonly paragraphBulletBalance: Readonly<{ paragraphs: number; bullets: number }>;
  readonly sourceBoundary: 'PASS' | 'FAIL';
}
