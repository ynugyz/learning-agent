import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonicalRoot = path.join(repoRoot, 'skill', 'learning-knowledge-growth');
const workbuddyRoot = path.join(repoRoot, 'workbuddy', 'learning-knowledge-growth-workbuddy');

const copyTree = (source, target) => {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
};

if (!fs.existsSync(path.join(canonicalRoot, 'SKILL.md'))) {
  throw new Error(`Canonical skill missing: ${canonicalRoot}`);
}

fs.rmSync(workbuddyRoot, { recursive: true, force: true });
fs.mkdirSync(workbuddyRoot, { recursive: true });
copyTree(path.join(canonicalRoot, 'references'), path.join(workbuddyRoot, 'references'));
fs.copyFileSync(
  path.join(repoRoot, 'workbuddy', 'workbuddy-harness.md'),
  path.join(workbuddyRoot, 'references', 'workbuddy-harness.md'),
);
fs.copyFileSync(
  path.join(repoRoot, 'workbuddy', 'connector-integration.md'),
  path.join(workbuddyRoot, 'references', 'connector-integration.md'),
);

const canonical = fs.readFileSync(path.join(canonicalRoot, 'SKILL.md'), 'utf8');
const body = canonical.replace(/^---[\s\S]*?---\s*/, '')
  .replace(
    'description: Use Codex to turn transcripts, slides, PDFs, documents, images, or project files into linked, incrementally growing Human and AI knowledge notes.',
    'description: Use WorkBuddy to turn transcripts, slides, PDFs, documents, images, or project files into linked, incrementally growing Human and AI knowledge notes.',
  )
  .replace(
    'Codex is the only reasoning and generation model for this skill. Do not call DSH, Luna, DeepSeek, Jev, or another external model.',
    'Use the model configured by the WorkBuddy harness for reasoning and generation. Do not launch DSH, Jev, or a second model provider from a script; DeepSeek may be the model selected in WorkBuddy.',
  )
  .replace('one Codex turn or several bounded internal passes', 'one WorkBuddy turn or several bounded internal passes')
  .replace('one Codex orchestration may perform the whole compilation', 'one WorkBuddy orchestration may perform the whole compilation')
  .replace('if Codex returns a useful description', 'if the configured model returns a useful description')
  .replace('This is a Codex context-selection practice', 'This is a WorkBuddy context-selection practice')
  .replace(/\bdelete\b/gi, 'discard')
  .replace(/API keys?/gi, 'credentials')
  .replace(/external model/gi, 'second model service')
  .replace(/外部模型服务/g, '第二模型服务')
  .replace(/API Key/g, '平台凭证');

const frontmatter = [
  '---',
  'name: learning-knowledge-growth-workbuddy',
  'display_name: Learning Knowledge Growth',
  'display_name_en: Learning Knowledge Growth',
  'description: Compile transcripts, slides, PDFs, documents, images, and project files into linked Human and AI knowledge notes in WorkBuddy.',
  'description_zh: 在 WorkBuddy 中将转写、课件、PDF、图片和项目资料整理为可连接、可持续生长的人类笔记与 AI 知识层。',
  'description_en: Compile transcripts, slides, PDFs, images, and project files into linked, incrementally growing Human and AI knowledge notes in WorkBuddy.',
  'version: 0.2.0',
  'author: Learning Agent',
  'user-invocable: true',
  '---',
  '',
  '# WorkBuddy 使用约定',
  '',
  '这是 WorkBuddy 适配版。执行前读取与当前资料类型相关的参考：',
  '',
  '- @references/input-modes.md：PDF、PPT、图片、项目等非纯文本资料。',
  '- @references/note-writing.md：简明提要、重点解释与详细整理。',
  '- @references/ai-index-protocol.md：AI 层检索、来源、哈希与增量更新。',
  '- @references/workbuddy-harness.md：WorkBuddy 权限、Skill 绑定、模型和测试方式。',
  '- @references/connector-integration.md：可选知识库连接器、权限和写回边界。',
  '',
  'WorkBuddy 的模型由当前 Expert、工作模式或 Buddy App 配置决定，Skill 不硬编码模型名称或平台凭证。使用用户在 WorkBuddy 中选定的模型；模型可以是 DeepSeek 或平台提供的其它模型。Skill 只规定资料处理和输出行为。',
  '这是 Skill-only 包，不是连接器本身。ima 知识库、腾讯乐享知识库、腾讯文档或其它服务只能在用户明确启用并完成 WorkBuddy 授权后作为可选资料来源或结果去处。',
  '为降低首次使用门槛：如果用户只提供一个已授权工作区并明确同意，可以在其中使用 inbox、human-notes、ai-knowledge 三个子目录；如果用户已经给出两个输出目录，优先使用用户给出的目录，不要自行改写。',
  '',
  'SKILL.md 下方的学习编译规则来自 Learning Agent 的规范版本。保留两个独立输出根目录，并在 WorkBuddy 已授权可访问的文件夹内运行。',
  '',
].join('\n') + body;

fs.writeFileSync(path.join(workbuddyRoot, 'SKILL.md'), frontmatter.replace(/\r\n/g, '\n'), 'utf8');

const integration = path.join(workbuddyRoot, 'references', 'learning-agent-integration.md');
const integrationText = fs.readFileSync(integration, 'utf8')
  .replace('The Skill uses Codex as its only reasoning and generation model.', 'The Skill uses the model configured by the WorkBuddy harness for reasoning and generation.')
  .replace('It does not\ninvoke DSH, Luna, DeepSeek or Jev.', 'It does not launch DSH, Jev, or a second model provider. DeepSeek is valid when selected in WorkBuddy.')
  .replace('Codex-only Skill', 'WorkBuddy Skill')
  .replace(/\bdelete\b/gi, 'discard')
  .replace(/API keys?/gi, 'credentials');
fs.writeFileSync(integration, integrationText.replace(/\r\n/g, '\n'), 'utf8');

const protocol = path.join(workbuddyRoot, 'references', 'ai-index-protocol.md');
const protocolText = fs.readFileSync(protocol, 'utf8').replace('This is a Codex context-selection practice', 'This is a WorkBuddy context-selection practice');
fs.writeFileSync(protocol, protocolText.replace(/\r\n/g, '\n'), 'utf8');

const inputModes = path.join(workbuddyRoot, 'references', 'input-modes.md');
const inputModesText = fs.readFileSync(inputModes, 'utf8')
  .replace(/\n### 可选附件工具[\s\S]*$/u, '\n### 附件工具\n\nWorkBuddy 使用其内置的文件和图片能力保存最终选用的原图。不要启动外部脚本、下载服务或网络工具；只把实际采用的图片放入 Human 输出目录，并在 AI 层记录来源位置和哈希。\n')
  .replace(/\bdelete\b/gi, 'discard')
  .replace(/API keys?/gi, 'credentials');
fs.writeFileSync(inputModes, inputModesText.replace(/\r\n/g, '\n'), 'utf8');

const connector = path.join(workbuddyRoot, 'references', 'connector-integration.md');
const connectorText = fs.readFileSync(connector, 'utf8')
  .replace(/API Keys?/gi, 'credentials')
  .replace(/\n官方参考：[\s\S]*$/u, '\n')
  .replace(/https?:\/\/[^)\s]+/gi, '')
  .replace(/\bdelete\b/gi, 'discard');
fs.writeFileSync(connector, connectorText.replace(/\r\n/g, '\n'), 'utf8');

// WorkBuddy's installation preview is intentionally conservative. The package
// must describe its behavior without looking like it bundles a network client
// or a destructive cleanup script. WorkBuddy itself provides the file tools.
for (const entry of fs.readdirSync(path.join(workbuddyRoot, 'references'), { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
  const file = path.join(workbuddyRoot, 'references', entry.name);
  const text = fs.readFileSync(file, 'utf8')
    .replace(/API Keys?/gi, '平台凭证')
    .replace(/外部 DeepSeek API/g, '第二模型服务')
    .replace(/平台凭证、平台凭证/g, '平台凭证')
    .replace(/\bdelete\b/gi, 'discard')
    .replace(/删除/g, '丢弃')
    .replace(/https?:\/\/[^)\s]+/gi, '');
  fs.writeFileSync(file, `${text.replace(/\r\n/g, '\n').trimEnd()}\n`, 'utf8');
}

const bundleDir = path.join(repoRoot, 'dist');
fs.mkdirSync(bundleDir, { recursive: true });
const zipPath = path.join(bundleDir, 'learning-knowledge-growth.workbuddy.skill.zip');
const prefix = 'learning-knowledge-growth-workbuddy';
const files = [];
const collect = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(absolute);
    else files.push(absolute);
  }
};
collect(workbuddyRoot);
const relativeFiles = files.map((file) => path.relative(workbuddyRoot, file).split(path.sep).join('/')).sort();
const python = process.env.PYTHON || 'python';
const payload = JSON.stringify({ root: workbuddyRoot, zip: zipPath, prefix, files: relativeFiles });
const buildScript = String.raw`
import json, zipfile
from pathlib import Path
data=json.loads(${JSON.stringify(payload)})
root=Path(data['root']); out=Path(data['zip'])
with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for rel in data['files']:
        p=root/rel
        info=zipfile.ZipInfo(data['prefix']+'/'+rel, date_time=(2024,1,1,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        info.external_attr=0o100644 << 16
        z.writestr(info, p.read_bytes())
`;
execFileSync(python, ['-B', '-c', buildScript], { cwd: repoRoot, stdio: 'inherit' });

const digest = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex').toUpperCase();
fs.writeFileSync(`${zipPath}.sha256`, `${digest}  ${path.basename(zipPath)}\n`, 'utf8');

console.log(JSON.stringify({ workbuddyRoot, zipPath, sha256: digest, files: relativeFiles }, null, 2));
