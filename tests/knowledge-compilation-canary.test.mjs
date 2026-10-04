import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-agent-canary-'));
const runDir = path.join(temp, 'run');
const sourceDir = path.join(runDir, 'source');
const sourceText = `${'oversized transcript line for command-line regression test.\n'.repeat(800)}${'x'.repeat(10000)}`;
const sourcePath = path.join(sourceDir, 'source.txt');
const cliPath = path.join(temp, 'dsh-stub.mjs');
const packagePath = path.join(temp, 'package.json');
const invocationPath = path.join(runDir, 'dsh-call.json');

try {
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(sourcePath, sourceText, 'utf8');
  assert.ok(Buffer.byteLength(sourceText, 'utf8') > 32767, 'fixture must exceed Windows command-line limit');
  fs.writeFileSync(packagePath, JSON.stringify({ version: 'test-stub' }));
  fs.writeFileSync(cliPath, `
    import fs from 'node:fs';
    import path from 'node:path';
    const args = process.argv.slice(2);
    const prompt = args.at(-1);
    const inputPath = path.join(process.cwd(), 'stage-input-source-map.txt');
    fs.writeFileSync(path.join(process.cwd(), 'dsh-call.json'), JSON.stringify({
      prompt, promptLength: prompt.length,
      inputBytes: fs.statSync(inputPath).size,
      input: fs.readFileSync(inputPath, 'utf8'),
    }));
    process.stdout.write('{}\\n');
  `);
  fs.writeFileSync(path.join(runDir, 'run-manifest.json'), JSON.stringify({
    contractVersion: 'run-manifest/0.1', schemaVersion: '0.1', status: 'draft', runId: 'large-input-test',
    caseId: { availability: 'not-applicable', reason: 'Regression test.' }, startedAt: new Date().toISOString(),
    git: { availability: 'unavailable', reason: 'Regression test.' },
    runtime: { availability: 'present', requested: { kind: 'dsh' }, resolved: { kind: 'dsh', version: 'test-stub' }, resolution: 'unknown' },
    model: { requested: 'test-model', resolved: { availability: 'unavailable', reason: 'Regression test.' } },
    versions: { prompts: {}, schemas: {} },
  }));

  const result = spawnSync(process.execPath, ['tools/knowledge-compilation-canary.mjs', runDir, 'real', 'test-model', 'low'], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, CANARY_DSH_CLI: cliPath, CANARY_DSH_PACKAGE: packagePath, CANARY_REPO_ROOT: repo },
    timeout: 30000,
  });
  assert.notEqual(result.status, 0, 'stub returns invalid SourceMap so the canary should stop after the first call');
  assert.ok(fs.existsSync(invocationPath), `model entry was not reached: ${result.stderr}`);
  const call = JSON.parse(fs.readFileSync(invocationPath, 'utf8'));
  assert.ok(call.promptLength < 1000, 'DSH argv should contain only the short bootstrap prompt');
  assert.ok(call.inputBytes > 32767, 'complete stage input should be written to a file');
  assert.ok(call.input.includes(fs.readFileSync(sourcePath, 'utf8')), 'stage file should preserve the complete source text');
  assert.match(call.prompt, /stage-input-source-map\.txt/);
  const report = JSON.parse(fs.readFileSync(path.join(runDir, 'run-report.json'), 'utf8'));
  assert.doesNotMatch(report.error, /ENAMETOOLONG/);
  assert.match(report.error, /source-map:/i, 'failure should be schema validation, not process argument length');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('knowledge-compilation canary oversized-input check passed');
