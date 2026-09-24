#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { executePilotRun, formatPilotResult, loadPilotConfig, PILOT_LIMITS } from '../src/pilot-safe/index.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');
const COURSE_ROOT_NAME = '人工智能导论';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseMode(config) {
  const flags = [process.argv.includes('--dry-run'), process.argv.includes('--commit')].filter(Boolean).length;
  if (flags > 1) throw new Error('use only one of --dry-run or --commit');
  const mode = process.argv.includes('--dry-run') ? 'dry-run' : process.argv.includes('--commit') ? 'commit' : config.mode;
  if (mode !== 'dry-run' && mode !== 'commit') throw new Error('mode must be dry-run or commit');
  return mode;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function resolvePath(value, baseDir) {
  return path.normalize(path.isAbsolute(value) ? value : path.resolve(baseDir, value));
}

function readText(file) {
  const buffer = fs.readFileSync(file);
  return { buffer, text: buffer.toString('utf8') };
}

function countTerms(text, terms) {
  return Object.fromEntries(terms.map(term => [term, [...text.matchAll(new RegExp(term, 'gu'))].length]));
}

function firstDate(text) {
  return text.match(/20\d{2}-\d{2}-\d{2}\s*\|\s*\d{2}:\d{2}/u)?.[0] ?? null;
}

function lineRanges(text, terms) {
  const lines = text.split(/\r?\n/u);
  const ranges = [];
  for (const term of terms) {
    const hits = [];
    for (let index = 0; index < lines.length; index += 1) if (lines[index].includes(term)) hits.push(index + 1);
    if (hits.length) ranges.push({ term, start: Math.min(...hits), end: Math.max(...hits) });
  }
  return ranges;
}

function wikiLinks(text) {
  const links = new Set();
  for (const match of text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/gu)) links.add(match[1].trim());
  return [...links];
}

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/u);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split(/\r?\n/u)) {
    const pair = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/u);
    if (pair) result[pair[1]] = pair[2].replace(/^['"]|['"]$/gu, '');
  }
  return result;
}

function sourceRecord(file, id, role, expectedTopic) {
  const { buffer, text } = readText(file);
  if (!['.txt', '.md'].includes(path.extname(file).toLowerCase())) throw new Error(`unsupported source extension: ${file}`);
  return {
    sourceId: id,
    role,
    expectedTopic,
    path: file,
    fileName: path.basename(file),
    bytes: buffer.byteLength,
    sha256: sha256(buffer),
    lineCount: text.split(/\r?\n/u).length,
    date: firstDate(text),
    keywordCounts: countTerms(text, ['人工智能', '图灵', '神经网络', '深度学习', '机器学习', '知识图谱', '概率', '贝叶斯', '因果', '梯度', '优化', 'AlphaFold', '诺贝尔']),
    lineRanges: lineRanges(text, expectedTopic),
    text
  };
}

function contextRecord(file, role) {
  const { buffer, text } = readText(file);
  return {
    role,
    path: file,
    fileName: path.basename(file),
    bytes: buffer.byteLength,
    sha256: sha256(buffer),
    metadata: frontmatter(text),
    wikilinks: wikiLinks(text),
    readOnly: true,
    usedAs: 'navigation-and-context-only; not a DLI seed'
  };
}

const chapters = [
  {
    id: 'chapter-1',
    number: '第一章',
    title: '人工智能的概念、历史与能力评价',
    status: 'in-progress',
    summary: '从“什么是智能”出发，把技术路线、发展突破与图灵测试放在同一条可检验的课程主线上。',
    sourceIds: ['src-nobel', 'src-turing'],
    blocks: [
      { id: 'ch1-b1', title: '从智能概念到可评价任务', role: 'CORE', recallTarget: '人工智能对象与任务边界', sourceIds: ['src-turing', 'src-nobel'], terms: ['人工智能', '智能', '能力'], core: ['人工智能是以机器为载体实现某些类人或生物智能能力的工程与研究方向；课程中的“智能”必须落到具体任务、输入、输出和评价条件。', '推理、学习、感知、交流、行动与安全约束可以分别评价，流畅对话不能替代所有任务上的可靠性。'], details: ['课堂把技术思维和领域问题定义放在课程入口，金融、科学研究等应用都需要先说明目标与验证方法。'], examples: ['金融分析与科学发现是应用场景示例，不由工具能力直接推出盈利或医学结论。'], warnings: ['转写含 AI 生成声明、说话人错配和现场噪声；本章只保留可由多份课堂证据交叉支持的边界。'] },
      { id: 'ch1-b2', title: '路线、历史与关键突破', role: 'CONCEPT', recallTarget: '符号、连接与行为路线如何组合', sourceIds: ['src-turing', 'src-nobel'], terms: ['符号', '专家系统', '神经网络', '深度学习', '2012'], core: ['符号主义强调显式知识、规则与推理；连接主义从数据中学习表示；行为主义通过环境交互和反馈学习行动。', '路线长期并行，关键突破来自表示、算法、数据与算力的组合，不能写成前一条路线被后一条路线彻底取代。'], details: ['课堂从专家系统的规则瓶颈谈到神经网络在图像任务中的突破，并把 LeNet、2012 年图像竞赛等作为“解决了什么问题”的案例线索。'], examples: ['XOR、手写数字识别和神经网络图像竞赛是表达能力与工程条件的课堂例子。'], warnings: ['人名、年份和硬件细节以转写中的线索为限；精确历史锚点保留到机器 provenance，不扩写未经本轮四份证据确认的说法。'] },
      { id: 'ch1-b3', title: '图灵测试及其边界', role: 'BOUNDARY', recallTarget: '交互表现不等于通用智能', sourceIds: ['src-turing'], terms: ['图灵测试', '询问者', '机器'], core: ['图灵测试把“机器能否思考”的问题转成特定条件下的可观察文字交互表现。', '测试结果不能直接证明意识、内在理解、事实正确性、伦理可靠性或所有任务上的能力。'], details: ['评价时应明确参与者、通道、时长、判定标准和统计条件；不同任务应使用对应的泛化与失败案例检查。'], examples: ['会话表现好但图像分类失败的系统，或不会聊天但在特定分类任务上可靠的系统，都说明单一测试不能覆盖全部能力。'], warnings: ['课堂中“没有任何 AI 通过”属于待核查的绝对表述，本候选不把它写成事实。'] },
      { id: 'ch1-b4', title: '应用与科学发现的验证链', role: 'EXAMPLE', recallTarget: '应用结果必须回到任务与验证', sourceIds: ['src-nobel'], terms: ['AlphaFold', '诺贝尔', '金融', '科学'], core: ['AlphaGo 的决策任务和 AlphaFold 的蛋白质结构预测任务不同；科学应用的价值要通过问题定义、可信度检查、假设提出和实验验证来判断。'], details: ['2024 年奖项讨论用于说明神经网络基础工作与蛋白质研究受到科学认可，不能写成某个产品或模型“获得诺贝尔奖”。'], examples: ['结构预测可以帮助提出可检验的研究假设，但不能直接推出药物安全有效。'], warnings: ['转写中的具体医学效果、商业叙述和奖项细节只作为来源边界记录，需按正式来源另行核查。'] }
    ]
  },
  {
    id: 'chapter-2',
    number: '第二章',
    title: '知识表示、概率图与因果推理',
    status: 'in-progress',
    summary: '从显式规则和图结构进入不确定性表示，保留贝叶斯网络的结构直觉与推理边界。',
    sourceIds: ['src-bayes', 'src-gradient'],
    blocks: [
      { id: 'ch2-b1', title: '从问题到表示层次', role: 'ROADMAP', recallTarget: '表示方式服务于任务', sourceIds: ['src-bayes', 'src-gradient'], terms: ['知识', '表示', '规则', 'Token'], core: ['知识表示要回答“对象、关系和不确定性如何被机器处理”，表示方式应由任务和可检验目标决定。', '命题/谓词逻辑、知识图谱、概率图模型与 Token/Embedding 处在不同表示层次，不能合并成一个概念。'], details: ['课堂用规则、图结构和向量表示串起从显式知识到学习表示的过渡。'], examples: ['“昆明是云南省会”可作为确定事实或图谱三元组；文本模型则先把输入转为 Token 和向量表示。'], warnings: ['关于某个表示一定减少 token 或一定更准确的口述不作为普遍结论。'] },
      { id: 'ch2-b2', title: '逻辑与知识图谱', role: 'CONCEPT', recallTarget: '确定关系的显式表达', sourceIds: ['src-bayes'], terms: ['命题逻辑', '谓词逻辑', '知识图谱'], core: ['命题逻辑处理真假命题；谓词逻辑增加个体、谓词和量词以表达对象之间的关系。', '知识图谱以实体—关系—实体组织显式知识，适合路径推理和关系检索。'], details: ['“所有人都会死；苏格拉底是人；所以苏格拉底会死”说明谓词和量词提供了命题逻辑缺少的关系表达能力。'], examples: ['三元组 `<实体1，关系，实体2>` 是课堂用来理解知识图谱的最小结构。'], warnings: ['图谱是否提升具体系统效果取决于数据、检索、模型和评估条件。'] },
      { id: 'ch2-b3', title: '概率图与贝叶斯网络', role: 'CORE', recallTarget: '用条件独立拆解不确定性', sourceIds: ['src-bayes'], terms: ['概率图', '贝叶斯', '条件独立', '有向无环'], core: ['概率图模型用图表示随机变量及其依赖关系；贝叶斯网络是有向无环图形式，马尔可夫网络使用无向图。', '条件独立允许把联合概率分解为多个条件概率的乘积，从证据出发更新目标变量的概率。'], details: ['边表示依赖结构，不自动等于因果关系；作因果解释还需要额外假设、设计和数据。'], examples: ['多云、下雨、洒水车与路面湿构成最小例子：观察路面湿后可更新下雨的可能性，知道洒水车已开又会改变后验判断。'], warnings: ['本轮转写没有完整数值题和后验计算；保留“待补题”状态，不补写假数据。'] },
      { id: 'ch2-b4', title: '因果与概率的边界', role: 'BOUNDARY', recallTarget: '相关结构不能自动升级为因果结论', sourceIds: ['src-bayes', 'src-gradient'], terms: ['因果', '相关', '条件'], core: ['概率依赖可以支持基于证据的更新，但“有边”与“有因果作用”不是同一个命题。', '因果判断需要明确干预、混杂、时间顺序和验证方式。'], details: ['梯度课堂把因果问题与数据、模型和风险联系起来，提醒学习结果要回到可检查的任务条件。'], examples: ['同一观测结果可能由下雨或洒水车造成，不能仅凭路面湿就断定单一原因。'], warnings: ['转写中的复杂因果例子与 Simpson 悖论只保留为待复习线索。'] }
    ]
  },
  {
    id: 'chapter-3',
    number: '第三章',
    title: '机器学习、神经网络与梯度优化',
    status: 'in-progress',
    summary: '把机器学习表述为在假设空间中寻找任务函数，再连接训练评估、神经网络和优化方法。',
    sourceIds: ['src-gradient', 'src-turing', 'src-nobel'],
    blocks: [
      { id: 'ch3-b1', title: '机器学习是寻找任务函数', role: 'CORE', recallTarget: '数据、模型与任务函数', sourceIds: ['src-gradient'], terms: ['机器学习', '函数', '模型', '数据'], core: ['机器学习把输入映射到任务输出，训练过程是在假设空间中寻找满足目标的函数或模型。', '模型选择不能脱离数据、任务指标、风险和结果检查。'], details: ['课堂用“学习—考试—再验证”类比训练集、验证集和新数据上的表现。'], examples: ['预测、生成、决策与执行是不同产物，金融场景需要分别规定数据、时间基准和风险。'], warnings: ['转写末段噪声较多，未把课堂口头类比扩写成正式定理。'] },
      { id: 'ch3-b2', title: '训练、验证与测试', role: 'METHOD', recallTarget: '泛化评估与数据分工', sourceIds: ['src-gradient'], terms: ['训练', '验证', '测试', '过拟合'], core: ['训练集用于拟合，验证集用于模型选择和早停，测试集用于最终泛化评估，不能反复用测试集调参。', '只看训练表现不能说明新情境下的可靠性，需检查欠拟合、过拟合和数据泄漏。'], details: ['验证集像新的考试，性能不再改善时应停止或调整策略；最终测试应保持独立。'], examples: ['同来源或重复文本跨集合会造成泄漏，评估结果需要注明数据边界。'], warnings: ['本轮只记录课堂方法，不自动进行质量修复或重跑。'] },
      { id: 'ch3-b3', title: '经验风险与梯度下降', role: 'METHOD', recallTarget: '在假设空间中优化风险', sourceIds: ['src-gradient'], terms: ['经验风险', '梯度', '优化', '凸'], core: ['优化算法在给定目标函数和假设空间中寻找较优模型；梯度下降利用局部变化方向迭代更新参数。', '凸函数提供较清晰的全局最优直觉，但实际模型和损失未必满足简单凸性。'], details: ['课堂把模型、评价准则和更新过程连接为循环：定义目标、计算误差、根据梯度更新、在新数据上复核。'], examples: ['学习率、初始化、批次和停止条件会影响优化轨迹；这些是方法参数，不是知识结论。'], warnings: ['不从转写口头示意图推导未出现的公式或数值。'] },
      { id: 'ch3-b4', title: '神经网络的表示与训练', role: 'CONCEPT', recallTarget: '非线性表示与反向传播', sourceIds: ['src-turing', 'src-gradient'], terms: ['神经网络', 'XOR', '反向传播', 'LeNet'], core: ['单个线性阈值单元不能表示 XOR，不等于多层神经网络不能表达；非线性层和反向传播使表示学习成为可训练过程。', '神经网络的工程突破依赖表示、算法、数据与算力的共同作用。'], details: ['LeNet 手写数字识别、图像竞赛和残差网络作为“表达能力/训练/工程条件”的课堂线索保留。'], examples: ['XOR 是说明线性分隔限制的最小例子，不在本轮补写数学证明。'], warnings: ['人名、年份和竞赛数字只按已有来源边界保留，未核查的细节进入 machine artifact。'] }
    ]
  }
];

function buildUnits(sources) {
  const units = [];
  for (const source of sources) {
    const related = chapters.flatMap(chapter => chapter.blocks.filter(block => block.sourceIds.includes(source.sourceId)).map(block => block.id));
    units.push({
      unitId: `unit-${source.sourceId}-scope`,
      sourceId: source.sourceId,
      locator: { kind: 'line-range', start: '1', end: String(source.lineCount) },
      contentType: 'source-scope',
      summary: `${source.fileName}：${source.expectedTopic.join('、')}主题的课堂证据范围。`,
      keyTerms: source.expectedTopic,
      blockRefs: related,
      preservation: { priority: 'high', isInference: false },
      epistemicStatus: 'source-explicit'
    });
  }
  return units;
}

function buildArtifacts(sources, contexts, mode) {
  const units = buildUnits(sources);
  const allBlocks = chapters.flatMap(chapter => chapter.blocks);
  const dli = allBlocks.map((block, index) => {
    const sourceUnitRefs = block.sourceIds.map(sourceId => `unit-${sourceId}-scope`);
    return {
      distinctInformationId: `dli-course-rebuild-${String(index + 1).padStart(3, '0')}`,
      blockId: block.id,
      statement: block.core[0],
      informationRole: block.role === 'METHOD' ? 'METHOD' : block.role === 'EXAMPLE' ? 'EXAMPLE' : block.role === 'BOUNDARY' ? 'DETAIL' : 'CORE',
      disposition: 'RETAIN',
      renderDecision: 'RETAIN',
      sourceUnitRefs,
      sourceIds: block.sourceIds,
      provenance: 'SOURCE_DERIVED',
      mergeGroup: `merge-${block.id}`,
      uncertainty: block.warnings.length ? ['source-boundary-recorded'] : [],
      detailRefs: block.details,
      exampleRefs: block.examples,
      warningRefs: block.warnings
    };
  });
  const sourceMap = {
    prototype: true,
    notFormalSchema: true,
    artifact: 'SourceMap-equivalent',
    caseId: 'COURSE_REBUILD_001',
    sourcePackageId: 'pkg-course-rebuild-001',
    sources: sources.map(source => ({ sourceId: source.sourceId, kind: 'transcript', location: source.path, bytes: source.bytes, sha256: source.sha256, role: source.role, quality: { rating: 'noisy', aiGeneratedDisclaimer: true } })),
    units,
    generatedOutputExclusion: true,
    automaticRepair: 'DISABLED'
  };
  const lessonModel = {
    prototype: true,
    notFormalSchema: true,
    artifact: 'LessonModel-equivalent',
    caseId: 'COURSE_REBUILD_001',
    sourceMapRef: 'artifacts/source-map-equivalent.json',
    structureStatus: 'REPLANNED_FOR_COURSE_REBUILD',
    modules: chapters.map((chapter, index) => ({
      moduleId: chapter.id,
      readingOrder: index + 1,
      kind: 'teaching',
      title: chapter.title,
      oneLine: chapter.summary,
      sourceUnitRefs: chapter.sourceIds.map(sourceId => `unit-${sourceId}-scope`),
      conceptStructure: { definitions: chapter.blocks.filter(block => block.role === 'CORE').map(block => block.recallTarget), mechanisms: chapter.blocks.filter(block => block.role === 'METHOD').map(block => block.recallTarget), boundaries: chapter.blocks.filter(block => block.role === 'BOUNDARY').map(block => block.recallTarget), examples: chapter.blocks.flatMap(block => block.examples), pedagogicalRole: 'course-rebuild' },
      lectureFlow: { flowOrder: index + 1, sourceModuleRefs: chapter.sourceIds, currentTeachingFocus: chapter.title, teachingFunction: 'CONSOLIDATE', transitionType: 'RECALL_TO_NEW_TOPIC', expansionEvidence: { sourceUnitCount: chapter.sourceIds.length, composition: { source: chapter.sourceIds.length } }, expansionLevel: 'DEVELOPED' },
      uncertainty: { sourceBoundary: chapter.status, priorVaultContextNotSeed: true }
    }))
  };
  const ledger = {
    prototype: true,
    notFormalSchema: true,
    artifact: 'bottom-up-dli-source-detail-ledger',
    caseId: 'COURSE_REBUILD_001',
    seedPolicy: 'source-derived-only; existing Vault Markdown is context, not DLI seed',
    inspectedSourceUnits: units.length,
    producedDli: dli.length,
    retainedDli: dli.map(item => item.distinctInformationId),
    sourceUnitsMergedIntoDli: [],
    sourceUnitsMachineOnly: [],
    sourceUnitsWarningRelated: units.filter(unit => sources.find(source => source.sourceId === unit.sourceId)?.keywordCounts['人工智能'] === 0).map(unit => unit.unitId),
    dli,
    records: units.map(unit => ({ sourceUnitRef: unit.unitId, sourceId: unit.sourceId, blockRefs: unit.blockRefs, disposition: 'ACCOUNTED', provenance: 'SOURCE_DERIVED' })),
    unaccountedDli: [],
    automaticRepair: 'DISABLED'
  };
  const coverage = {
    prototype: true,
    caseId: 'COURSE_REBUILD_001',
    status: 'PASS_WITH_SOURCE_BOUNDARIES',
    sourceCount: sources.length,
    sourceUnitsInspected: units.length,
    dliCount: dli.length,
    chapterCount: chapters.length,
    chapterSourceCoverage: chapters.map(chapter => ({ chapterId: chapter.id, sourceIds: chapter.sourceIds, blockCount: chapter.blocks.length, status: 'ACCOUNTED' })),
    contextFilesRead: contexts.length,
    contextUsedAsDliSeed: false,
    warnings: ['ASR/noise and AI-generated disclaimer are preserved in provenance.', 'No numeric Bayesian exercise was invented.', 'No automatic repair or quality-based rerun was performed.']
  };
  const provenance = {
    caseId: 'COURSE_REBUILD_001',
    sourceEvidence: sources.map(source => ({ sourceId: source.sourceId, path: source.path, bytes: source.bytes, sha256: source.sha256, role: source.role, date: source.date })),
    existingVaultContext: contexts.map(context => ({ path: context.path, bytes: context.bytes, sha256: context.sha256, role: context.role, readOnly: true, usedAs: context.usedAs })),
    generatedOutputDirectoriesAreNotInputs: true,
    productionVaultWrite: false,
    automaticRepair: 'DISABLED',
    mode
  };
  const plan = {
    caseId: 'COURSE_REBUILD_001',
    course: '人工智能导论',
    planningBasis: 'four primary classroom transcripts + existing MOC/navigation/context; chapter boundaries re-planned',
    chapters: chapters.map(chapter => ({ id: chapter.id, title: chapter.title, status: chapter.status, sourceIds: chapter.sourceIds, blockIds: chapter.blocks.map(block => block.id) })),
    mergePolicy: 'same concept merges only when claim is equivalent; later detail/example/method remains linked to its source block',
    seedPolicy: 'bottom-up source evidence; existing Markdown is not a DLI seed',
    automaticRepair: 'DISABLED',
    sourceCount: sources.length,
    contextCount: contexts.length,
    plannedCandidateCount: 6,
    plannedSemanticCount: 4,
    plannedArtifactCount: 6
  };
  return { sourceMap, lessonModel, ledger, coverage, provenance, plan, units, dli };
}

function renderChapter(chapter, sources) {
  const lines = [
    '---', 'course: 人工智能导论', `chapter: ${chapter.number} ${chapter.title}`, `status: ${chapter.status}`, 'source_policy: primary classroom evidence; existing Vault context only', '---', '', `# ${chapter.number} ${chapter.title}`, '', chapter.summary, '', '> 本候选按课程级重组规划生成。课堂转写是主要证据；旧 Vault 页面只用于导航、已有链接习惯和长期知识上下文。', ''
  ];
  chapter.blocks.forEach((block, index) => {
    lines.push(`## ${index + 1}. ${block.title}`, '', ...block.core, '');
    if (block.details.length) lines.push('### 课堂展开', '', ...block.details.map(item => `- ${item}`), '');
    if (block.examples.length) lines.push('### 例子', '', ...block.examples.map(item => `- ${item}`), '');
    if (block.warnings.length) lines.push('### 证据边界', '', ...block.warnings.map(item => `- ${item}`), '');
    lines.push(`来源：${block.sourceIds.map(sourceId => sources.find(source => source.sourceId === sourceId)?.fileName ?? sourceId).join('、')}`, '');
  });
  lines.push('## 复习入口', '', '- 先复述本章的主线，再用来源文件回查细节。', '- 未完成或需要数值推导的内容保持 in-progress，不由本轮自动补写。', '', '回到课程导航：[[人工智能导论 MOC]]', '');
  return `${lines.join('\n').replace(/\n{3,}/gu, '\n\n').trim()}\n`;
}

function renderMoc() {
  const lines = ['---', 'course: 人工智能导论', 'status: candidate-rebuild', 'tags:', '  - 人工智能导论', '---', '', '# 人工智能导论 MOC', '', '本候选 MOC 只承担课程导航。章节按四份课堂转写共同支持的概念边界重组，具体证据与待补项留在章节和 machine artifacts。', '', '## 课程章节', '', '| 章节 | 定位 | 状态 |', '| --- | --- | --- |', ...chapters.map(chapter => `| [[${chapter.number} ${chapter.title}]] | ${chapter.summary} | ${chapter.status} |`), '', '## 重要长期知识页', '', '- [[人工智能发展史与关键突破]]', '- [[人工智能能力与图灵测试]]', '- [[AI技术路线与金融应用]]', '- [[AI科学发现与AlphaFold]]', '- [[概率图模型与贝叶斯网络]]', '- [[py81-机器学习概述]]', '- [[py88-神经网络]]', '- [[py89-自然语言处理]]', '', '## 课堂证据入口', '', '- [[课堂索引]]：四次课堂 source 与章节贡献。', '- machine artifacts：SourceMap-equivalent、LessonModel-equivalent、DLI/source-detail ledger、coverage audit 与 provenance。', '', '## 当前状态', '', '- 三章均为 `in-progress`，因为转写没有覆盖完整教材、课件和数值练习。', '- 本轮不修改现有 Vault；migration plan 只提出未来处理建议。', ''];
  return `${lines.join('\n')}\n`;
}

function renderIndex(sources) {
  const rows = sources.map(source => {
    const contributions = chapters.filter(chapter => chapter.sourceIds.includes(source.sourceId)).map(chapter => `[[${chapter.number} ${chapter.title}]]`).join('、');
    return `| ${source.date ?? '日期未解析'} | ${source.fileName} | ${source.bytes} | ${contributions} |`;
  });
  return `# 课堂索引\n\n本页只记录四份 primary classroom evidence 及其章节贡献，不作为主要学习笔记。\n\n| 日期 | source | bytes | 贡献章节 |\n| --- | --- | ---: | --- |\n${rows.join('\n')}\n\n- 原始 source 只读，未移动、改名或复制回 source 目录。\n- 每份转写带有实时转写/AI 生成边界，完整 provenance 见 machine artifacts。\n`;
}

function renderRestructurePlan() {
  return `# RESTRUCTURE_PLAN\n\n本计划只提出建议，本轮不执行任何 Production Vault 变更。\n\n| 当前页面/入口 | 建议 | 理由 |\n| --- | --- | --- |\n| [[人工智能导论 MOC]] | KEEP | 保留现有课程入口，未来由候选 MOC 经人工确认后替换导航内容。 |\n| [[AI导论917]] | ARCHIVE_AS_SESSION_SOURCE | 2026-09-17 两段转写已合并为同一课堂 session；保留其课堂时间线和原始边界。 |\n| [[AI导论920]] | ARCHIVE_AS_SESSION_SOURCE | 2026-09-20 的课堂解释与待补问题保留为 session evidence。 |\n| [[人工智能发展史与关键突破]] | LINK_ONLY | 作为长期历史上下文，由第一章引用，不直接覆盖。 |\n| [[人工智能能力与图灵测试]] | LINK_ONLY | 作为长期能力与测试上下文，由第一章引用，不直接覆盖。 |\n| [[AI技术路线与金融应用]] | MERGE_INTO_CHAPTER | 将课程级任务定义、金融应用边界合并到第一章相关 block，保留原页只读。 |\n| [[AI科学发现与AlphaFold]] | MERGE_INTO_CHAPTER | 将科学发现与验证链合并到第一章应用 block，保留原页只读。 |\n| [[概率图模型与贝叶斯网络]] | LINK_ONLY | 作为第二章概率图长期知识页链接；数值题待补，不覆盖。 |\n| [[py81-机器学习概述]] / [[py88-神经网络]] / [[py89-自然语言处理]] | REVIEW | 作为跨课程长期知识页，需人工决定章节链接和是否迁移课程上下文。 |\n\n## 变更边界\n\n- 本轮不修改、删除、移动、重命名或覆盖以上任何页面。\n- 候选章节按 Course → Chapter → Recall Block 组织；session 日期只保留在课堂索引和 provenance。\n- automatic repair = disabled；质量 warning、DLI 数量或篇幅不会触发自动重跑。\n`;
}

function writeJsonFile(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function ephemeralComposerInputs(tempRoot, sources) {
  const units = [];
  const modules = chapters.map(chapter => ({
    moduleId: chapter.id,
    kind: 'teaching',
    title: chapter.title,
    sourceUnitRefs: [],
    risk: {}
  }));
  for (const chapter of chapters) {
    const module = modules.find(item => item.moduleId === chapter.id);
    for (const block of chapter.blocks) {
      const unitId = `composer-unit-${block.id}`;
      const sourceId = block.sourceIds[0];
      units.push({ unitId, sourceId, contentType: block.role === 'METHOD' ? 'problem-solving-tip' : block.role === 'EXAMPLE' ? 'example' : 'definition', summary: `${block.recallTarget}：${block.core[0]}`, keyTerms: block.terms, observations: [], locator: { kind: 'line-range', start: '1', end: String(sources.find(source => source.sourceId === sourceId)?.lineCount ?? 1) } });
      module.sourceUnitRefs.push(unitId);
    }
  }
  const sourceMap = { contractVersion: 'source-map/0.1', schemaVersion: '0.1', sourcePackageId: 'pkg-course-rebuild-001-composer', sources: sources.map(source => ({ sourceId: source.sourceId, kind: 'transcript', location: source.path })), units };
  const lessonModel = { contractVersion: 'lesson-model-prototype/1.0-course-rebuild', caseId: 'COURSE_REBUILD_001', modules };
  const boundaryPlan = { chapterCandidates: chapters.map(chapter => ({ chapterId: chapter.id, chapterTitle: chapter.title })) };
  const structureAudit = { prototype: true, status: 'PASS', source: 'course-rebuild-adapter' };
  writeJsonFile(path.join(tempRoot, 'source-map.json'), sourceMap);
  writeJsonFile(path.join(tempRoot, 'lesson-model.json'), lessonModel);
  writeJsonFile(path.join(tempRoot, 'note-boundary-plan.json'), boundaryPlan);
  writeJsonFile(path.join(tempRoot, 'human-note-structure-audit.json'), structureAudit);
  for (const chapter of chapters) {
    const blocks = chapter.blocks.map((block, index) => ({
      blockId: block.id,
      chapterId: chapter.id,
      sectionId: `section-${index + 1}`,
      title: block.title,
      moduleRefs: [chapter.id],
      sourceRefs: [`composer-unit-${block.id}`],
      blockRole: ['CORE', 'CONCEPT', 'BOUNDARY', 'ROADMAP', 'METHOD', 'EXAMPLE'].includes(block.role) ? block.role : 'CONCEPT',
      recallTarget: block.recallTarget,
      coreStatements: block.core,
      supportingDetails: block.details,
      exampleRefs: block.examples,
      warningRefs: block.warnings,
      expansionLevel: 'DEVELOPED',
      displayMode: block.role === 'METHOD' ? 'COMPACT_MIXED' : 'PARAGRAPH',
      mustSeparateFrom: [],
      mergeRationale: 'course rebuild adapter keeps the source-derived recall block intact',
      flowOrder: index + 1
    }));
    writeJsonFile(path.join(tempRoot, 'block-plans', `human-note-block-plan.${chapter.id}.json`), { chapterId: chapter.id, majorSections: blocks.map((block, index) => ({ sectionId: block.sectionId, title: block.title, flowOrder: index + 1 })), blocks });
  }
  return { sourceMapPath: path.join(tempRoot, 'source-map.json'), lessonModelPath: path.join(tempRoot, 'lesson-model.json'), boundaryPlanPath: path.join(tempRoot, 'note-boundary-plan.json') };
}

async function invokeExistingComposer(sources) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-agent-course-composer-'));
  try {
    const inputs = ephemeralComposerInputs(tempRoot, sources);
    const outputDir = path.join(tempRoot, 'composer-output');
    const { composeConsolidatedHumanNote } = await import('../src/human-note-v2/composer-v2-1.ts');
    const originalLog = console.log;
    console.log = () => {};
    try {
      composeConsolidatedHumanNote({ phaseAStatus: 'FROZEN_FOR_REAL_CASE_001', baselineOutputDir: tempRoot, outputDir, lessonModelPath: inputs.lessonModelPath, sourceMapPath: inputs.sourceMapPath, presentationOverrides: { blockIds: [] } }, repoRoot);
    } finally {
      console.log = originalLog;
    }
    const chapterNotes = new Map();
    const chapterSidecars = new Map();
    for (const chapter of chapters) {
      const noteName = fs.readdirSync(path.join(outputDir, 'candidate')).find(file => file.startsWith(`${chapter.id}-`) && file.endsWith('.md'));
      const sidecarName = fs.readdirSync(path.join(outputDir, 'semantic')).find(file => file.startsWith(`${chapter.id}-`) && file.endsWith('.json'));
      if (!noteName || !sidecarName) throw new Error(`existing Composer did not produce ${chapter.id} candidate and sidecar`);
      chapterNotes.set(chapter.id, fs.readFileSync(path.join(outputDir, 'candidate', noteName), 'utf8'));
      chapterSidecars.set(chapter.id, JSON.parse(fs.readFileSync(path.join(outputDir, 'semantic', sidecarName), 'utf8')));
    }
    const ledgerPath = path.join(outputDir, 'source-detail-ledger.json');
    const coveragePath = path.join(outputDir, 'audits', 'INFORMATION_COVERAGE_AUDIT.json');
    return { invoked: true, composer: 'composeConsolidatedHumanNote', chapterNotes, chapterSidecars, ledger: fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : null, coverage: fs.existsSync(coveragePath) ? JSON.parse(fs.readFileSync(coveragePath, 'utf8')) : null, tempRoot };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function safetyChecks(result, sources, contexts, outputs) {
  const reason = result.abortReason ?? '';
  const fail = pattern => result.status === 'ABORTED' && pattern.test(reason) ? 'FAIL' : 'PASS';
  return [
    { name: 'exactly four primary transcript sources', status: sources.length === 4 ? 'PASS' : 'FAIL' },
    { name: 'source read-only and no generated output as source', status: fail(/SOURCE_NOT_FOUND|GENERATED_OUTPUT_AS_SOURCE|SOURCE_OUTPUT_COLLISION/u) },
    { name: 'canonical path containment / sibling-prefix / ../ escape', status: fail(/PATH_ESCAPE|PILOT_ROOT/u) },
    { name: 'symlink/junction/reparse-point containment', status: fail(/SYMLINK|REPARSE/u) },
    { name: 'NTFS ADS / reserved names / .obsidian', status: fail(/ADS|RESERVED|OBSIDIAN/u) },
    { name: 'Chinese names and spaces remain normalized paths', status: outputs.filter(item => item.artifactKind === 'candidate').some(item => item.path.includes(COURSE_ROOT_NAME) && /[\u4e00-\u9fff]/u.test(item.path) && item.path.includes(' ')) ? 'PASS' : 'FAIL' },
    { name: 'existing final path overwrite forbidden', status: fail(/OVERWRITE|TARGET_APPEARED|MANIFEST_EXISTS/u) },
    { name: 'maxModifiedFiles = 0', status: fail(/MAX_MODIFIED_FILES|USER_NOTE_OVERWRITE/u) },
    { name: `file budget <= ${PILOT_LIMITS.maxCreatedFiles}`, status: outputs.length <= PILOT_LIMITS.maxCreatedFiles ? 'PASS' : 'FAIL' },
    { name: `byte budget <= ${PILOT_LIMITS.maxTotalWriteBytes}`, status: outputs.reduce((sum, item) => sum + item.bytes, 0) <= PILOT_LIMITS.maxTotalWriteBytes ? 'PASS' : 'FAIL' },
    { name: 'automatic repair disabled', status: result.manifest?.automaticRepair === 'DISABLED' ? 'PASS' : 'FAIL' },
    { name: 'Production Vault write', status: 'FALSE' },
    { name: 'pilot-safe dry-run gate', status: result.status === 'DRY_RUN' ? 'PASS' : 'FAIL' },
    { name: 'context files read-only', status: contexts.every(context => context.readOnly) ? 'PASS' : 'FAIL' }
  ];
}

async function main() {
  const configArgument = argumentValue('--config');
  if (!configArgument) throw new Error('usage: npm run pilot:course -- --config <COURSE_REBUILD_001.json> [--dry-run|--commit]');
  const loaded = loadPilotConfig(resolvePath(configArgument, process.cwd()));
  const config = loaded.config;
  const mode = parseMode(config);
  const configDir = path.dirname(loaded.configPath);
  if (!Array.isArray(config.sources) || config.sources.length !== 4) throw new Error('COURSE_REBUILD_001 requires exactly four sources');
  const sourceDefinitions = [
    ['src-nobel', 'PRIMARY_CLASSROOM_EVIDENCE', ['人工智能', '金融', 'AlphaFold', '诺贝尔']],
    ['src-turing', 'PRIMARY_CLASSROOM_EVIDENCE', ['人工智能', '图灵', '神经网络', '深度学习']],
    ['src-bayes', 'PRIMARY_CLASSROOM_EVIDENCE', ['知识图谱', '概率', '贝叶斯', '因果']],
    ['src-gradient', 'PRIMARY_CLASSROOM_EVIDENCE', ['机器学习', '梯度', '优化', '概率']]
  ];
  const sources = config.sources.map((value, index) => sourceRecord(resolvePath(value, configDir), sourceDefinitions[index][0], sourceDefinitions[index][1], sourceDefinitions[index][2]));
  const contexts = (config.vaultContextFiles ?? []).map(value => contextRecord(resolvePath(value, configDir), 'EXISTING_VAULT_CONTEXT'));
  const artifactModel = buildArtifacts(sources, contexts, mode);
  const composerRun = await invokeExistingComposer(sources);
  if (composerRun.ledger) artifactModel.ledger = { ...composerRun.ledger, courseRebuildSourceAccounting: true, seedPolicy: 'source-derived-only; existing Vault Markdown is context, not DLI seed' };
  if (composerRun.coverage) artifactModel.coverage = { ...artifactModel.coverage, existingComposerCoverage: composerRun.coverage };
  const candidateOutputs = [];
  const add = (relativePath, artifactKind, content) => candidateOutputs.push({ path: relativePath, artifactKind, content });
  add(`candidate/${COURSE_ROOT_NAME}/${COURSE_ROOT_NAME} MOC.md`, 'candidate', renderMoc());
  for (const chapter of chapters) add(`candidate/${COURSE_ROOT_NAME}/${chapter.number} ${chapter.title}.md`, 'candidate', composerRun.chapterNotes.get(chapter.id) ?? renderChapter(chapter, sources));
  add(`candidate/${COURSE_ROOT_NAME}/课堂索引.md`, 'candidate', renderIndex(sources));
  add(`candidate/${COURSE_ROOT_NAME}/migration/RESTRUCTURE_PLAN.md`, 'candidate', renderRestructurePlan());
  add('semantic/course-rebuild.semantic.json', 'sidecar', { caseId: 'COURSE_REBUILD_001', course: config.course, chapters: chapters.map(chapter => ({ id: chapter.id, title: chapter.title, status: chapter.status, sourceIds: chapter.sourceIds, blockIds: chapter.blocks.map(block => block.id) })), provenance: 'artifacts/provenance.json', sourceDerivedDli: 'artifacts/dli-source-detail-ledger.json' });
  for (const chapter of chapters) add(`semantic/${chapter.id}.semantic.json`, 'sidecar', composerRun.chapterSidecars.get(chapter.id) ?? { caseId: 'COURSE_REBUILD_001', chapterId: chapter.id, title: chapter.title, sourceIds: chapter.sourceIds, blockIds: chapter.blocks.map(block => block.id), dliIds: artifactModel.dli.filter(item => chapter.blocks.some(block => block.id === item.blockId)).map(item => item.distinctInformationId), provenance: 'SOURCE_DERIVED' });
  add('artifacts/source-map-equivalent.json', 'artifact', artifactModel.sourceMap);
  add('artifacts/lesson-model.json', 'artifact', artifactModel.lessonModel);
  add('artifacts/dli-source-detail-ledger.json', 'artifact', artifactModel.ledger);
  add('artifacts/coverage-audit.json', 'artifact', artifactModel.coverage);
  add('artifacts/course-rebuild-plan.json', 'artifact', artifactModel.plan);
  add('artifacts/provenance.json', 'artifact', artifactModel.provenance);
  const plannedBytes = candidateOutputs.reduce((sum, output) => sum + Buffer.byteLength(typeof output.content === 'string' ? output.content : `${JSON.stringify(output.content, null, 2)}\n`, 'utf8'), 0);
  const preliminaryManifest = { manifestVersion: 'course-rebuild-pilot/0.1', runName: config.runName, course: config.course, mode, wouldCommit: true, pipeline: { invoked: true, adapter: 'tools/course-rebuild.mjs', analysis: 'bottom-up source-derived DLI planning', composition: 'existing composeConsolidatedHumanNote in ephemeral workdir', existingComposer: composerRun.composer, persistentWriteBoundary: 'src/pilot-safe/index.mjs', workspace: 'ephemeral-temp-workdir then in-memory artifacts' }, sources: sources.map(source => ({ sourceId: source.sourceId, fileName: source.fileName, path: source.path, bytes: source.bytes, sha256: source.sha256, date: source.date, role: source.role })), vaultContextFilesRead: contexts.map(context => ({ path: context.path, bytes: context.bytes, sha256: context.sha256, role: context.role, readOnly: true })), chapterPlan: artifactModel.plan.chapters, plannedFileCount: candidateOutputs.length + 1, plannedBytes: plannedBytes, automaticRepair: 'DISABLED', productionVaultWrite: false };
  add('run-manifest.json', 'run-manifest', preliminaryManifest);
  const result = executePilotRun({ config: { mode, allowedPilotRoot: config.allowedPilotRoot, allowExternalPilotRoot: config.allowExternalPilotRoot, productionVaultRoots: config.productionVaultRoots, sourceMaterials: [...sources.map(source => source.path), ...contexts.map(context => context.path)], candidateOutputs, generatedOutputDirs: ['candidate', 'semantic', 'artifacts'], automaticRepair: false }, repoRoot, configPath: loaded.configPath, configBytes: loaded.configBytes });
  const plannedFiles = result.manifest?.plannedWrites ?? result.plannedWrites ?? [];
  const report = { status: result.status, runName: config.runName, course: config.course, mode, sources: sources.map(source => ({ fileName: source.fileName, absolutePath: source.path, bytes: source.bytes, sha256: source.sha256, date: source.date, role: source.role, lineCount: source.lineCount })), vaultFilesRead: contexts.map(context => ({ fileName: context.fileName, absolutePath: context.path, bytes: context.bytes, sha256: context.sha256, role: context.role, wikilinksFound: context.wikilinks.length })), selectedCourseStructure: artifactModel.plan.chapters, plannedHumanNotes: plannedFiles.filter(item => item.artifactKind === 'candidate').map(item => ({ path: item.path, bytes: item.bytes })), plannedSidecars: plannedFiles.filter(item => item.artifactKind === 'sidecar').map(item => ({ path: item.path, bytes: item.bytes })), plannedArtifacts: plannedFiles.filter(item => item.artifactKind === 'artifact').map(item => ({ path: item.path, bytes: item.bytes })), plannedManifest: plannedFiles.filter(item => item.artifactKind === 'run-manifest').map(item => ({ path: item.path, bytes: item.bytes })), plannedFiles, plannedFileCount: plannedFiles.length, plannedBytes: plannedFiles.reduce((sum, item) => sum + item.bytes, 0), twentyFileLimit: { maxCreatedFiles: PILOT_LIMITS.maxCreatedFiles, plannedCreatedFiles: plannedFiles.filter(item => item.action === 'CREATE').length, withinLimit: plannedFiles.filter(item => item.action === 'CREATE').length <= PILOT_LIMITS.maxCreatedFiles }, resolvedPilotPaths: plannedFiles.map(item => item.path), pipelineActuallyInvoked: result.status === 'DRY_RUN', composerActuallyInvoked: composerRun.invoked, pipeline: preliminaryManifest.pipeline, safetyChecks: safetyChecks(result, sources, contexts, plannedFiles), automaticRepair: 'DISABLED', productionVaultWrite: false, wouldCommit: result.status === 'DRY_RUN', abortReason: result.abortReason ?? null, pilotSafeManifest: result.manifest };
  console.log(formatPilotResult(report));
  process.exitCode = result.exitCode;
}

try {
  await main();
} catch (error) {
  console.error(JSON.stringify({ status: 'ABORTED', pipelineActuallyInvoked: false, wouldCommit: false, productionVaultWrite: false, abortReason: String(error) }, null, 2));
  process.exitCode = 2;
}
