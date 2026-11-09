import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = process.cwd();
const fixture = path.join(repo, 'tests', 'knowledge-compilation', 'bayes-example');
const scratchRoot = path.join(repo, 'scratch', 'canary');
fs.mkdirSync(scratchRoot, { recursive: true });
const testName = `stage-selection-${process.pid}`;

function runCanary(stages) {
  const args = [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(repo, 'tools', 'canary-run.ps1'),
    '-Name', `${testName}-${stages?.join('-') ?? 'default'}`,
    '-Source', fixture,
    '-Mode', 'mock',
  ];
  if (stages) args.push('-Stages', stages.join(','));
  const result = spawnSync('powershell.exe', args, { cwd: repo, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const prefix = `${testName}-${stages?.join('-') ?? 'default'}-`;
  const runName = fs.readdirSync(scratchRoot).find(name => name.startsWith(prefix));
  assert.ok(runName, `canary run directory not found for ${prefix}`);
  const runDir = path.join(scratchRoot, runName);
  return {
    runDir,
    report: JSON.parse(fs.readFileSync(path.join(runDir, 'run-report.json'), 'utf8')),
    manifest: JSON.parse(fs.readFileSync(path.join(runDir, 'run-manifest.json'), 'utf8')),
  };
}

const runs = [];
try {
  const full = runCanary();
  runs.push(full.runDir);
  assert.equal(full.report.status, 'completed');
  assert.deepEqual(full.report.requestedStages, ['SourceMap', 'LessonModel', 'Alignment']);
  assert.deepEqual(full.report.executedStages, ['SourceMap', 'LessonModel', 'Alignment']);
  assert.deepEqual(full.report.skippedStages, []);
  assert.deepEqual(full.manifest.requestedStages, full.report.requestedStages);
  assert.deepEqual(full.manifest.executedStages, full.report.executedStages);
  assert.deepEqual(full.manifest.skippedStages, full.report.skippedStages);
  assert.deepEqual(Object.keys(full.report.artifacts).sort(), ['alignment', 'lessonModel', 'sourceMap']);

  const sourceOnly = runCanary(['SourceMap']);
  runs.push(sourceOnly.runDir);
  assert.equal(sourceOnly.report.status, 'completed');
  assert.deepEqual(sourceOnly.report.requestedStages, ['SourceMap']);
  assert.deepEqual(sourceOnly.report.executedStages, ['SourceMap']);
  assert.deepEqual(sourceOnly.report.skippedStages, ['LessonModel', 'Alignment']);
  assert.deepEqual(Object.keys(sourceOnly.report.artifacts), ['sourceMap']);
  assert.equal(fs.existsSync(path.join(sourceOnly.runDir, 'lessonModel.json')), false);
  assert.equal(fs.existsSync(path.join(sourceOnly.runDir, 'alignment.json')), false);

  const sourceAndLesson = runCanary(['SourceMap', 'LessonModel']);
  runs.push(sourceAndLesson.runDir);
  assert.equal(sourceAndLesson.report.status, 'completed');
  assert.deepEqual(sourceAndLesson.report.requestedStages, ['SourceMap', 'LessonModel']);
  assert.deepEqual(sourceAndLesson.report.executedStages, ['SourceMap', 'LessonModel']);
  assert.deepEqual(sourceAndLesson.report.skippedStages, ['Alignment']);
  assert.deepEqual(Object.keys(sourceAndLesson.report.artifacts).sort(), ['lessonModel', 'sourceMap']);
  assert.equal(fs.existsSync(path.join(sourceAndLesson.runDir, 'alignment.json')), false);
} finally {
  for (const runDir of runs) fs.rmSync(runDir, { recursive: true, force: true });
  if (fs.existsSync(scratchRoot) && fs.readdirSync(scratchRoot).length === 0) fs.rmSync(scratchRoot, { recursive: true, force: true });
}

console.log('knowledge-compilation stage selection checks passed');
