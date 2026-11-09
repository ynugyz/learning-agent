/** Deterministic orchestration for the SourceMap → LessonModel → Alignment path. */
import type { Alignment } from '../contracts/alignment';
import type { AgentRuntime, OutputSchemaRef, PromptRef, RuntimeInvocationResult } from '../contracts/agent-runtime';
import type { LessonModel } from '../contracts/lesson-model';
import type { SourceMap } from '../contracts/source-map';

export type CompilationStageId = 'source-map' | 'lesson-model' | 'alignment';

type RuntimeStageId = Exclude<CompilationStageId, 'source-map'>;

interface InputStage {
  readonly id: 'source-map';
}

interface RuntimeStage {
  readonly id: RuntimeStageId;
  readonly promptRef: PromptRef;
  readonly outputSchemaRef: OutputSchemaRef;
  readonly instruction: string;
}

/** Explicit allow-list and order for one compilation run. */
export interface ScopeManifest {
  readonly runId: string;
  /** Must equal the supplied SourceMap's sourcePackageId. */
  readonly sourceMapRef: string;
  /** A non-empty prefix of source-map -> lesson-model -> alignment. */
  readonly stages: readonly (InputStage | RuntimeStage)[];
}

export interface StageValidationResult {
  readonly valid: boolean;
  readonly errors?: readonly string[];
}

/** Schema-specific validation is injected; orchestration does not own schemas. */
export interface StageValidator {
  validate(stageId: CompilationStageId, artifact: unknown): StageValidationResult | Promise<StageValidationResult>;
}

export type ExecutionEventType =
  | 'run.started'
  | 'run.completed'
  | 'run.failed'
  | 'stage.started'
  | 'stage.completed'
  | 'stage.failed';

/** Sequence-based events deliberately omit wall-clock timestamps for reproducibility. */
export interface ExecutionEvent {
  readonly sequence: number;
  readonly runId: string;
  readonly type: ExecutionEventType;
  readonly stageId?: CompilationStageId;
  readonly outcome?: 'ok' | 'runtime_error' | 'invalid_output' | 'validation_error';
}

export interface ExecutionEventLogger {
  log(event: ExecutionEvent): void;
}

export class InMemoryExecutionEventLogger implements ExecutionEventLogger {
  readonly events: ExecutionEvent[] = [];

  log(event: ExecutionEvent): void {
    this.events.push(event);
  }
}

export interface CompilationArtifacts {
  readonly sourceMap: SourceMap;
  readonly lessonModel?: LessonModel;
  readonly alignment?: Alignment;
  readonly executedStages: readonly CompilationStageId[];
  readonly skippedStages: readonly CompilationStageId[];
}

export class StageExecutionError extends Error {
  readonly stageId: CompilationStageId;
  readonly category: 'runtime_error' | 'invalid_output' | 'validation_error';

  constructor(stageId: CompilationStageId, category: 'runtime_error' | 'invalid_output' | 'validation_error', message: string) {
    super(`${stageId}: ${message}`);
    this.stageId = stageId;
    this.category = category;
    this.name = 'StageExecutionError';
  }
}

/** Runs only the stages explicitly present in the manifest, in declared order. */
export class StageRunner {
  private readonly runtime: AgentRuntime;
  private readonly validator: StageValidator;
  private readonly logger: ExecutionEventLogger;

  constructor(runtime: AgentRuntime, validator: StageValidator, logger: ExecutionEventLogger) {
    this.runtime = runtime;
    this.validator = validator;
    this.logger = logger;
  }

  async run(
    manifest: ScopeManifest,
    sourceMap: SourceMap,
    stageContext: Partial<Record<RuntimeStageId, RuntimeStageInput>> = {},
  ): Promise<CompilationArtifacts> {
    let sequence = 0;
    const emit = (event: Omit<ExecutionEvent, 'sequence' | 'runId'>) =>
      this.logger.log({ ...event, sequence: sequence++, runId: manifest.runId });

    emit({ type: 'run.started' });
    try {
      this.assertScope(manifest, sourceMap);
      await this.execute('source-map', async () => {
        await this.validate('source-map', sourceMap);
        return sourceMap;
      }, emit);

      let lessonModel: LessonModel | undefined;
      if (this.hasStage(manifest, 'lesson-model')) {
        lessonModel = await this.execute('lesson-model', async () => {
          const stage = this.stage(manifest, 'lesson-model');
          const result = await this.invoke(manifest.runId, stage, [
            { role: 'context', content: JSON.stringify(sourceMap), ref: { sourceId: sourceMap.sourcePackageId } },
            ...(stageContext['lesson-model'] ?? []),
            { role: 'instruction', content: stage.instruction },
          ]);
          const artifact = this.parseOutput<LessonModel>('lesson-model', result);
          await this.validate('lesson-model', artifact);
          return artifact;
        }, emit);
      }

      let alignment: Alignment | undefined;
      if (this.hasStage(manifest, 'alignment')) {
        if (!lessonModel) throw new Error('alignment requires the lesson-model stage');
        alignment = await this.execute('alignment', async () => {
          const stage = this.stage(manifest, 'alignment');
          const result = await this.invoke(manifest.runId, stage, [
            { role: 'context', content: JSON.stringify(sourceMap), ref: { sourceId: sourceMap.sourcePackageId } },
            { role: 'context', content: JSON.stringify(lessonModel), ref: { sourceUnitId: lessonModel.lessonModelId } },
            ...(stageContext.alignment ?? []),
            { role: 'instruction', content: stage.instruction },
          ]);
          const artifact = this.parseOutput<Alignment>('alignment', result);
          await this.validate('alignment', artifact);
          return artifact;
        }, emit);
      }

      emit({ type: 'run.completed' });
      const executedStages = manifest.stages.map(stage => stage.id);
      const skippedStages = this.allStages().filter(stage => !executedStages.includes(stage));
      const artifacts: { sourceMap: SourceMap; lessonModel?: LessonModel; alignment?: Alignment; executedStages: readonly CompilationStageId[]; skippedStages: readonly CompilationStageId[] } = { sourceMap, executedStages, skippedStages };
      if (lessonModel) artifacts.lessonModel = lessonModel;
      if (alignment) artifacts.alignment = alignment;
      return artifacts;
    } catch (error) {
      emit({ type: 'run.failed' });
      throw error;
    }
  }

  private assertScope(manifest: ScopeManifest, sourceMap: SourceMap): void {
    if (!manifest.runId.trim()) throw new Error('ScopeManifest.runId must not be empty');
    for (const stage of manifest.stages) {
      if (stage.id === 'source-map') continue;
      if (!stage.promptRef.id.trim() || !stage.promptRef.version.trim() ||
          !stage.outputSchemaRef.id.trim() || !stage.outputSchemaRef.version.trim() || !stage.instruction.trim()) {
        throw new Error(`ScopeManifest.${stage.id} requires prompt/schema identifiers, versions and instruction`);
      }
    }
    if (manifest.sourceMapRef !== sourceMap.sourcePackageId) {
      throw new Error('ScopeManifest.sourceMapRef does not match SourceMap.sourcePackageId');
    }
    const expected = this.allStages();
    if (manifest.stages.length < 1 || manifest.stages.length > expected.length ||
        manifest.stages.some((stage, index) => stage.id !== expected[index])) {
      throw new Error('ScopeManifest stages must be a non-empty prefix of source-map, lesson-model, alignment');
    }
  }

  private allStages(): CompilationStageId[] {
    return ['source-map', 'lesson-model', 'alignment'];
  }

  private hasStage(manifest: ScopeManifest, stageId: CompilationStageId): boolean {
    return manifest.stages.some(stage => stage.id === stageId);
  }

  private stage(manifest: ScopeManifest, stageId: RuntimeStageId): RuntimeStage {
    const stage = manifest.stages.find(candidate => candidate.id === stageId);
    if (!stage || stage.id === 'source-map') throw new Error(`ScopeManifest is missing ${stageId} stage`);
    return stage;
  }

  private async invoke(
    runId: string,
    stage: RuntimeStage,
    input: RuntimeStageInput,
  ): Promise<RuntimeInvocationResult & { readonly ok: true }> {
    let result: RuntimeInvocationResult;
    try {
      result = await this.runtime.invoke({
        taskId: `${runId}:${stage.id}`,
        promptRef: stage.promptRef,
        promptText: stage.instruction,
        outputSchemaRef: stage.outputSchemaRef,
        input,
      });
    } catch (error) {
      throw new StageExecutionError(stage.id, 'runtime_error', errorMessage(error));
    }
    if (!result.ok) throw new StageExecutionError(stage.id, 'runtime_error', result.error.message);
    if (result.result.taskId !== `${runId}:${stage.id}` || !result.result.output) {
      throw new StageExecutionError(stage.id, 'runtime_error', 'runtime returned a mismatched task id or no output');
    }
    return result;
  }

  private parseOutput<T>(stageId: RuntimeStageId, result: RuntimeInvocationResult & { readonly ok: true }): T {
    try {
      if (result.result.output?.parseError) throw new Error(result.result.output.parseError);
      const raw = result.result.output!.raw;
      try {
        return JSON.parse(raw) as T;
      } catch (directError) {
        // Low-cost runtimes occasionally wrap an otherwise valid JSON artifact
        // in a markdown fence or a short pre/postamble. Recover only the
        // bounded JSON object; semantic repair remains the validator's job.
        const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
        if (fenced) return JSON.parse(fenced) as T;
        const first = raw.indexOf('{');
        const last = raw.lastIndexOf('}');
        if (first >= 0 && last > first) return JSON.parse(raw.slice(first, last + 1)) as T;
        throw directError;
      }
    } catch (error) {
      throw new StageExecutionError(stageId, 'invalid_output', errorMessage(error));
    }
  }

  private async validate(stageId: CompilationStageId, artifact: unknown): Promise<void> {
    let result: StageValidationResult;
    try {
      result = await this.validator.validate(stageId, artifact);
    } catch (error) {
      throw new StageExecutionError(stageId, 'validation_error', errorMessage(error));
    }
    if (!result.valid) {
      throw new StageExecutionError(stageId, 'validation_error', (result.errors ?? ['artifact rejected']).join('; '));
    }
  }

  private async execute<T>(
    stageId: CompilationStageId,
    work: () => Promise<T>,
    emit: (event: Omit<ExecutionEvent, 'sequence' | 'runId'>) => void,
  ): Promise<T> {
    emit({ type: 'stage.started', stageId });
    try {
      const artifact = await work();
      emit({ type: 'stage.completed', stageId, outcome: 'ok' });
      return artifact;
    } catch (error) {
      emit({
        type: 'stage.failed',
        stageId,
        outcome: error instanceof StageExecutionError ? error.category : 'runtime_error',
      });
      throw error;
    }
  }
}

type RuntimeStageInput = Parameters<AgentRuntime['invoke']>[0]['input'];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
