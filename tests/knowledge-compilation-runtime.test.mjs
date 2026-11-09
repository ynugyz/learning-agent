import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { InMemoryExecutionEventLogger, StageRunner } from '../src/pipeline/knowledge-compilation.ts';

const readArtifact = name => JSON.parse(fs.readFileSync(path.join('tests', 'knowledge-compilation', 'bayes-example', name), 'utf8'));
const sourceMap = readArtifact('source-map.json');
const lessonModel = readArtifact('lesson-model.json');
const alignment = {
  contractVersion: 'alignment/0.2',
  schemaVersion: '0.2',
  status: 'draft',
  alignmentId: 'alignment-probability-graph-01',
  lessonModelRef: lessonModel.lessonModelId,
  candidates: lessonModel.items.map((item, index) => ({
    alignmentId: `al-${index + 1}`,
    lessonItemRefs: [item.itemId],
    existingKnowledgeRefs: [`knowledge:${index + 1}`],
    relation: index === 0 ? 'EXAMPLE' : 'RELATION',
    resolutionState: 'resolved',
    rationale: 'Mock alignment output for orchestration verification.',
    confidence: 'medium',
  })),
};
const outputs = { 'lesson-model': lessonModel, alignment };
const runtimeCalls = [];
const runtime = {
  metadata: {
    runtimeKind: 'mock', runtimeVersion: '1',
    capabilities: {
      structuredTask: true, modelSelection: false, reasoningControl: false,
      usageReporting: false, transportRetry: false, streaming: false, cancellation: false,
    },
  },
  async invoke(request) {
    runtimeCalls.push(request.taskId);
    if (request.taskId.endsWith(':alignment')) {
      assert.ok(request.input.some(input => input.content === 'existing-knowledge snapshot'));
    }
    const stageId = request.taskId.split(':').at(-1);
    return {
      ok: true,
      result: {
        taskId: request.taskId,
        output: {
          raw: request.taskId.startsWith('wrapped-run-') && stageId === 'alignment'
            ? `Here is the artifact:\n\`\`\`json\n${JSON.stringify(outputs[stageId])}\n\`\`\``
            : JSON.stringify(outputs[stageId]),
          format: 'json',
        },
      },
    };
  },
};

const manifest = {
  runId: 'mock-run-001',
  sourceMapRef: sourceMap.sourcePackageId,
  stages: [
    { id: 'source-map' },
    {
      id: 'lesson-model',
      promptRef: { id: 'lesson-model', version: 'mock-1' },
      outputSchemaRef: { id: 'lesson-model/0.1', version: '0.1' },
      instruction: 'Produce the LessonModel.',
    },
    {
      id: 'alignment',
      promptRef: { id: 'alignment', version: 'mock-1' },
      outputSchemaRef: { id: 'alignment/0.2', version: '0.2' },
      instruction: 'Align lesson items with supplied knowledge context.',
    },
  ],
};

const validationCalls = [];
const validator = {
  validate(stageId, artifact) {
    validationCalls.push(stageId);
    const expected = {
      'source-map': 'source-map/0.1',
      'lesson-model': 'lesson-model/0.1',
      alignment: 'alignment/0.2',
    }[stageId];
    return { valid: artifact.contractVersion === expected, errors: [`expected ${expected}`] };
  },
};
const logger = new InMemoryExecutionEventLogger();
const result = await new StageRunner(runtime, validator, logger).run(manifest, sourceMap, {
  alignment: [{ role: 'context', content: 'existing-knowledge snapshot' }],
});

assert.deepEqual(result.sourceMap, sourceMap);
assert.deepEqual(result.lessonModel, lessonModel);
assert.deepEqual(result.alignment, alignment);
assert.deepEqual(runtimeCalls, ['mock-run-001:lesson-model', 'mock-run-001:alignment']);
assert.deepEqual(validationCalls, ['source-map', 'lesson-model', 'alignment']);
assert.deepEqual(logger.events.map(event => event.type), [
  'run.started',
  'stage.started', 'stage.completed',
  'stage.started', 'stage.completed',
  'stage.started', 'stage.completed',
  'run.completed',
]);
assert.deepEqual(logger.events.map(event => event.sequence), logger.events.map((_, i) => i));
assert.ok(logger.events.every(event => event.runId === manifest.runId));

const wrappedOutput = await new StageRunner(runtime, validator, new InMemoryExecutionEventLogger()).run(
  { ...manifest, runId: 'wrapped-run-001' },
  sourceMap,
  { alignment: [{ role: 'context', content: 'existing-knowledge snapshot' }] },
);
assert.deepEqual(wrappedOutput.alignment, alignment);

runtimeCalls.length = 0;
validationCalls.length = 0;
const sourceOnly = await new StageRunner(runtime, validator, new InMemoryExecutionEventLogger()).run(
  { ...manifest, runId: 'mock-run-source-only', stages: manifest.stages.slice(0, 1) },
  sourceMap,
);
assert.deepEqual(sourceOnly.lessonModel, undefined);
assert.deepEqual(sourceOnly.alignment, undefined);
assert.deepEqual(sourceOnly.executedStages, ['source-map']);
assert.deepEqual(sourceOnly.skippedStages, ['lesson-model', 'alignment']);
assert.deepEqual(runtimeCalls, []);
assert.deepEqual(validationCalls, ['source-map']);

runtimeCalls.length = 0;
validationCalls.length = 0;
const sourceAndLesson = await new StageRunner(runtime, validator, new InMemoryExecutionEventLogger()).run(
  { ...manifest, runId: 'mock-run-source-lesson', stages: manifest.stages.slice(0, 2) },
  sourceMap,
);
assert.deepEqual(sourceAndLesson.lessonModel, lessonModel);
assert.deepEqual(sourceAndLesson.alignment, undefined);
assert.deepEqual(sourceAndLesson.executedStages, ['source-map', 'lesson-model']);
assert.deepEqual(sourceAndLesson.skippedStages, ['alignment']);
assert.deepEqual(runtimeCalls, ['mock-run-source-lesson:lesson-model']);
assert.deepEqual(validationCalls, ['source-map', 'lesson-model']);

const failedLogger = new InMemoryExecutionEventLogger();
const failedValidator = {
  validate(stageId) {
    return { valid: stageId !== 'lesson-model', errors: ['mock rejection'] };
  },
};
await assert.rejects(
  new StageRunner(runtime, failedValidator, failedLogger).run({ ...manifest, runId: 'mock-run-invalid' }, sourceMap),
  /lesson-model: mock rejection/,
);
assert.equal(runtimeCalls.at(-1), 'mock-run-invalid:lesson-model');
assert.ok(!runtimeCalls.includes('mock-run-invalid:alignment'));
assert.equal(failedLogger.events.at(-1).type, 'run.failed');
assert.equal(failedLogger.events.find(event => event.type === 'stage.failed').outcome, 'validation_error');

console.log('knowledge-compilation runtime orchestration checks passed');
