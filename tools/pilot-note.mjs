#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { executePilotRun, formatPilotResult, loadPilotConfig } from '../src/pilot-safe/index.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseMode(config) {
  const requested = process.argv.includes('--commit') ? 'commit' : process.argv.includes('--dry-run') ? 'dry-run' : config.mode;
  if (process.argv.includes('--commit') && process.argv.includes('--dry-run')) throw new Error('use only one of --dry-run or --commit');
  if (requested !== 'dry-run' && requested !== 'commit') throw new Error('mode must be dry-run or commit');
  return requested;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function resolveConfigPath(value, configDir) {
  return path.normalize(path.isAbsolute(value) ? value : path.resolve(configDir, value));
}

function safeRunName(value) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('runName is required');
  const name = value.trim().replace(/[\\/:*?"<>|]/gu, '-');
  if (!name || name === '.' || name === '..' || name.includes('..')) throw new Error('runName contains an unsafe path segment');
  return name;
}

function classifyArtifact(relativePath, runName) {
  const normalized = relativePath.split(path.sep).join('/');
  if (normalized.startsWith('candidate/') && normalized.toLowerCase().endsWith('.md')) {
    return { path: normalized, artifactKind: 'candidate' };
  }
  if (normalized.startsWith('semantic/') && normalized.toLowerCase().endsWith('.json')) {
    return { path: normalized, artifactKind: 'sidecar' };
  }
  return { path: `artifacts/${runName}/${normalized}`, artifactKind: 'artifact' };
}

function collectArtifacts(outputRoot, runName) {
  const files = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) files.push(full);
    }
  };
  visit(outputRoot);
  return files.map(file => {
    const relativePath = path.relative(outputRoot, file);
    const classification = classifyArtifact(relativePath, runName);
    const content = fs.readFileSync(file, 'utf8');
    return { ...classification, content, bytes: Buffer.byteLength(content, 'utf8'), sourceArtifact: relativePath.split(path.sep).join('/') };
  });
}

function sourceReference(repoRoot, composerConfig, sourcePath) {
  const sourceMapPath = resolveConfigPath(composerConfig.sourceMapPath, repoRoot);
  const sourceMap = readJson(sourceMapPath);
  const referenced = sourceMap.sources?.[0]?.location;
  if (typeof referenced !== 'string') throw new Error('composer SourceMap has no source location');
  const referencedPath = resolveConfigPath(referenced, repoRoot);
  if (!fs.existsSync(referencedPath)) throw new Error(`composer source reference does not exist: ${referencedPath}`);
  const sourceHash = sha256(fs.readFileSync(sourcePath));
  const referencedHash = sha256(fs.readFileSync(referencedPath));
  if (sourceHash !== referencedHash) throw new Error('canary source does not match the existing Composer SourceMap source');
  return {
    sourceMapPath: path.normalize(sourceMapPath),
    referencedPath: path.normalize(referencedPath),
    sha256: sourceHash
  };
}

function safetyChecks(result) {
  const manifest = result.manifest ?? {};
  return [
    { name: 'allowedPilotRoot containment', status: result.status === 'ABORTED' && /PATH_ESCAPE|PILOT_ROOT|PRODUCTION_VAULT|SYMLINK|REPARSE/u.test(result.abortReason ?? '') ? 'FAIL' : 'PASS' },
    { name: 'existing final path overwrite', status: result.status === 'ABORTED' && /USER_NOTE_OVERWRITE|TARGET_APPEARED/u.test(result.abortReason ?? '') ? 'FAIL' : 'PASS' },
    { name: '.obsidian and extension policy', status: result.status === 'ABORTED' && /OBSIDIAN|EXTENSION|ARTIFACT_PATH/u.test(result.abortReason ?? '') ? 'FAIL' : 'PASS' },
    { name: 'file and byte limits', status: result.status === 'ABORTED' && /MAX_/u.test(result.abortReason ?? '') ? 'FAIL' : 'PASS' },
    { name: 'automatic repair disabled', status: manifest.automaticRepair === 'DISABLED' ? 'PASS' : 'FAIL' },
    { name: 'atomic commit gate', status: result.status === 'ABORTED' ? 'FAIL' : 'PASS' }
  ];
}

async function main() {
  const configArgument = argumentValue('--config');
  if (!configArgument) throw new Error('usage: npm run pilot:note -- --config <pilot-config.json> [--dry-run|--commit]');
  const loaded = loadPilotConfig(path.resolve(configArgument));
  const config = loaded.config;
  const mode = parseMode(config);
  const configDir = path.dirname(loaded.configPath);
  const sources = config.sources;
  if (!Array.isArray(sources) || sources.length !== 1) throw new Error('Pilot Adapter currently requires exactly one source');
  const sourcePath = resolveConfigPath(sources[0], configDir);
  const extension = path.extname(sourcePath).toLowerCase();
  if (extension !== '.txt' && extension !== '.md') throw new Error('Pilot Adapter supports only .txt and .md sources');
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) throw new Error(`source does not exist: ${sourcePath}`);
  const sourceBuffer = fs.readFileSync(sourcePath);
  const runName = safeRunName(config.runName);
  const composerConfigPath = resolveConfigPath(config.composerConfig ?? 'configs/real-case-001-human-note-consolidated.json', configDir);
  const composerConfig = readJson(composerConfigPath);
  if (composerConfig.composerMode !== 'consolidated-dli') throw new Error('Pilot Adapter currently invokes the consolidated-dli Composer only');
  const sourceRef = sourceReference(repoRoot, composerConfig, sourcePath);
  const temporaryOutputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-agent-pilot-composer-'));
  let artifacts = [];
  let composerInvoked = false;
  try {
    const { composeConsolidatedHumanNote } = await import('../src/human-note-v2/composer-v2-1.ts');
    composerInvoked = true;
    const composerLog = console.log;
    console.log = () => {};
    try {
      composeConsolidatedHumanNote({ ...composerConfig, outputDir: temporaryOutputRoot }, repoRoot);
    } finally {
      console.log = composerLog;
    }
    artifacts = collectArtifacts(temporaryOutputRoot, runName);
    const hasNote = artifacts.some(artifact => artifact.artifactKind === 'candidate');
    const hasSidecar = artifacts.some(artifact => artifact.artifactKind === 'sidecar');
    if (!hasNote || !hasSidecar) throw new Error('Composer did not produce candidate Markdown and semantic JSON artifacts');

    const plannedManifest = {
      manifestVersion: 'pilot-canary/0.1',
      runName,
      course: config.course ?? null,
      mode,
      wouldCommit: true,
      source: { path: path.normalize(sourcePath), extension, bytes: sourceBuffer.byteLength, sha256: sha256(sourceBuffer) },
      sourceReference: sourceRef,
      pipeline: { invoked: true, composer: 'composeConsolidatedHumanNote', composerConfig: path.normalize(composerConfigPath), workspace: 'ephemeral-temp-workdir' },
      artifacts: artifacts.map(artifact => ({ path: artifact.path, artifactKind: artifact.artifactKind, bytes: artifact.bytes, sourceArtifact: artifact.sourceArtifact })),
      automaticRepair: 'DISABLED'
    };
    const candidateOutputs = [
      ...artifacts.map(artifact => ({ path: artifact.path, artifactKind: artifact.artifactKind, content: artifact.content })),
      { path: 'run-manifest.json', artifactKind: 'run-manifest', content: plannedManifest }
    ];
    const result = executePilotRun({
      config: {
        mode,
        allowedPilotRoot: config.allowedPilotRoot,
        sourceMaterials: [sourcePath],
        candidateOutputs,
        automaticRepair: false,
        productionVaultRoots: config.productionVaultRoots,
        allowExternalPilotRoot: config.allowExternalPilotRoot
      },
      repoRoot,
      configPath: loaded.configPath,
      configBytes: loaded.configBytes
    });
    const plannedFiles = result.manifest?.plannedWrites ?? result.plannedWrites ?? [];
    const report = {
      status: result.status,
      runName,
      course: config.course ?? null,
      mode,
      sourcesRead: [{ path: path.normalize(sourcePath), bytes: sourceBuffer.byteLength, sha256: sha256(sourceBuffer) }],
      pipeline: { invoked: composerInvoked, composer: 'composeConsolidatedHumanNote', composerConfig: path.normalize(composerConfigPath) },
      plannedFiles,
      plannedFileCount: plannedFiles.length,
      plannedBytes: plannedFiles.reduce((sum, item) => sum + item.bytes, 0),
      resolvedPilotPaths: plannedFiles.map(item => item.path),
      safetyChecks: safetyChecks(result),
      wouldCommit: result.status === 'DRY_RUN',
      abortReason: result.abortReason ?? null,
      pilotSafeManifest: result.manifest
    };
    console.log(formatPilotResult(report));
    process.exitCode = result.exitCode;
  } finally {
    fs.rmSync(temporaryOutputRoot, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(JSON.stringify({ status: 'ABORTED', pipelineInvoked: false, wouldCommit: false, abortReason: String(error) }, null, 2));
  process.exitCode = 2;
}
