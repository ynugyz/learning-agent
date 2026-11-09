import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import { InMemoryExecutionEventLogger, StageRunner } from '../src/pipeline/knowledge-compilation.ts';

const [runDirArg, mode, model = 'gpt-6-luna', reasoning = 'low', stagesArg] = process.argv.slice(2);
if (!runDirArg || !['fixture', 'mock', 'real'].includes(mode ?? '')) {
  console.error('usage: node tools/knowledge-compilation-canary.mjs <run-dir> <fixture|mock|real> [model] [reasoning] [SourceMap[,LessonModel[,Alignment]]]');
  process.exit(2);
}

const stageNames = ['SourceMap', 'LessonModel', 'Alignment'];
const stageIds = ['source-map', 'lesson-model', 'alignment'];
const stageTimeoutMs = Number(process.env.LEARNING_AGENT_STAGE_TIMEOUT_MS || 900000);
const requestedStages = (() => {
  const values = (stagesArg ? stagesArg.split(',') : stageNames).map(value => value.trim()).filter(Boolean);
  if (values.length === 0 || values.length > stageNames.length) throw new Error('stages must be a non-empty prefix of SourceMap, LessonModel, Alignment');
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] !== stageNames[index]) throw new Error('stages must be a contiguous prefix: SourceMap[,LessonModel[,Alignment]]');
  }
  return values;
})();
const requestedStageIds = requestedStages.map(stage => stageIds[stageNames.indexOf(stage)]);
const skippedStages = stageNames.slice(requestedStages.length);

const runDir = path.resolve(runDirArg);
const sourceDir = path.join(runDir, 'source');
const manifestPath = path.join(runDir, 'run-manifest.json');
const reportPath = path.join(runDir, 'run-report.json');
const started = Date.now();
const logger = new InMemoryExecutionEventLogger();
const report = {
  runId: path.basename(runDir), mode, status: 'failed', model: mode === 'real' ? model : null,
  reasoning: mode === 'real' ? reasoning : null, requestedStages, executedStages: [], skippedStages,
  retryCount: 0, stageTimingMs: {}, events: [], artifacts: {}, error: null,
};
const repairLog = [];
let runManifest;
let patchPath;
let currentSourceMap;
const alignmentContextPath = process.env.CANARY_ALIGNMENT_CONTEXT_FILE;
const alignmentContext = alignmentContextPath && fs.existsSync(alignmentContextPath)
  ? fs.readFileSync(alignmentContextPath, 'utf8')
  : '';

const errorText = error => error instanceof Error ? error.message : String(error);
const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const readJson = target => JSON.parse(fs.readFileSync(target, 'utf8').replace(/^\uFEFF/, ''));
const schema = name => readJson(path.resolve('schemas', name));

function repairMechanicalArtifact(stageId, artifact) {
  if (stageId === 'source-map' && artifact && typeof artifact === 'object') {
    // Low-cost models occasionally return the right evidence ledger with a
    // pre-schema shorthand (for example quality as a list of prose strings or
    // missingOrUnavailable as strings). Normalize only those mechanical
    // shapes; do not invent or rewrite the evidence summaries themselves.
    if (typeof artifact.contractVersion !== 'string') {
      artifact.contractVersion = 'source-map/0.1';
      repairLog.push({ stageId, field: 'contractVersion', reason: 'filled fixed contract value' });
    }
    if (typeof artifact.schemaVersion !== 'string') {
      artifact.schemaVersion = '0.1';
      repairLog.push({ stageId, field: 'schemaVersion', reason: 'filled fixed schema value' });
    }
    if (typeof artifact.status !== 'string') {
      artifact.status = 'draft';
      repairLog.push({ stageId, field: 'status', reason: 'filled draft status' });
    }
    if (typeof artifact.sourcePackageId !== 'string' || artifact.sourcePackageId.trim().length === 0 || /^(?:unspecified|unknown|none|null)$/iu.test(artifact.sourcePackageId.trim())) {
      artifact.sourcePackageId = `source-package-${path.basename(runDir)}`;
      repairLog.push({ stageId, field: 'sourcePackageId', reason: 'derived from deterministic run identity' });
    }
    if (Array.isArray(artifact.sources)) {
      for (const source of artifact.sources) {
        if (!source || typeof source !== 'object') continue;
        if (typeof source.kind !== 'string') {
          source.kind = 'transcript';
          repairLog.push({ stageId, field: 'sources.kind', reason: 'defaulted source kind for transcript input' });
        }
        if (typeof source.location !== 'string' || source.location.trim().length === 0) source.location = 'source.txt';
        if (Array.isArray(source.quality)) {
          const prose = source.quality.filter(value => typeof value === 'string');
          const joined = prose.join(' ');
          const issues = [];
          if (/asr|转写|噪声/iu.test(joined)) issues.push('asr-noise');
          if (/插话|顺序|out.of.order/iu.test(joined)) issues.push('out-of-order');
          source.quality = { rating: prose.length ? 'noisy' : 'unknown', ...(issues.length ? { issues } : {}), ...(prose.length ? { note: prose.join('；').slice(0, 300) } : {}) };
          repairLog.push({ stageId, field: 'sources.quality', reason: 'converted prose list to schema quality object' });
        } else if (typeof source.quality === 'string') {
          source.quality = { rating: 'unknown', note: source.quality.slice(0, 300) };
          repairLog.push({ stageId, field: 'sources.quality', reason: 'converted prose value to schema quality object' });
        } else if (source.quality && typeof source.quality === 'object') {
          // Models sometimes return a semantically useful quality object with
          // a non-contract key set (for example description/observations) or
          // omit rating. Keep the evidence as a bounded note, but emit only
          // the fields accepted by source-map/0.1.
          const quality = source.quality;
          const rawIssues = Array.isArray(quality.issues) ? quality.issues : (typeof quality.issues === 'string' ? [quality.issues] : []);
          const allowedIssues = new Set(['asr-noise', 'missing-audio', 'missing-pages', 'illegible', 'out-of-order', 'duplicate', 'language-mixed', 'unknown']);
          const issues = rawIssues.filter(issue => allowedIssues.has(issue));
          const proseParts = [quality.note, quality.description, quality.observations]
            .flatMap(value => Array.isArray(value) ? value : [value])
            .filter(value => typeof value === 'string' && value.trim().length > 0)
            .map(value => value.trim());
          const prose = proseParts.join('；');
          const ratingText = [quality.rating, prose, rawIssues.join('；')].join(' ');
          const rating = ['clean', 'noisy', 'partial', 'unreadable', 'unknown'].includes(quality.rating)
            ? quality.rating
            : (/unreadable|无法辨认|不可读/iu.test(ratingText) ? 'unreadable'
              : (/partial|不完整|缺失|missing/iu.test(ratingText) ? 'partial'
                : (/asr|转写|噪声|out.of.order|顺序/iu.test(ratingText) ? 'noisy' : 'unknown')));
          source.quality = {
            rating,
            ...(issues.length ? { issues } : {}),
            ...(prose ? { note: prose.slice(0, 300) } : {}),
          };
          repairLog.push({ stageId, field: 'sources.quality', reason: 'normalized object to schema quality fields and filled missing rating' });
        }
      }
    }
    if (Array.isArray(artifact.missingOrUnavailable) && artifact.missingOrUnavailable.some(value => typeof value === 'string')) {
      artifact.missingOrUnavailable = artifact.missingOrUnavailable.map(value => typeof value === 'string' ? { description: value } : value).filter(Boolean);
      repairLog.push({ stageId, field: 'missingOrUnavailable', reason: 'wrapped prose gaps as schema objects' });
    }
    if (artifact.coverage && typeof artifact.coverage === 'object' && artifact.coverage.notes !== undefined && artifact.coverage.note === undefined) {
      artifact.coverage.note = Array.isArray(artifact.coverage.notes) ? artifact.coverage.notes.join('；') : String(artifact.coverage.notes);
      delete artifact.coverage.notes;
      repairLog.push({ stageId, field: 'coverage.note', reason: 'mapped legacy notes field' });
    }
    if (artifact.coverage && typeof artifact.coverage === 'object') {
      if (typeof artifact.coverage.assessment !== 'string') artifact.coverage.assessment = 'not_assessed';
      if (typeof artifact.coverage.note === 'string') artifact.coverage.note = artifact.coverage.note.slice(0, 300);
      for (const key of Object.keys(artifact.coverage)) {
        if (!['assessment', 'note'].includes(key)) delete artifact.coverage[key];
      }
      repairLog.push({ stageId, field: 'coverage', reason: 'kept only schema-defined coverage fields' });
    }
    if (Array.isArray(artifact.notes)) {
      artifact.notes = artifact.notes.filter(value => typeof value === 'string').join('\n');
      repairLog.push({ stageId, field: 'notes', reason: 'joined note list into schema string' });
    }
    if (typeof artifact.notes === 'string' && artifact.notes.length > 600) {
      artifact.notes = artifact.notes.slice(0, 600);
      repairLog.push({ stageId, field: 'notes', reason: 'bounded package notes to schema maxLength' });
    }
    if (Array.isArray(artifact.observations)) {
      const observationText = artifact.observations.map(value => {
        if (typeof value === 'string') return value;
        if (!value || typeof value !== 'object') return '';
        const refs = Array.isArray(value.unitRefs) && value.unitRefs.length ? ` [${value.unitRefs.join(', ')}]` : '';
        return `${value.code ?? 'observation'}: ${value.rationale ?? ''}${refs}`.trim();
      }).filter(Boolean).join('\n');
      artifact.notes = [artifact.notes, observationText ? `Package observations:\n${observationText}` : ''].filter(Boolean).join('\n');
      delete artifact.observations;
      repairLog.push({ stageId, field: 'observations', reason: 'preserved top-level observations in notes because schema stores package notes as text' });
    }
    if (Array.isArray(artifact.conflicts)) {
      const validConflicts = [];
      const deferredConflictNotes = [];
      for (const conflict of artifact.conflicts) {
        if (!conflict || typeof conflict !== 'object') continue;
        const refs = Array.isArray(conflict.unitRefs) ? conflict.unitRefs.filter(value => typeof value === 'string' && value.trim()) : [];
        if (refs.length >= 2) {
          conflict.unitRefs = [...new Set(refs)];
          validConflicts.push(conflict);
        } else {
          deferredConflictNotes.push(`Conflict candidate ${conflict.conflictId ?? 'unknown'} has fewer than two source units and was retained as unconfirmed: ${conflict.description ?? 'no description'}`);
          repairLog.push({ stageId, field: 'conflicts', conflictId: conflict.conflictId, reason: 'moved under-specified conflict to package notes; a real conflict requires at least two source units' });
        }
      }
      artifact.conflicts = validConflicts;
      if (deferredConflictNotes.length) artifact.notes = [artifact.notes, ...deferredConflictNotes].filter(Boolean).join('\n').slice(0, 600);
    }
    if (Array.isArray(artifact.units)) {
      for (const unit of artifact.units) {
        if (!unit || typeof unit !== 'object') continue;
        if (unit.contentType === 'uncertain') {
          unit.contentType = 'unknown';
          repairLog.push({ stageId, field: 'units.contentType', unitId: unit.unitId, reason: 'mapped non-schema uncertainty label to unknown' });
        }
        if (unit.preservation && typeof unit.preservation === 'object') {
          const priorityMap = { medium: 'normal', important: 'high', critical: 'must-preserve', optional: 'low' };
          if (priorityMap[unit.preservation.priority]) {
            unit.preservation.priority = priorityMap[unit.preservation.priority];
            repairLog.push({ stageId, field: 'units.preservation.priority', unitId: unit.unitId, reason: 'mapped shorthand priority to schema enum' });
          }
        }
      }
    }
    return artifact;
  }
  if (stageId === 'alignment' && artifact && Array.isArray(artifact.candidates)) {
    for (const candidate of artifact.candidates) {
      if (!candidate || typeof candidate !== 'object') continue;
      if (candidate.resolutionState === 'deferred' && candidate.confidence === 'high') {
        candidate.confidence = 'medium';
        repairLog.push({ stageId, field: 'candidates.confidence', alignmentId: candidate.alignmentId, reason: 'downgraded deferred high confidence to schema-safe medium' });
      }
    }
    return artifact;
  }
  if (stageId !== 'lesson-model' || !artifact || !Array.isArray(artifact.teachingFlow)) return artifact;
  const sourceUnitIds = new Set((currentSourceMap?.units ?? []).map(unit => unit.unitId));
  const sourceUnitRanges = (currentSourceMap?.units ?? []).map(unit => ({
    id: unit.unitId,
    start: Number(unit.locator?.start),
    end: Number(unit.locator?.end ?? unit.locator?.start),
  })).filter(unit => Number.isFinite(unit.start) && Number.isFinite(unit.end));
  const normalizeSourceRefs = refs => {
    if (!Array.isArray(refs)) return refs;
    const normalized = [];
    for (const ref of refs) {
      if (typeof ref !== 'string') continue;
      if (sourceUnitIds.has(ref)) { normalized.push(ref); continue; }
      const match = ref.match(/L(\d+)(?:-(\d+))?/i);
      if (!match) { normalized.push(ref); continue; }
      const start = Number(match[1]);
      const end = Number(match[2] ?? match[1]);
      const overlaps = sourceUnitRanges.filter(unit => unit.start <= end && unit.end >= start).map(unit => unit.id);
      if (overlaps.length) {
        normalized.push(...overlaps);
        repairLog.push({ stageId, field: 'sourceUnitRefs', sourceRef: ref, mappedTo: overlaps, reason: 'mapped composite line range to overlapping SourceMap units' });
      } else normalized.push(ref);
    }
    return [...new Set(normalized)];
  };
  if (Array.isArray(artifact.items)) {
    for (const item of artifact.items) {
      if (!item || typeof item !== 'object') continue;
      if (item.kind === 'explanation') {
        item.kind = 'teacher-explanation';
        repairLog.push({ stageId, field: 'items.kind', itemId: item.itemId, reason: 'mapped shorthand explanation kind to schema enum' });
      }
      item.sourceUnitRefs = normalizeSourceRefs(item.sourceUnitRefs);
    }
  }
  for (const relation of artifact.relations ?? []) if (relation && typeof relation === 'object') relation.sourceUnitRefs = normalizeSourceRefs(relation.sourceUnitRefs);
  for (const flow of artifact.teachingFlow) {
    if (!flow || typeof flow !== 'object') continue;
    if (!Array.isArray(flow.itemRefs)) {
      const inferred = [flow.fromItemId, flow.toItemId, ...(Array.isArray(flow.itemIds) ? flow.itemIds : [])].filter(value => typeof value === 'string' && value.length > 0);
      if (inferred.length > 0) {
        flow.itemRefs = [...new Set(inferred)];
        repairLog.push({ stageId, field: 'teachingFlow.itemRefs', reason: 'mapped legacy from/to item references' });
      }
    }
    if (!Array.isArray(flow.sourceUnitRefs)) {
      const inferredSources = Array.isArray(flow.sourceRefs) ? flow.sourceRefs : [];
      flow.sourceUnitRefs = inferredSources.filter(value => typeof value === 'string');
      repairLog.push({ stageId, field: 'teachingFlow.sourceUnitRefs', reason: 'mapped legacy source references' });
    }
    flow.sourceUnitRefs = normalizeSourceRefs(flow.sourceUnitRefs);
    for (const key of Object.keys(flow)) {
      if (!['order', 'itemRefs', 'sourceUnitRefs', 'teachingPurpose'].includes(key)) delete flow[key];
    }
  }
  return artifact;
}

try {
  runManifest = readJson(manifestPath);
  if (!Array.isArray(runManifest.requestedStages)) runManifest.requestedStages = requestedStages;
  if (!Array.isArray(runManifest.executedStages)) runManifest.executedStages = [];
  if (!Array.isArray(runManifest.skippedStages)) runManifest.skippedStages = skippedStages;
  if (JSON.stringify(runManifest.requestedStages) !== JSON.stringify(requestedStages)) {
    throw new Error('run manifest requestedStages do not match the canary request');
  }
  const manifestValidator = new Ajv2020({ allErrors: true, strict: false }).compile(schema('run-manifest.v0.1.schema.json'));
  if (!manifestValidator(runManifest)) throw new Error(`Invalid run manifest: ${manifestValidator.errors.map(error => `${error.instancePath || '/'} ${error.message}`).join('; ')}`);

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validators = {
    'source-map': ajv.compile(schema('source-map.v0.1.schema.json')),
    'lesson-model': ajv.compile(schema('lesson-model.v0.1.schema.json')),
    alignment: ajv.compile(schema('alignment.v0.2.schema.json')),
  };
  const validator = {
    validate(stageId, artifact) {
      repairMechanicalArtifact(stageId, artifact);
      const check = validators[stageId];
      const valid = check(artifact);
      return { valid, errors: valid ? [] : check.errors.map(error => `${error.instancePath || '/'} ${error.message}`) };
    },
  };
  const validateArtifact = (stageId, artifact) => {
    repairMechanicalArtifact(stageId, artifact);
    const result = validator.validate(stageId, artifact);
    if (!result.valid) throw new Error(`${stageId} validation failed: ${result.errors.join('; ')}`);
  };

  const eventTimingLogger = {
    log(event) {
      if (mode === 'real' && (event.stageId === 'source-map' || event.type === 'run.started')) return;
      logger.log({ ...event, sequence: logger.events.length });
      if (event.type === 'stage.started') eventTimes.set(event.stageId, Date.now());
      if (event.type === 'stage.completed' || event.type === 'stage.failed') {
        const began = eventTimes.get(event.stageId);
        if (began !== undefined) report.stageTimingMs[event.stageId] = Date.now() - began;
      }
    },
  };
  const eventTimes = new Map();
  const prompt = id => fs.readFileSync(path.resolve(`prompts/canary/${id}.v1.md`), 'utf8');
  const outputRef = (id, version) => ({ id: `${id}/${version}`, version, path: `schemas/${id}.v${version}.schema.json` });
  const sourceFile = path.join(sourceDir, 'source.txt');
  const sourceText = mode === 'real' ? fs.readFileSync(sourceFile, 'utf8') : null;

  let sourceMap;
  let lessonModel;
  let alignment;
  let runtime;

  if (mode === 'real') {
    if (!sourceText?.trim()) throw new Error('Real mode source.txt is empty.');
    const dshCli = process.env.CANARY_DSH_CLI;
    const dshPackage = process.env.CANARY_DSH_PACKAGE;
    if (!dshCli || !fs.existsSync(dshCli) || !dshPackage || !fs.existsSync(dshPackage)) throw new Error('DSH CLI was not found. Set DSH_PATH to the installed dsh.cmd.');
    const dshVersion = JSON.parse(fs.readFileSync(dshPackage, 'utf8')).version;
    patchPath = path.join(runDir, 'dsh-model-patch.yml');
    fs.writeFileSync(patchPath, `- id: agent-default-model\n  config:\n    provider: teamorouter\n    model: ${model}\n    reasoningEffort: ${reasoning}\n`, 'utf8');
    runManifest.runtime = {
      availability: 'present', requested: { kind: 'dsh' },
      resolved: { kind: 'dsh', version: dshVersion }, resolution: 'unknown',
    };
    runManifest.model = { requested: model, resolved: { availability: 'unavailable', reason: 'DSH headless CLI does not expose resolved model identity.' } };
    runManifest.reasoning = { requested: reasoning, applied: reasoning };
    writeJson(manifestPath, runManifest);

    runtime = {
      metadata: {
        runtimeKind: 'dsh', runtimeVersion: dshVersion,
        capabilities: { structuredTask: true, modelSelection: true, reasoningControl: true, usageReporting: false, transportRetry: false, streaming: false, cancellation: false },
      },
      async invoke(request) {
        const schemaText = request.outputSchemaRef?.path
          ? `OUTPUT JSON SCHEMA:\n${JSON.stringify(readJson(path.resolve(process.env.CANARY_REPO_ROOT, request.outputSchemaRef.path)))}`
          : '';
        const taskPrompt = [request.promptText, schemaText, ...request.input.map(item => `${item.role.toUpperCase()}${item.ref?.sourceId ? ` [${item.ref.sourceId}]` : ''}:\n${item.content}`)].filter(Boolean).join('\n\n');
        const stageName = request.taskId.split(':').at(-1);
        const boundedKnowledgeContext = stageName === 'alignment' && alignmentContext
          ? `\n\nKNOWLEDGE STATE SNAPSHOT (READ ONLY; USE ONLY THESE NOTES):\n${alignmentContext}`
          : '';
        const stageInputPath = path.join(runDir, `stage-input-${stageName}.txt`);
        fs.writeFileSync(stageInputPath, `${taskPrompt}${boundedKnowledgeContext}`, 'utf8');
        const bootstrapPrompt = `Read stage-input-${stageName}.txt from the current directory and follow it exactly. Return only the requested output.`;
        const stdoutPath = path.join(runDir, `${stageName}.stdout.txt`);
        const stderrPath = path.join(runDir, `${stageName}.stderr.txt`);
        const stdoutFd = fs.openSync(stdoutPath, 'w');
        const stderrFd = fs.openSync(stderrPath, 'w');
        const oldPermissionMode = process.env.DSH_PERMISSION_MODE;
        process.env.DSH_PERMISSION_MODE = 'read-only';
        let result;
        try {
          result = spawnSync(process.execPath, [dshCli, '--profile', 'headless', '--patch', patchPath, bootstrapPrompt], {
            cwd: runDir, env: process.env, stdio: ['ignore', stdoutFd, stderrFd], timeout: stageTimeoutMs,
          });
        } finally {
          fs.closeSync(stdoutFd);
          fs.closeSync(stderrFd);
          if (oldPermissionMode === undefined) delete process.env.DSH_PERMISSION_MODE;
          else process.env.DSH_PERMISSION_MODE = oldPermissionMode;
        }
        const stdout = fs.readFileSync(stdoutPath, 'utf8').trim();
        if (result.error || result.status !== 0) {
          const stderr = fs.readFileSync(stderrPath, 'utf8').trim();
          return { ok: false, error: { kind: 'runtime-unavailable', message: result.error?.message || stderr || `DSH exited with code ${result.status}`, retryable: false, stage: 'transport' } };
        }
        return { ok: true, result: { taskId: request.taskId, output: { raw: stdout, format: 'json' } } };
      },
    };

    const sourceStarted = Date.now();
    try {
      const sourcePrompt = prompt('source-map');
      logger.log({ sequence: 0, runId: runManifest.runId, type: 'run.started' });
      logger.log({ sequence: 1, runId: runManifest.runId, type: 'stage.started', stageId: 'source-map' });
      const response = await runtime.invoke({
        taskId: `${runManifest.runId}:source-map`, promptRef: { id: 'canary-source-map', version: '1' },
        promptText: sourcePrompt, outputSchemaRef: outputRef('source-map', '0.1'),
        input: [{ role: 'context', content: sourceText, ref: { sourceId: 'source.txt' } }],
        model: { requested: model }, reasoning: { effort: reasoning },
      });
      if (!response.ok) throw new Error(response.error.message);
      if (!response.result.output) throw new Error('runtime returned no output');
      if (response.result.output?.parseError) throw new Error(response.result.output.parseError);
      sourceMap = JSON.parse(response.result.output.raw);
      currentSourceMap = sourceMap;
      validateArtifact('source-map', sourceMap);
      writeJson(path.join(runDir, 'sourceMap.json'), sourceMap);
      report.artifacts.sourceMap = 'sourceMap.json';
      report.stageTimingMs['source-map'] = Date.now() - sourceStarted;
      logger.log({ sequence: 2, runId: runManifest.runId, type: 'stage.completed', stageId: 'source-map', outcome: 'ok' });
    } catch (error) {
      report.stageTimingMs['source-map'] = Date.now() - sourceStarted;
      if (logger.events.length === 0) logger.log({ sequence: 0, runId: runManifest.runId, type: 'run.started' });
      logger.log({ sequence: logger.events.length, runId: runManifest.runId, type: 'stage.failed', stageId: 'source-map', outcome: 'runtime_error' });
      throw new Error(`source-map: ${errorText(error)}`);
    }
  } else {
    sourceMap = readJson(path.join(sourceDir, 'source-map.json'));
    currentSourceMap = sourceMap;
    if (requestedStageIds.includes('lesson-model')) lessonModel = readJson(path.join(sourceDir, 'lesson-model.json'));
    if (requestedStageIds.includes('alignment')) {
      alignment = readJson(path.join(sourceDir, 'alignment.json'));
      validators.alignment = ajv.compile(schema(`alignment.v${alignment.schemaVersion}.schema.json`));
    }
    runtime = {
      metadata: {
        runtimeKind: 'mock', runtimeVersion: 'fixture-replay/1',
        capabilities: { structuredTask: true, modelSelection: false, reasoningControl: false, usageReporting: false, transportRetry: false, streaming: false, cancellation: false },
      },
      async invoke(request) {
        const artifact = request.taskId.endsWith(':lesson-model') ? lessonModel : alignment;
        if (!artifact) throw new Error(`mock artifact is unavailable for ${request.taskId}`);
        return { ok: true, result: { taskId: request.taskId, output: { raw: JSON.stringify(artifact), format: 'json' } } };
      },
    };
  }

  const manifest = {
    runId: runManifest.runId, sourceMapRef: sourceMap.sourcePackageId,
    stages: [
      { id: 'source-map' },
      ...(requestedStageIds.includes('lesson-model') ? [
        { id: 'lesson-model', promptRef: { id: mode === 'real' ? 'canary-lesson-model' : 'fixture-replay', version: '1' }, outputSchemaRef: outputRef('lesson-model', '0.1'), instruction: mode === 'real' ? prompt('lesson-model') : 'Replay fixture artifact.' },
      ] : []),
      ...(requestedStageIds.includes('alignment') ? [
        { id: 'alignment', promptRef: { id: mode === 'real' ? 'canary-alignment' : 'fixture-replay', version: '1' }, outputSchemaRef: outputRef('alignment', mode === 'real' ? '0.2' : alignment.schemaVersion), instruction: mode === 'real' ? prompt('alignment') : 'Replay fixture artifact.' },
      ] : []),
    ],
  };

  const runStarted = Date.now();
  const result = await new StageRunner(runtime, validator, eventTimingLogger).run(manifest, sourceMap);
  lessonModel = result.lessonModel;
  alignment = result.alignment;
  report.executedStages = result.executedStages.map(stage => stageNames[stageIds.indexOf(stage)]);
  report.skippedStages = result.skippedStages.map(stage => stageNames[stageIds.indexOf(stage)]);
  runManifest.executedStages = report.executedStages;
  runManifest.skippedStages = report.skippedStages;
  if (mode !== 'real') {
    validateArtifact('source-map', sourceMap);
    if (lessonModel) validateArtifact('lesson-model', lessonModel);
    if (alignment) validateArtifact('alignment', alignment);
  }

  const artifactsToWrite = [['sourceMap', sourceMap], ...(lessonModel ? [['lessonModel', lessonModel]] : []), ...(alignment ? [['alignment', alignment]] : [])];
  for (const [name, artifact] of artifactsToWrite) {
    const target = path.join(runDir, `${name}.json`);
    writeJson(target, artifact);
    report.artifacts[name] = path.basename(target);
  }
  report.stageTimingMs.totalRuntimeStages = Date.now() - runStarted;
  report.status = 'completed';
} catch (error) {
  report.error = errorText(error);
  const completed = logger.events.filter(event => event.type === 'stage.completed').map(event => event.stageId).filter(Boolean);
  if (mode === 'real' && !completed.includes('source-map') && fs.existsSync(path.join(runDir, 'sourceMap.json'))) completed.unshift('source-map');
  report.executedStages = completed.map(stage => stageNames[stageIds.indexOf(stage)]);
  report.skippedStages = stageNames.filter(stage => !report.executedStages.includes(stage));
  if (runManifest) {
    runManifest.executedStages = report.executedStages;
    runManifest.skippedStages = report.skippedStages;
  }
  if (logger.events.length === 0) logger.log({ sequence: 0, runId: report.runId, type: 'run.started' });
  if (logger.events.at(-1)?.type !== 'run.failed') logger.log({ sequence: logger.events.length, runId: report.runId, type: 'run.failed' });
  if (runManifest) {
    runManifest.finishedAt = new Date().toISOString();
    runManifest.durationMs = Date.now() - started;
    runManifest.notes = `stageTimingMs=${Object.entries(report.stageTimingMs).map(([stage, ms]) => `${stage}:${ms}`).join(',')}; retryCount=${report.retryCount}; report=run-report.json`;
    writeJson(manifestPath, runManifest);
  }
} finally {
  report.durationMs = Date.now() - started;
  report.events = logger.events;
  report.repairs = repairLog;
  if (runManifest && report.status === 'completed') {
    runManifest.requestedStages = requestedStages;
    runManifest.executedStages = report.executedStages;
    runManifest.skippedStages = report.skippedStages;
    runManifest.finishedAt = new Date().toISOString();
    runManifest.durationMs = report.durationMs;
    runManifest.notes = `canaryMetrics=${JSON.stringify({ stageTimingMs: report.stageTimingMs, retryCount: report.retryCount, report: 'run-report.json' })}`;
    writeJson(manifestPath, runManifest);
  }
  writeJson(reportPath, report);
  if (patchPath && fs.existsSync(patchPath)) fs.rmSync(patchPath);
}

if (report.status !== 'completed') {
  console.error(report.error);
  process.exitCode = 1;
} else {
  console.log(`Canary ${report.runId} completed (${report.events.length} events).`);
}
