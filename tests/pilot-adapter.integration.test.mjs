import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = 'D:\\Basical App\\Tencent\\Chat\\Wechat\\Wechat files\\xwechat_files\\wxid_nx1352qo8qgp22_58bc\\msg\\file\\2026-09\\贝叶斯网络与概率图模型讲解_实时转写.txt';
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-agent-pilot-adapter-'));
const pilotRoot = path.join(tempRoot, 'pilot-vault');
const productionRoot = path.join(tempRoot, 'production-vault');
const productionProbe = path.join(productionRoot, 'existing.md');
const configPath = path.join(tempRoot, 'PILOT_CANARY_001.json');
fs.mkdirSync(productionRoot, { recursive: true });
fs.writeFileSync(productionProbe, 'must remain untouched\n', 'utf8');
fs.writeFileSync(configPath, JSON.stringify({
  allowedPilotRoot: pilotRoot,
  allowExternalPilotRoot: true,
  productionVaultRoots: [productionRoot],
  sources: [sourcePath],
  course: '人工智能导论',
  runName: 'PILOT_CANARY_001_TEST',
  composerConfig: path.join(repoRoot, 'configs', 'real-case-001-human-note-consolidated.json'),
  mode: 'dry-run'
}, null, 2), 'utf8');

const run = mode => {
  const output = childProcess.execFileSync(process.execPath, ['--experimental-strip-types', 'tools/pilot-note.mjs', '--config', configPath, mode], { cwd: repoRoot, encoding: 'utf8' });
  return JSON.parse(output);
};

const dryRun = run('--dry-run');
assert.equal(dryRun.status, 'DRY_RUN');
assert.equal(dryRun.pipeline.invoked, true);
assert.equal(dryRun.wouldCommit, true);
assert.ok(dryRun.plannedFileCount >= 3);
assert.equal(fs.existsSync(pilotRoot), false, 'dry-run must not create pilot files');

const committed = run('--commit');
assert.equal(committed.status, 'COMMITTED');
assert.equal(committed.wouldCommit, false, 'commit mode reports that the dry-run gate is no longer pending');
assert.ok(committed.resolvedPilotPaths.some(file => file.includes(`${path.sep}candidate${path.sep}`)));
assert.ok(committed.resolvedPilotPaths.some(file => file.includes(`${path.sep}semantic${path.sep}`)));
assert.equal(fs.existsSync(path.join(pilotRoot, 'run-manifest.json')), true);
assert.equal(fs.readFileSync(productionProbe, 'utf8'), 'must remain untouched\n');
assert.equal(fs.readFileSync(sourcePath, 'utf8').length > 0, true);
for (const file of committed.resolvedPilotPaths) {
  const relative = path.relative(pilotRoot, file);
  assert.equal(relative.startsWith('..') || path.isAbsolute(relative), false, `artifact escaped pilot root: ${file}`);
}

console.log('pilot-adapter integration test passed');
