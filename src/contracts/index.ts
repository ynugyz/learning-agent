/**
 * Core contracts — barrel export (M1A REV1)
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 *
 * Four core contracts were rederived from design principles and revised under
 * human adjudication. LessonModel, Alignment and ChangePlan are additional
 * knowledge-compilation drafts; none has passed human review as a finished
 * design, and milestone M0 itself is still awaiting final human approval.
 *
 * | Contract | Question it answers |
 * | --- | --- |
 * | `SemanticCard` | How is one concept indexed machine-readably without duplicating the note? |
 * | `SourceMap` | What is actually present in this source package, and what is missing? |
 * | `AgentRuntime` | What may the pipeline ask of a runtime, and what comes back? |
 * | `RunManifest` | Is comparing this run with another valid? |
 * | `LessonModel` | What did the lesson teach and how do its parts relate? |
 * | `Alignment` | How does the lesson relate to existing knowledge? |
 * | `ChangePlan` | What reversible candidate changes should be proposed? |
 *
 * Nothing here orchestrates, validates, reads files or calls a model: these are
 * type and shape declarations only.
 *
 * @packageDocumentation
 */

// Primitives shared by two or more contracts with identical semantics.
export type {
  ReviewStatus,
  SchemaVersion,
  FingerprintAlg,
  Sha256Hex,
  Fingerprint,
} from './common';

export type {
  MaintenanceState,
  EpistemicState,
  EpistemicBasis,
  Anchor,
  EvidenceRef,
  SemanticCore,
  HumanNoteRef,
  SectionIndexEntry,
  ClaimRef,
  RelationType,
  RelationTarget,
  KnowledgeRelation,
  LearningAssetKind,
  LearningAssetRef,
  LearningAsset,
  UnresolvedItem,
  SemanticCardIntegrity,
  SemanticCard,
} from './semantic-card';

export type {
  SourceKind,
  SourceQualityIssue,
  SourceQuality,
  SourceEntry,
  ContentType,
  Preservation,
  SourceEpistemicStatus,
  Locator,
  UnitConfidence,
  UnitObservation,
  SourceUnit,
  MissingItem,
  Coverage,
  SourceConflict,
  SourceMap,
} from './source-map';

export type {
  RuntimeCapabilities,
  RuntimeMetadata,
  PromptRef,
  TaskInput,
  OutputSchemaRef,
  ModelRequest,
  ReasoningRequest,
  TaskLimits,
  TaskRequest,
  RuntimeOutput,
  ResolvedModel,
  ModelIdentity,
  Usage,
  ReasoningApplied,
  RuntimeResult,
  RunErrorKind,
  RunError,
  RuntimeInvocationResult,
  AgentRuntime,
  AgentRuntimeBoundaryDocument,
} from './agent-runtime';

export type {
  ManifestSourceRef,
  ManifestCaseId,
  ManifestGitState,
  ManifestRuntime,
  ManifestModel,
  ManifestReasoning,
  ManifestVersions,
  ManifestSourceBundle,
  ManifestPlatform,
  ManifestUsage,
  ManifestOmission,
  RunManifest,
} from './run-manifest';

export type {
  LessonItemKind,
  LessonEpistemicContext,
  LessonRelationType,
  LessonItem,
  LessonRelation,
  TeachingFlowEntry,
  LessonModel,
} from './lesson-model';

export type {
  AlignmentRelation,
  AlignmentConfidence,
  AlignmentResolutionState,
  AlignmentCandidate,
  Alignment,
} from './alignment';

export type {
  ChangeOperationKind,
  ChangeOperationStatus,
  ChangeOperation,
  ChangePlan,
} from './change-plan';
