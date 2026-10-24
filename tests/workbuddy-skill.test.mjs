import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillRoot = path.join(repoRoot, 'workbuddy', 'learning-knowledge-growth-workbuddy');
const skill = fs.readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8');
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? '';

for (const field of ['name:', 'description:', 'description_zh:', 'description_en:', 'version:', 'author:']) {
  assert.match(frontmatter, new RegExp(`^${field.replace(':', '\\:')}`, 'm'), `missing WorkBuddy field ${field}`);
}
assert.match(frontmatter, /^user-invocable:\s*true$/m);
assert.match(frontmatter, /^version:\s*0\.2\.1$/m);
assert.doesNotMatch(skill, /Codex|openai\.yaml/u);
assert.match(skill, /@references\/input-modes\.md/u);
assert.match(skill, /@references\/workbuddy-harness\.md/u);
assert.doesNotMatch(skill, /connector|连接器|ima 知识库|腾讯乐享/u);

for (const relative of [
  'references/ai-index-protocol.md',
  'references/input-modes.md',
  'references/learning-agent-integration.md',
  'references/note-writing.md',
  'references/workbuddy-harness.md',
]) {
  assert.ok(fs.existsSync(path.join(skillRoot, relative)), `missing ${relative}`);
}

const py = process.env.PYTHON || 'python';
const zipPath = path.join(repoRoot, 'dist', 'learning-knowledge-growth.workbuddy.skill.zip');
const listing = execFileSync(py, ['-B', '-c', `import zipfile; print("\\n".join(zipfile.ZipFile(r'''${zipPath}''').namelist()))`], { encoding: 'utf8' });
assert.match(listing, /^learning-knowledge-growth-workbuddy\/SKILL\.md$/m);
assert.match(listing, /learning-knowledge-growth-workbuddy\/references\/workbuddy-harness\.md/u);
assert.doesNotMatch(listing, /openai\.yaml/u);
assert.doesNotMatch(listing, /\/scripts\//u);
assert.doesNotMatch(listing, /connector-integration\.md/u);
assert.doesNotMatch(skill, /D:\\\\|C:\\\\Users|sk-[A-Za-z0-9_-]{16,}/u);
const bundledMarkdown = listing.split(/\r?\n/u).filter((entry) => entry.endsWith('.md'));
for (const relative of bundledMarkdown) {
  const text = execFileSync(py, ['-B', '-c', `import zipfile; print(zipfile.ZipFile(r'''${zipPath}''').read(r'''${relative}''').decode('utf-8'))`], { encoding: 'utf8' });
  assert.doesNotMatch(text, /https?:\/\//u, `WorkBuddy package must not advertise runtime HTTP calls: ${relative}`);
  assert.doesNotMatch(text, /\bAPI Key\b|\bAPI keys?\b/iu, `WorkBuddy package must not request API keys: ${relative}`);
}
console.log('WorkBuddy Skill package checks passed');
