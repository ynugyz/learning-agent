import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { executePilotRun, PILOT_LIMITS } from '../src/pilot-safe/index.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-agent-pilot-safe-'));
const repoRoot = path.join(tempRoot, 'repo');
const pilotRoot = path.join(tempRoot, '我的 Pilot Vault');
const sourceRoot = path.join(tempRoot, 'source materials');
fs.mkdirSync(repoRoot, { recursive: true });
fs.mkdirSync(sourceRoot, { recursive: true });
fs.writeFileSync(path.join(sourceRoot, '课堂 转写.txt'), '只读课堂来源\n', 'utf8');

const configBase = extra => ({
  mode: 'dry-run',
  allowedPilotRoot: pilotRoot,
  allowExternalPilotRoot: true,
  sourceMaterials: [path.join(sourceRoot, '课堂 转写.txt')],
  candidateOutputs: [
    { path: 'candidate/贝叶斯 网络.md', content: '# 贝叶斯网络\n' },
    { path: 'candidate/贝叶斯 网络.semantic.json', content: { source: '课堂 转写.txt' } }
  ],
  ...extra
});

let result = executePilotRun({ config: configBase({}), repoRoot });
assert.equal(result.status, 'DRY_RUN');
assert.equal(result.manifest.readFiles.some(file => file.path.endsWith('课堂 转写.txt')), true);
assert.equal(result.manifest.plannedWrites.length, 2);
assert.equal(fs.existsSync(path.join(pilotRoot, 'candidate')), false, 'dry-run must not create directories');
assert.equal(PILOT_LIMITS.maxModifiedFiles, 0);

const artifactPlan = executePilotRun({ config: configBase({
  candidateOutputs: [
    { path: 'candidate/artifact-note.md', content: '# note' },
    { path: 'semantic/artifact-sidecar.json', artifactKind: 'sidecar', content: { ok: true } },
    { path: 'run-manifest.json', artifactKind: 'run-manifest', content: { status: 'planned' } }
  ]
}), repoRoot });
assert.equal(artifactPlan.status, 'DRY_RUN');
assert.deepEqual(artifactPlan.plannedWrites.map(item => item.artifactKind), ['candidate', 'sidecar', 'run-manifest']);

result = executePilotRun({ config: configBase({ mode: 'commit' }), repoRoot });
assert.equal(result.status, 'COMMITTED');
assert.equal(fs.readFileSync(path.join(pilotRoot, 'candidate', '贝叶斯 网络.md'), 'utf8'), '# 贝叶斯网络\n');
assert.equal(fs.readFileSync(path.join(sourceRoot, '课堂 转写.txt'), 'utf8'), '只读课堂来源\n');
assert.equal(fs.existsSync(result.manifest.manifestPath), true);
const committedManifest = JSON.parse(fs.readFileSync(result.manifest.manifestPath, 'utf8'));
assert.equal(committedManifest.status, 'COMMITTED');
assert.equal(committedManifest.writes.length, 2);
assert.equal(committedManifest.totalWriteBytes > 0, true);

const abortFor = config => {
  const aborted = executePilotRun({ config, repoRoot });
  assert.equal(aborted.status, 'ABORTED');
  assert.match(aborted.abortReason, /^[A-Z0-9_]+:/u);
  return aborted;
};

// Existing final paths fail before any candidate write.
const existing = abortFor(configBase({ mode: 'commit', manifestPath: '.learning-agent/pilot-runs/existing-target.json' }));
assert.match(existing.abortReason, /USER_NOTE_OVERWRITE_FORBIDDEN/u);
assert.equal(fs.readFileSync(path.join(pilotRoot, 'candidate', '贝叶斯 网络.md'), 'utf8'), '# 贝叶斯网络\n');

// Containment uses path.relative semantics: sibling prefixes and parent paths fail.
abortFor(configBase({ candidateOutputs: [{ path: path.join(`${pilotRoot}-Evil`, 'candidate', 'x.md'), content: 'x' }] }));
abortFor(configBase({ candidateOutputs: [{ path: '../pilot-vault-escape/candidate/x.md', content: 'x' }] }));
abortFor(configBase({ candidateOutputs: [{ path: '.obsidian/candidate/x.md', content: 'x' }] }));
abortFor(configBase({ candidateOutputs: [{ path: 'candidate/x.txt', content: 'x' }] }));
abortFor(configBase({ allowedPilotRoot: repoRoot, productionVaultRoots: [repoRoot] }));

if (process.platform === 'win32') {
  abortFor(configBase({ candidateOutputs: [{ path: 'candidate/note.md:evil', content: 'x' }] }));
  abortFor(configBase({ candidateOutputs: [{ path: 'candidate/CON.md', content: 'x' }] }));
}

// Generated output directories are never accepted as source input.
const generatedSource = path.join(pilotRoot, 'candidate', 'future.md');
fs.mkdirSync(path.dirname(generatedSource), { recursive: true });
fs.writeFileSync(generatedSource, 'generated', 'utf8');
abortFor(configBase({ candidateOutputs: [{ path: 'candidate/new.md', content: 'new' }], sourceMaterials: [generatedSource] }));

// Any safety limit aborts the complete plan before output writes begin.
const tooMany = Array.from({ length: PILOT_LIMITS.maxCreatedFiles + 1 }, (_, index) => ({ path: `candidate/bulk-${index}.md`, content: 'x' }));
const limited = abortFor(configBase({ candidateOutputs: tooMany }));
assert.match(limited.abortReason, /MAX_CREATED_FILES/u);
assert.equal(fs.existsSync(path.join(pilotRoot, 'candidate', 'bulk-0.md')), false);

// Automatic repair is a hard stop, even when outputs look valid.
abortFor(configBase({ automaticRepair: true }));

// An abort manifest retains reads performed before the failing validation.
const contentFile = path.join(sourceRoot, 'candidate-content.json');
fs.writeFileSync(contentFile, '{"from":"contentFile"}\n', 'utf8');
const readPreserved = abortFor(configBase({
  mode: 'commit',
  candidateOutputs: [
    { path: 'candidate/from-file.json', contentFile },
    { path: 'candidate/bad.json', content: '{not json}' }
  ]
}));
assert.equal(readPreserved.manifest.readFiles.some(file => file.path.endsWith('candidate-content.json')), true);

// Symlink/junction escape is rejected when the host allows creating one.
const outside = path.join(tempRoot, 'outside');
const link = path.join(pilotRoot, 'candidate-link');
fs.mkdirSync(outside, { recursive: true });
try {
  fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  abortFor(configBase({ candidateOutputs: [{ path: 'candidate-link/candidate/x.md', content: 'x' }] }));
} catch {
  // Windows may deny junction creation in a restricted test host.
}

console.log('pilot-safe tests passed');
