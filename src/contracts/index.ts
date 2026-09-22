/**
 * Core contracts — barrel export.
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 *
 * These four contracts were rederived during M1A from design principles and
 * have NOT passed human review. Milestone M0 itself is still awaiting final
 * human approval.
 *
 * Four documents, intentionally small and closed:
 *
 * | Contract | Question it answers |
 * | --- | --- |
 * | `SemanticCard` | How is one concept indexed machine-readably without duplicating the note? |
 * | `SourceMap` | What is actually present in this source package, and what is missing? |
 * | `AgentRuntime` | What may the pipeline ask of a runtime, and what comes back? |
 * | `RunManifest` | Is comparing this run with another valid? |
 *
 * Nothing here orchestrates, validates, reads files or calls a model: these are
 * type and shape declarations only.
 *
 * @packageDocumentation
 */

export type {
  ReviewStatus,
  EpistemicState,
  EpistemicBasis,
  FingerprintAlg,
  Fingerprint,
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
  RetentionClass,
  SourceEpistemicStatus,
  Locator,
  UnitConfidence,
  ProcessingHint,
  UnitDisposition,
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
  ManifestGitState,
  ManifestRuntime,
  ManifestModel,
  ManifestReasoning,
  ManifestVersions,
  ManifestSourceBundle,
  ManifestPlatform,
  ManifestOmission,
  ManifestCaseId,
  RunManifest,
} from './run-manifest';
