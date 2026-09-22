/**
 * Core contracts — barrel export (M1A REV1)
 *
 * DRAFT — NOT IMPLEMENTATION-STABLE.
 *
 * Four contracts, rederived from design principles and revised under human
 * adjudication. None has passed human review as a finished design, and
 * milestone M0 itself is still awaiting final human approval.
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
  SchemaVersion,
  CardState,
  EpistemicState,
  EpistemicBasis,
  FingerprintAlg,
  Anchor,
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
