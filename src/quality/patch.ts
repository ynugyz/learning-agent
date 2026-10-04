import type { HumanNoteQualityReport } from './types';

export interface SectionPatch {
  readonly targetHeading: string;
  readonly replacement: string;
  readonly rationale?: string;
}

export interface PatchResult {
  readonly applied: boolean;
  readonly note: string;
  readonly error?: string;
}

const unsafePatch = /(?:sourceUnitRefs?|lessonItemRefs?|alignmentId|resolutionState|contractVersion|knowledgeId|contentIdentity)/u;

export function applySectionPatch(note: string, patch: SectionPatch): PatchResult {
  if (!patch.targetHeading.trim() || !patch.replacement.trim()) return { applied: false, note, error: 'empty patch target or replacement' };
  if (unsafePatch.test(patch.replacement)) return { applied: false, note, error: 'machine metadata is not allowed in a Human Note patch' };
  const lines = note.split(/\r?\n/u);
  const target = patch.targetHeading.trim();
  const headingIndexes = lines.map((line, index) => ({ line, index })).filter(item => item.line.trim() === target || item.line.trim() === `## ${target}` || item.line.trim() === `### ${target}`);
  if (headingIndexes.length !== 1) return { applied: false, note, error: headingIndexes.length === 0 ? `target heading not found: ${target}` : `target heading is ambiguous: ${target}` };
  const match = headingIndexes[0];
  if (!match) return { applied: false, note, error: 'target heading not found' };
  const start = match.index;
  const level = (lines[start]?.match(/^#+/u)?.[0].length ?? 0);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const candidateMatch = lines[index]?.match(/^(#+)\s/u);
    const candidateLevel = candidateMatch?.[1]?.length;
    if (candidateLevel !== undefined && candidateLevel <= level) { end = index; break; }
  }
  const replacementLines = patch.replacement.trim().split(/\r?\n/u);
  const updated = [...lines.slice(0, start + 1), '', ...replacementLines, '', ...lines.slice(end)].join('\n').replace(/\n{3,}/gu, '\n\n');
  return { applied: true, note: updated.endsWith('\n') ? updated : `${updated}\n` };
}

export async function boundedLocalRepair(note: string, initial: HumanNoteQualityReport, provider: (report: HumanNoteQualityReport, currentNote: string) => Promise<SectionPatch | null>, maxRounds = 2, evaluate: (currentNote: string) => Promise<HumanNoteQualityReport> = async () => initial): Promise<{ readonly note: string; readonly rounds: number; readonly reports: readonly HumanNoteQualityReport[]; readonly deferred: boolean }> {
  let current = note;
  const reports: HumanNoteQualityReport[] = [initial];
  const score = (report: HumanNoteQualityReport): number => Object.values(report.dimensions).reduce((sum, value) => sum + value.score, 0) / Math.max(1, Object.keys(report.dimensions).length);
  for (let round = 0; round < maxRounds; round += 1) {
    const patch = await provider(reports.at(-1)!, current);
    if (!patch) return { note: current, rounds: round, reports, deferred: reports.at(-1)!.status !== 'PASS' };
    const result = applySectionPatch(current, patch);
    if (!result.applied) return { note: current, rounds: round, reports, deferred: true };
    const nextReport = await evaluate(result.note);
    if (score(nextReport) < score(reports.at(-1)!)) return { note: current, rounds: round, reports, deferred: true };
    current = result.note;
    reports.push(nextReport);
    if (nextReport.status === 'PASS') return { note: current, rounds: round + 1, reports, deferred: false };
  }
  return { note: current, rounds: maxRounds, reports, deferred: true };
}
