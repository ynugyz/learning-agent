import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(repoRoot, 'skill', 'learning-knowledge-growth');
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const target = path.join(codexHome, 'skills', 'learning-knowledge-growth');

if (!fs.existsSync(path.join(source, 'SKILL.md'))) {
  throw new Error(`Skill source is missing: ${source}`);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(source, target, { recursive: true });
console.log(JSON.stringify({ source, target, status: 'installed' }, null, 2));
