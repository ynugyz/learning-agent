import type { LessonModel } from '../contracts/lesson-model';
import type { SourceMap } from '../contracts/source-map';
import type { HumanNoteQualityReport, QualityDimension, QualityIssue } from './types';

const machineLeak = /(?:sourceUnitRefs?|lessonItemRefs?|alignmentId|resolutionState|contractVersion|knowledgeId|contentIdentity|confidence\s*[:=])/u;
// Direct classroom narration is noise in a human note.  A boundary sentence
// such as “转写中不稳定” is useful epistemic control and should not fail the
// readability check by itself.
const classroomNarration = /(?:课堂上|老师说|讲者说|老师提到)/u;
const sourceMarker = /L\d+(?:-L\d+)?/gu;

function dimension(score: number, rationale: string): QualityDimension {
  return { score: Math.max(0, Math.min(1, score)), confidence: 1, provider: 'deterministic', rationale };
}

function issue(code: string, severity: QualityIssue['severity'], message: string, confidence = 1, evidenceRefs?: readonly string[]): QualityIssue {
  return { code, severity, message, confidence, ...(evidenceRefs ? { evidenceRefs } : {}) };
}

export function auditHumanNote(note: string, sourceMap?: Pick<SourceMap, 'units'>, lessonModel?: Pick<LessonModel, 'items'>, baseline?: string): HumanNoteQualityReport {
  const markers = [...new Set(note.match(sourceMarker) ?? [])];
  const issues: QualityIssue[] = [];
  const dimensions: Record<string, QualityDimension> = {};
  const sourceUnits = sourceMap?.units ?? [];
  const lessonItems = lessonModel?.items ?? [];
  const headings = note.split(/\r?\n/u).filter(line => /^#{1,3}\s+/u.test(line));
  const bulletCount = note.split(/\r?\n/u).filter(line => /^\s*[-*+]\s+/u.test(line)).length;
  const paragraphCount = note.split(/\n\s*\n/u).filter(value => value.trim() && !/^\s*#/u.test(value) && !/^\s*[-*+]\s+/u.test(value)).length;
  // Human notes do not need line markers in every paragraph.  A stable source
  // file, a Sources section, or source_lessons frontmatter is a valid human
  // readable trace; exact line-level provenance remains in the machine layer.
  const hasReadableSourceTrace = markers.length > 0 || /(?:source_file\s*:|source_lessons\s*:|^##\s+来源\s*$|原始转写|来源[:：])/imu.test(note);
  const sourceCoverage = sourceUnits.length
    ? markers.length > 0
      ? Math.min(1, markers.length / Math.max(1, Math.min(sourceUnits.length, lessonItems.length || sourceUnits.length)))
      : hasReadableSourceTrace ? 0.7 : 0
    : 1;
  dimensions.coverage = dimension(sourceCoverage, markers.length ? `${markers.length} source markers found` : hasReadableSourceTrace ? 'Human-readable source trace found; exact provenance remains in the machine layer.' : 'No readable source trace found');
  if (sourceUnits.length && !hasReadableSourceTrace) issues.push(issue('MISSING_SOURCE_TRACE', 'high', 'Human Note has no readable source trace.'));
  const hasKnowledgeSections = headings.length >= 2 && (bulletCount + paragraphCount) > 3;
  dimensions.structure = dimension(hasKnowledgeSections ? 1 : 0.45, `${headings.length} headings, ${bulletCount} bullets, ${paragraphCount} paragraphs`);
  if (!hasKnowledgeSections) issues.push(issue('THIN_NOTE_STRUCTURE', 'medium', 'Note has too little visible structure for sustained review.'));
  const hasBoundary = /(?:边界|限制|适用|注意|待确认|不确定|课堂语境)/u.test(note);
  dimensions.boundaries = dimension(hasBoundary ? 1 : 0.45, hasBoundary ? 'Boundary or uncertainty language is present.' : 'No explicit boundary or uncertainty marker found.');
  if (!hasBoundary && sourceUnits.some(unit => unit.epistemicStatus === 'uncertain' || unit.epistemicStatus === 'opinion' || unit.epistemicStatus === 'conflict')) issues.push(issue('MISSING_EPISTEMIC_BOUNDARY', 'high', 'Source contains uncertainty/opinion/conflict but note has no boundary marker.'));
  const machineHits = note.match(machineLeak) ?? [];
  dimensions.humanReadability = dimension(machineHits.length === 0 && !classroomNarration.test(note) ? 1 : 0.35, machineHits.length ? 'Machine metadata leaked into the note.' : classroomNarration.test(note) ? 'Classroom narration remains in the note.' : 'No machine metadata or classroom narration detected.');
  if (machineHits.length) issues.push(issue('MACHINE_METADATA_LEAKAGE', 'high', `Machine-facing token leaked: ${machineHits[0]}`));
  if (classroomNarration.test(note)) issues.push(issue('CLASSROOM_NARRATION', 'medium', 'Rewrite classroom attribution as declarative knowledge and keep only necessary boundary context.'));
  const baselineParts = baseline ? baseline.split(/\r?\n/u) : [];
  // Existing notes may contain a deliberately marked raw/transcript tail. A
  // compiler is allowed to fold its useful material into structured blocks;
  // requiring every original line would reward transcript dumping. Compare
  // durable anchors instead: headings, wikilinks, embeds and source identity.
  const duplicateTailIndex = baselineParts.findIndex(line => /^##\s+(?:原有课堂速记|课堂速记|转写摘录)\s*$/u.test(line.trim()));
  const comparableBaseline = (duplicateTailIndex >= 0 ? baselineParts.slice(0, duplicateTailIndex) : baselineParts).join('\n');
  const baselineHeadings = [...comparableBaseline.matchAll(/^#{1,3}\s+(.+)$/gmu)].map(match => (match[1] ?? '').trim()).filter(value => value.length >= 2);
  const linkTarget = (value: string): string => {
    const [target] = value.replace(/^!?\[\[|\]\]$/gu, '').split('|', 1);
    return (target ?? '').trim();
  };
  const baselineLinks = [...new Set((comparableBaseline.match(/!?\[\[[^\]]+\]\]/gu) ?? []).map(linkTarget))];
  const noteLinks = new Set((note.match(/!?\[\[[^\]]+\]\]/gu) ?? []).map(linkTarget));
  const preservedHeadings = baselineHeadings.filter(value => note.includes(value)).length;
  const preservedLinks = baselineLinks.filter(value => noteLinks.has(value)).length;
  const headingCoverage = baselineHeadings.length ? preservedHeadings / baselineHeadings.length : 1;
  const linkCoverage = baselineLinks.length ? preservedLinks / baselineLinks.length : 1;
  const identityPreserved = !baseline || !/source_file\s*:/u.test(baseline) || /source_file\s*:/u.test(note) || /原始转写|来源[:：]/u.test(note);
  // Reorganization intentionally changes section names (for example, a
  // transcript-era “核心结论” block may become several concept sections).
  // For larger notes, durable links and source identity carry more weight than
  // exact heading reuse.
  const headingThreshold = baselineHeadings.length <= 5 ? 1 : 0.3;
  const baselinePreserved = !baseline || (identityPreserved && headingCoverage >= headingThreshold && linkCoverage >= 0.5);
  const preservationScore = !baseline ? 1 : Math.min(1, (headingCoverage * 0.45) + (linkCoverage * 0.35) + (identityPreserved ? 0.2 : 0));
  dimensions.preservation = dimension(preservationScore, baseline ? `Durable anchors preserved: headings=${preservedHeadings}/${baselineHeadings.length}, links=${preservedLinks}/${baselineLinks.length}` : 'No baseline provided.');
  if (!baselinePreserved) issues.push(issue('BASELINE_CONTENT_DROPPED', 'high', 'Durable existing-note anchors were not preserved.'));
  const scoreValues = Object.values(dimensions).map(value => value.score);
  const score = scoreValues.reduce((sum, value) => sum + value, 0) / Math.max(1, scoreValues.length);
  const status = issues.some(item => item.severity === 'high') ? 'FAIL' : issues.length ? 'REVIEW' : score >= 0.75 ? 'PASS' : 'REVIEW';
  return {
    contractVersion: 'human-note-quality/0.1',
    provider: 'deterministic',
    status,
    dimensions,
    issues,
    patchTargets: [...new Set(issues.map(item => item.code))],
    baselinePreserved,
    sourceMarkers: markers,
    notes: [`deterministicAverageScore=${score.toFixed(3)}`, 'This report is a bounded preflight; it does not claim factual correctness.'],
  };
}
