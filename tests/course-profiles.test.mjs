import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(repoRoot, 'configs', 'course-profiles.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

assert.equal(config.contractVersion, 'course-profiles/0.1');
assert.equal(typeof config.defaultProfile, 'string');
assert.ok(Array.isArray(config.profiles) && config.profiles.length >= 4);

const ids = new Set();
const slugs = new Set();
for (const profile of config.profiles) {
  assert.ok(profile.id && !ids.has(profile.id), `duplicate profile id: ${profile.id}`);
  ids.add(profile.id);
  assert.ok(profile.slug && !slugs.has(profile.slug), `duplicate profile slug: ${profile.slug}`);
  slugs.add(profile.slug);
  assert.ok(profile.course);
  assert.ok(profile.vaultRelativeRoot && !path.isAbsolute(profile.vaultRelativeRoot));
  assert.ok(Array.isArray(profile.defaultSnapshots) && profile.defaultSnapshots.length > 0);
  for (const snapshot of profile.defaultSnapshots) {
    const isGlobalIndex = snapshot === 'Mine/知识树.md';
    assert.ok(isGlobalIndex || snapshot.startsWith(profile.vaultRelativeRoot + '/'), `${profile.id}: snapshot escapes profile root`);
    assert.ok(!path.isAbsolute(snapshot), `${profile.id}: snapshot must be Vault-relative`);
  }
}

assert.ok(ids.has(config.defaultProfile));
console.log(`course profiles ok: ${config.profiles.length}`);
