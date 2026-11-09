import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const PILOT_LIMITS = Object.freeze({
  maxCreatedFiles: 20,
  maxModifiedFiles: 0,
  maxHumanNoteBytes: 524288,
  maxSidecarBytes: 2097152,
  maxTotalWriteBytes: 10485760,
  maxWritesPerPath: 1
});

export class PilotSafetyError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'PilotSafetyError';
    this.code = code;
    this.details = details;
  }
}

const isWindows = process.platform === 'win32';
const canonical = value => (isWindows ? value.toLowerCase() : value);

const isWithin = (root, candidate) => {
  const canonicalRoot = canonical(path.normalize(root));
  const canonicalCandidate = canonical(path.normalize(candidate));
  const relative = path.relative(canonicalRoot, canonicalCandidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

const hasForbiddenSegment = value => value
  .split(/[\\/]+/u)
  .some(segment => segment.toLowerCase() === '.obsidian');

const hasParentSegment = value => value.split(/[\\/]+/u).some(segment => segment === '..');

const WINDOWS_RESERVED_NAMES = new Set(['CON', 'PRN', 'AUX', 'NUL', ...Array.from({ length: 9 }, (_, index) => `COM${index + 1}`), ...Array.from({ length: 9 }, (_, index) => `LPT${index + 1}`)]);

function assertNoAds(value, code = 'ADS_PATH_FORBIDDEN') {
  if (!isWindows) return;
  const colonIndexes = [...value].flatMap((character, index) => character === ':' ? [index] : []);
  for (const index of colonIndexes) {
    const isDrivePrefix = index === 1 && /^[A-Za-z]$/u.test(value[0] ?? '') && path.isAbsolute(value);
    if (!isDrivePrefix) throw new PilotSafetyError(code, `NTFS alternate data streams are forbidden: ${value}`);
  }
}

function assertWindowsSafeSegments(value, code = 'WINDOWS_RESERVED_NAME') {
  if (!isWindows) return;
  assertNoAds(value, code === 'WINDOWS_RESERVED_NAME' ? 'ADS_PATH_FORBIDDEN' : code);
  for (const segment of value.split(/[\\/]+/u)) {
    if (!segment || /^[A-Za-z]:$/u.test(segment)) continue;
    if (/[. ]$/u.test(segment)) throw new PilotSafetyError('WINDOWS_RESERVED_NAME', `trailing dot/space is forbidden in Windows path: ${value}`);
    const base = segment.split('.')[0]?.toUpperCase();
    if (base && WINDOWS_RESERVED_NAMES.has(base)) throw new PilotSafetyError('WINDOWS_RESERVED_NAME', `reserved Windows name is forbidden: ${value}`);
  }
}

const displayPath = value => path.normalize(value);

function resolveExistingAncestor(target) {
  let current = target;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return current;
    current = parent;
  }
  return current;
}

function verifyRealPathInside(root, target) {
  const rootBoundary = resolveExistingAncestor(root);
  if (!fs.existsSync(rootBoundary)) return;
  const realRoot = fs.realpathSync.native(rootBoundary);
  const ancestor = resolveExistingAncestor(target);
  const realAncestor = fs.realpathSync.native(ancestor);
  if (!isWithin(realRoot, realAncestor)) {
    throw new PilotSafetyError('SYMLINK_ESCAPE', `path resolves outside allowedPilotRoot: ${target}`);
  }
  // lstat is deliberately used here: stat follows a link and would hide the
  // reparse point/junction that needs to be checked.
  let current = ancestor;
  while (isWithin(rootBoundary, current) && current !== path.dirname(current)) {
    const stats = fs.lstatSync(current);
    if (stats.isSymbolicLink()) {
      const realCurrent = fs.realpathSync.native(current);
      if (!isWithin(realRoot, realCurrent)) throw new PilotSafetyError('REPARSE_POINT_ESCAPE', `symlink/junction resolves outside allowedPilotRoot: ${current}`);
    }
    if (canonical(current) === canonical(rootBoundary)) break;
    current = path.dirname(current);
  }
}

function resolvePath(value, baseDir) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new PilotSafetyError('INVALID_PATH', 'path must be a non-empty string');
  }
  if (value.includes('\0')) throw new PilotSafetyError('INVALID_PATH', 'path contains NUL');
  assertWindowsSafeSegments(value, 'ADS_PATH_FORBIDDEN');
  return path.normalize(path.isAbsolute(value) ? value : path.resolve(baseDir, value));
}

function resolveTarget(value, allowedPilotRoot, artifactKind = 'candidate') {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new PilotSafetyError('INVALID_OUTPUT_PATH', 'candidate output path must be a non-empty string');
  }
  if (value.includes('\0')) throw new PilotSafetyError('INVALID_OUTPUT_PATH', 'output path contains NUL');
  if (hasParentSegment(value)) throw new PilotSafetyError('PATH_ESCAPE', `parent path segment is forbidden: ${value}`);
  assertWindowsSafeSegments(value);
  const target = resolvePath(value, allowedPilotRoot);
  if (!isWithin(allowedPilotRoot, target)) throw new PilotSafetyError('PATH_ESCAPE', `output is outside allowedPilotRoot: ${value}`);
  if (hasForbiddenSegment(target)) throw new PilotSafetyError('OBSIDIAN_PATH_FORBIDDEN', `output is under .obsidian: ${value}`);
  const relative = path.relative(allowedPilotRoot, target);
  const segments = relative.split(path.sep).filter(Boolean).map(segment => segment.toLowerCase());
  const filename = path.basename(target).toLowerCase();
  const artifactPathAllowed = artifactKind === 'artifact' && segments.includes('artifacts');
  const sidecarPathAllowed = artifactKind === 'sidecar' && segments.includes('semantic');
  const runManifestAllowed = artifactKind === 'run-manifest' && filename === 'run-manifest.json' && segments.length === 1;
  const candidatePathAllowed = artifactKind === 'candidate' && segments.includes('candidate');
  if (!candidatePathAllowed && !sidecarPathAllowed && !artifactPathAllowed && !runManifestAllowed) {
    throw new PilotSafetyError('ARTIFACT_PATH_FORBIDDEN', `output path is not allowed for artifact kind ${artifactKind}: ${value}`);
  }
  const extension = path.extname(target).toLowerCase();
  if (extension !== '.md' && extension !== '.json') {
    throw new PilotSafetyError('EXTENSION_FORBIDDEN', `only .md and .json outputs are allowed: ${value}`);
  }
  verifyRealPathInside(allowedPilotRoot, target);
  return target;
}

function resolveManifestPath(value, allowedPilotRoot, runId) {
  const raw = value ?? path.join('.learning-agent', 'pilot-runs', `${runId}.json`);
  if (typeof raw !== 'string' || raw.trim() === '') throw new PilotSafetyError('INVALID_MANIFEST_PATH', 'manifest path must be a non-empty string');
  if (raw.includes('\0') || hasParentSegment(raw)) throw new PilotSafetyError('PATH_ESCAPE', `invalid manifest path: ${raw}`);
  assertWindowsSafeSegments(raw);
  const target = resolvePath(raw, allowedPilotRoot);
  if (!isWithin(allowedPilotRoot, target)) throw new PilotSafetyError('PATH_ESCAPE', `manifest is outside allowedPilotRoot: ${raw}`);
  if (hasForbiddenSegment(target) || path.extname(target).toLowerCase() !== '.json') {
    throw new PilotSafetyError('MANIFEST_PATH_FORBIDDEN', `manifest must be a .json path outside .obsidian: ${raw}`);
  }
  verifyRealPathInside(allowedPilotRoot, target);
  return target;
}

function collectConfiguredProductionRoots(config, repoRoot) {
  const configured = Array.isArray(config.productionVaultRoots) ? config.productionVaultRoots : [];
  const fromEnvironment = process.env.LEARNING_AGENT_PRODUCTION_VAULT_ROOT;
  return [...configured, ...(fromEnvironment ? [fromEnvironment] : [])]
    .filter(value => typeof value === 'string' && value.trim() !== '')
    .map(value => resolvePath(value, repoRoot));
}

function assertSafePilotRoot(config, repoRoot) {
  const defaultRoot = path.resolve(repoRoot, 'pilot-vault');
  const configuredRoot = config.allowedPilotRoot;
  const root = resolvePath(configuredRoot ?? defaultRoot, repoRoot);
  if (hasForbiddenSegment(root)) throw new PilotSafetyError('PILOT_ROOT_FORBIDDEN', 'allowedPilotRoot cannot be under .obsidian');
  if (canonical(root) === canonical(repoRoot)) throw new PilotSafetyError('PILOT_ROOT_NOT_INDEPENDENT', 'allowedPilotRoot cannot be the repository root');
  if (configuredRoot !== undefined && canonical(root) !== canonical(defaultRoot) && config.allowExternalPilotRoot !== true) {
    throw new PilotSafetyError('EXTERNAL_PILOT_ROOT_REQUIRES_OPT_IN', 'a non-default pilot root requires allowExternalPilotRoot: true');
  }
  const productionRoots = collectConfiguredProductionRoots(config, repoRoot);
  for (const productionRoot of productionRoots) {
    if (isWithin(productionRoot, root) || isWithin(root, productionRoot)) {
      throw new PilotSafetyError('PRODUCTION_VAULT_FORBIDDEN', 'allowedPilotRoot overlaps a configured production Vault root');
    }
  }
  let rootAncestor = resolveExistingAncestor(root);
  while (rootAncestor !== path.dirname(rootAncestor)) {
    if (fs.lstatSync(rootAncestor).isSymbolicLink()) {
      throw new PilotSafetyError('PILOT_ROOT_REPARSE_FORBIDDEN', 'allowedPilotRoot or one of its parent directories is a symlink/junction');
    }
    rootAncestor = path.dirname(rootAncestor);
  }
  verifyRealPathInside(root, root);
  return { root, productionRoots };
}

function readContent(output, configDir, readFiles) {
  const hasContent = Object.prototype.hasOwnProperty.call(output, 'content');
  const hasContentFile = Object.prototype.hasOwnProperty.call(output, 'contentFile');
  if (hasContent === hasContentFile) {
    throw new PilotSafetyError('OUTPUT_CONTENT_REQUIRED', 'each candidate output must provide exactly one of content or contentFile');
  }
  if (hasContentFile) {
    const sourcePath = resolvePath(output.contentFile, configDir);
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      throw new PilotSafetyError('SOURCE_NOT_FOUND', `contentFile does not exist: ${sourcePath}`);
    }
    const buffer = fs.readFileSync(sourcePath);
    readFiles.push({ path: displayPath(sourcePath), bytes: buffer.byteLength, role: 'contentFile' });
    return buffer.toString('utf8');
  }
  if (typeof output.content === 'string') return output.content;
  if (path.extname(output.path).toLowerCase() !== '.json' || output.content === undefined) {
    throw new PilotSafetyError('INVALID_OUTPUT_CONTENT', 'Markdown content must be a string; JSON content may be a JSON value');
  }
  return `${JSON.stringify(output.content, null, 2)}\n`;
}

function validateOutputContent(target, content) {
  const extension = path.extname(target).toLowerCase();
  if (extension === '.json') {
    try {
      JSON.parse(content);
    } catch (error) {
      throw new PilotSafetyError('INVALID_JSON_OUTPUT', `JSON candidate is invalid: ${target}`, { cause: String(error) });
    }
  }
  const bytes = Buffer.byteLength(content, 'utf8');
  if (extension === '.md' && bytes > PILOT_LIMITS.maxHumanNoteBytes) {
    throw new PilotSafetyError('MAX_HUMAN_NOTE_BYTES', `${target} exceeds maxHumanNoteBytes`, { bytes });
  }
  if (extension === '.json' && bytes > PILOT_LIMITS.maxSidecarBytes) {
    throw new PilotSafetyError('MAX_SIDECAR_BYTES', `${target} exceeds maxSidecarBytes`, { bytes });
  }
  return bytes;
}

function addReadFile(readFiles, file) {
  const key = canonical(file.path);
  if (!readFiles.some(item => canonical(item.path) === key)) readFiles.push(file);
}

function generatedDirectories(outputs, configured, allowedPilotRoot) {
  const directories = new Map();
  for (const value of Array.isArray(configured) ? configured : []) {
    const directory = resolvePath(value, allowedPilotRoot);
    if (!isWithin(allowedPilotRoot, directory)) throw new PilotSafetyError('PATH_ESCAPE', `generated output directory is outside allowedPilotRoot: ${value}`);
    if (hasParentSegment(value) || hasForbiddenSegment(directory)) throw new PilotSafetyError('OUTPUT_DIRECTORY_FORBIDDEN', `invalid generated output directory: ${value}`);
    directories.set(canonical(directory), directory);
  }
  for (const output of outputs) {
    let current = path.dirname(output.target);
    while (isWithin(allowedPilotRoot, current) && canonical(current) !== canonical(allowedPilotRoot)) {
      directories.set(canonical(current), current);
      current = path.dirname(current);
    }
  }
  return [...directories.values()];
}

function assertSourcesNotGenerated(sources, directories, outputs) {
  for (const source of sources) {
    if (hasForbiddenSegment(source.path)) throw new PilotSafetyError('SOURCE_OBSIDIAN_FORBIDDEN', `source under .obsidian is forbidden: ${source.path}`);
    const realSource = fs.existsSync(source.path) ? fs.realpathSync.native(source.path) : source.path;
    if (directories.some(directory => isWithin(directory, source.path) || isWithin(directory, realSource))) {
      throw new PilotSafetyError('GENERATED_OUTPUT_AS_SOURCE', `generated output directory cannot be used as source: ${source.path}`);
    }
    if (outputs.some(output => canonical(output.target) === canonical(source.path))) {
      throw new PilotSafetyError('SOURCE_OUTPUT_COLLISION', `source and candidate output collide: ${source.path}`);
    }
  }
}

function buildManifest({ runId, mode, status, startedAt, completedAt, allowedPilotRoot, productionVaultRoots, readFiles, plannedWrites, writes, abortReason, configPath, configBytes, generatedOutputDirs }) {
  const actualReadFiles = [...(configPath && configBytes !== undefined ? [{ path: displayPath(configPath), bytes: configBytes, role: 'config' }] : []), ...(readFiles ?? [])];
  return {
    manifestVersion: 'pilot-safe-run/0.1',
    runId,
    mode,
    status,
    startedAt,
    completedAt,
    allowedPilotRoot: displayPath(allowedPilotRoot),
    productionVaultRoots: productionVaultRoots.map(displayPath),
    automaticRepair: 'DISABLED',
    generatedOutputDirs: generatedOutputDirs.map(displayPath),
    limits: PILOT_LIMITS,
    readFiles: actualReadFiles,
    writes: writes.map(item => ({ ...item, path: displayPath(item.path) })),
    plannedWrites: plannedWrites.map(item => ({ ...item, path: displayPath(item.path) })),
    createdFiles: writes.filter(item => item.action === 'CREATE').length,
    modifiedFiles: writes.filter(item => item.action === 'MODIFY').length,
    totalWriteBytes: writes.reduce((sum, item) => sum + item.bytes, 0),
    abortReason: abortReason ?? null,
    manifestPath: null
  };
}

function writeAtomic(target, content, runId, index) {
  const directory = path.dirname(target);
  fs.mkdirSync(directory, { recursive: true });
  const extension = path.extname(target).toLowerCase();
  const temporary = path.join(directory, `.${path.basename(target, extension)}.tmp-${runId}-${index}${extension}`);
  try {
    if (fs.existsSync(target)) throw new PilotSafetyError('TARGET_APPEARED', `target appeared before atomic rename: ${target}`);
    fs.writeFileSync(temporary, content, { encoding: 'utf8', flag: 'wx' });
    const roundTrip = fs.readFileSync(temporary, 'utf8');
    if (Buffer.byteLength(roundTrip, 'utf8') !== Buffer.byteLength(content, 'utf8')) {
      throw new PilotSafetyError('ATOMIC_VALIDATION_FAILED', `temporary file validation failed: ${target}`);
    }
    if (extension === '.json') JSON.parse(roundTrip);
    if (fs.existsSync(target)) throw new PilotSafetyError('TARGET_APPEARED', `target appeared before atomic rename: ${target}`);
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
}

function persistManifest(manifest, manifestPath, runId) {
  manifest.manifestPath = displayPath(manifestPath);
  const content = `${JSON.stringify(manifest, null, 2)}\n`;
  writeAtomic(manifestPath, content, runId, 'manifest');
  return Buffer.byteLength(content, 'utf8');
}

export function executePilotRun({ config, repoRoot = process.cwd(), configPath, configBytes }) {
  const startedAt = new Date().toISOString();
  const runId = `${startedAt.replace(/[-:.TZ]/gu, '')}-${crypto.randomBytes(4).toString('hex')}`;
  const mode = config?.mode;
  let rootInfo;
  let manifestPath;
  const readFiles = [];
  const outputs = [];
  const sources = [];
  let generatedOutputDirs = [];
  let plannedWrites = [];
  try {
    if (!config || typeof config !== 'object') throw new PilotSafetyError('INVALID_CONFIG', 'pilot config must be an object');
    if (mode !== 'dry-run' && mode !== 'commit') throw new PilotSafetyError('INVALID_MODE', 'mode must be dry-run or commit');
    rootInfo = assertSafePilotRoot(config, repoRoot);
    manifestPath = resolveManifestPath(config.manifestPath, rootInfo.root, runId);
    if (canonical(manifestPath) === canonical(rootInfo.root)) throw new PilotSafetyError('INVALID_MANIFEST_PATH', 'manifest must be a file under allowedPilotRoot');
    if (config.automaticRepair !== undefined && config.automaticRepair !== false) {
      throw new PilotSafetyError('AUTOMATIC_REPAIR_DISABLED', 'automatic repair is disabled in pilot-safe mode');
    }

    const configDir = configPath ? path.dirname(configPath) : repoRoot;
    const rawOutputs = config.candidateOutputs ?? config.writes;
    if (!Array.isArray(rawOutputs)) throw new PilotSafetyError('OUTPUTS_REQUIRED', 'candidateOutputs must be an array');
    const seenTargets = new Set();
    for (const [index, output] of rawOutputs.entries()) {
      if (!output || typeof output !== 'object') throw new PilotSafetyError('INVALID_OUTPUT', `candidate output ${index} must be an object`);
      const artifactKind = output.artifactKind ?? 'candidate';
      const target = resolveTarget(output.path, rootInfo.root, artifactKind);
      const key = canonical(target);
      if (seenTargets.has(key)) throw new PilotSafetyError('MAX_WRITES_PER_PATH', `candidate output path appears more than once: ${target}`);
      seenTargets.add(key);
      const content = readContent(output, configDir, readFiles);
      const bytes = validateOutputContent(target, content);
      const exists = fs.existsSync(target);
      if (exists && !fs.statSync(target).isFile()) throw new PilotSafetyError('TARGET_NOT_FILE', `candidate target is not a file: ${target}`);
      outputs.push({ target, content, bytes, action: exists ? 'MODIFY' : 'CREATE', index, artifactKind });
    }

    const created = outputs.filter(output => output.action === 'CREATE');
    const modified = outputs.filter(output => output.action === 'MODIFY');
    if (modified.length > 0) throw new PilotSafetyError('USER_NOTE_OVERWRITE_FORBIDDEN', 'existing files cannot be overwritten; write a new candidate path', { paths: modified.map(output => displayPath(output.target)) });
    if (created.length > PILOT_LIMITS.maxCreatedFiles) throw new PilotSafetyError('MAX_CREATED_FILES', 'maxCreatedFiles exceeded', { count: created.length });
    if (modified.length > PILOT_LIMITS.maxModifiedFiles) throw new PilotSafetyError('MAX_MODIFIED_FILES', 'maxModifiedFiles exceeded', { count: modified.length });
    const totalBytes = outputs.reduce((sum, output) => sum + output.bytes, 0);
    if (totalBytes > PILOT_LIMITS.maxTotalWriteBytes) throw new PilotSafetyError('MAX_TOTAL_WRITE_BYTES', 'maxTotalWriteBytes exceeded', { bytes: totalBytes });

    generatedOutputDirs = generatedDirectories(outputs, config.generatedOutputDirs, rootInfo.root);
    plannedWrites = outputs.map(output => ({ path: output.target, bytes: output.bytes, action: output.action, artifactKind: output.artifactKind }));
    for (const source of Array.isArray(config.sourceMaterials) ? config.sourceMaterials : []) {
      const sourceValue = typeof source === 'string' ? source : source?.path;
      const sourcePath = resolvePath(sourceValue, configDir);
      if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) throw new PilotSafetyError('SOURCE_NOT_FOUND', `source material does not exist: ${sourcePath}`);
      const buffer = fs.readFileSync(sourcePath);
      const record = { path: displayPath(sourcePath), bytes: buffer.byteLength };
      sources.push(record);
      addReadFile(readFiles, { path: record.path, bytes: record.bytes, role: 'source' });
    }
    assertSourcesNotGenerated(sources.map(source => ({ ...source, path: path.resolve(source.path) })), generatedOutputDirs, outputs);

    if (fs.existsSync(manifestPath)) throw new PilotSafetyError('MANIFEST_EXISTS', 'run manifest path already exists', { path: displayPath(manifestPath) });

    if (mode === 'dry-run') {
      const manifest = buildManifest({ runId, mode, status: 'DRY_RUN', startedAt, completedAt: new Date().toISOString(), allowedPilotRoot: rootInfo.root, productionVaultRoots: rootInfo.productionRoots, readFiles, plannedWrites, writes: [], abortReason: null, configPath, configBytes, generatedOutputDirs });
      manifest.manifestPath = displayPath(manifestPath);
      return { status: 'DRY_RUN', exitCode: 0, manifest, plannedWrites: outputs.map(output => ({ path: displayPath(output.target), bytes: output.bytes, action: output.action, artifactKind: output.artifactKind })) };
    }

    const writes = [];
    try {
      for (const output of outputs) {
        verifyRealPathInside(rootInfo.root, output.target);
        writeAtomic(output.target, output.content, runId, output.index);
        writes.push({ path: output.target, bytes: output.bytes, action: 'CREATE', artifactKind: output.artifactKind });
      }
      const manifest = buildManifest({ runId, mode, status: 'COMMITTED', startedAt, completedAt: new Date().toISOString(), allowedPilotRoot: rootInfo.root, productionVaultRoots: rootInfo.productionRoots, readFiles, plannedWrites, writes, abortReason: null, configPath, configBytes, generatedOutputDirs });
      persistManifest(manifest, manifestPath, runId);
      return { status: 'COMMITTED', exitCode: 0, manifest, plannedWrites: outputs.map(output => ({ path: displayPath(output.target), bytes: output.bytes, action: output.action, artifactKind: output.artifactKind })) };
    } catch (error) {
      const failure = error instanceof PilotSafetyError ? error : new PilotSafetyError('WRITE_FAILED', String(error));
      const manifest = buildManifest({ runId, mode, status: 'ABORTED', startedAt, completedAt: new Date().toISOString(), allowedPilotRoot: rootInfo.root, productionVaultRoots: rootInfo.productionRoots, readFiles, plannedWrites, writes, abortReason: `${failure.code}: ${failure.message}`, configPath, configBytes, generatedOutputDirs });
      try { persistManifest(manifest, manifestPath, runId); } catch { /* keep the original failure visible */ }
      return { status: 'ABORTED', exitCode: 2, manifest, abortReason: manifest.abortReason };
    }
  } catch (error) {
    const failure = error instanceof PilotSafetyError ? error : new PilotSafetyError('PILOT_RUN_FAILED', String(error));
    const safeRoot = rootInfo?.root;
    const canPersist = safeRoot && manifestPath && !hasForbiddenSegment(manifestPath) && isWithin(safeRoot, manifestPath);
    const partialPlan = plannedWrites.length > 0 ? plannedWrites : outputs.map(output => ({ path: output.target, bytes: output.bytes, action: output.action, artifactKind: output.artifactKind }));
    const manifest = buildManifest({ runId, mode: mode ?? 'unknown', status: 'ABORTED', startedAt, completedAt: new Date().toISOString(), allowedPilotRoot: safeRoot ?? path.resolve(repoRoot, 'pilot-vault'), productionVaultRoots: rootInfo?.productionRoots ?? [], readFiles, plannedWrites: partialPlan, writes: [], abortReason: `${failure.code}: ${failure.message}`, configPath, configBytes, generatedOutputDirs });
    if (mode === 'commit' && canPersist && !fs.existsSync(manifestPath)) {
      try { persistManifest(manifest, manifestPath, runId); } catch { /* reporting remains the fallback */ }
    }
    return { status: 'ABORTED', exitCode: 2, manifest, abortReason: manifest.abortReason };
  }
}

export function loadPilotConfig(configPath) {
  const resolved = path.resolve(configPath);
  const raw = fs.readFileSync(resolved);
  const parsed = JSON.parse(raw.toString('utf8'));
  return { config: parsed, configPath: resolved, configBytes: raw.byteLength };
}

export function formatPilotResult(result) {
  return JSON.stringify(result, null, 2);
}

export const pilotPlatform = { isWindows, tmpdir: os.tmpdir() };
