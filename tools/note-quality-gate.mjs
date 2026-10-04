#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { auditHumanNote } from '../src/quality/deterministic.ts';
import { applySectionPatch } from '../src/quality/patch.ts';

const [notePath, sourceMapPath, patchPath] = process.argv.slice(2);
if (!notePath || !sourceMapPath) throw new Error('usage: node --experimental-strip-types tools/note-quality-gate.mjs <note.md> <source-map.json> [section-patch.json]');
const repo = path.resolve(import.meta.dirname, '..');
const absolute = file => path.resolve(repo, file);
let note = fs.readFileSync(absolute(notePath), 'utf8');
const sourceMap = JSON.parse(fs.readFileSync(absolute(sourceMapPath), 'utf8'));
const before = auditHumanNote(note, sourceMap);
const patchPayload = patchPath ? JSON.parse(fs.readFileSync(absolute(patchPath), 'utf8')) : [];
const patches = Array.isArray(patchPayload) ? patchPayload : [patchPayload];
if (!Array.isArray(patches) || patches.length > 2) throw new Error('at most two local patches are allowed');
const patchResults = [];
const qualityScore = report => Object.values(report.dimensions).reduce((sum, value) => sum + value.score, 0) / Math.max(1, Object.keys(report.dimensions).length);
let currentReport = before;
for (const patch of patches) {
  const result = applySectionPatch(note, patch);
  if (!result.applied) {
    patchResults.push({ targetHeading: patch.targetHeading, applied: false, accepted: false, error: result.error ?? null });
    continue;
  }
  const candidateReport = auditHumanNote(result.note, sourceMap);
  const accepted = qualityScore(candidateReport) >= qualityScore(currentReport);
  patchResults.push({ targetHeading: patch.targetHeading, applied: true, accepted, error: accepted ? null : 'patch worsened deterministic quality score' });
  if (accepted) { note = result.note; currentReport = candidateReport; }
}
const after = currentReport;
const outputPath = path.join(path.dirname(absolute(notePath)), `${path.basename(notePath, path.extname(notePath))}.quality-candidate.md`);
fs.writeFileSync(outputPath, note, 'utf8');
const report = { status: after.status, rounds: patches.length, before, after, patchResults, output: outputPath, productionVaultModified: false };
const reportPath = path.join(path.dirname(outputPath), 'note-quality-report.json');
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ...report, reportPath }, null, 2));
