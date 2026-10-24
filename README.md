# Learning Agent

把学习资料整理成可复习、可连接、可持续生长的知识库。

Turn learning materials into linked study notes that grow with new evidence.

[中文使用说明](#中文使用说明) · [English guide](#english-guide)

## 中文使用说明

### 这是什么

Learning Agent 提供一个可安装的 Codex Skill：`learning-knowledge-growth`。在 Codex 对话中添加资料、指定笔记目录，就可以让 Codex 整理正式笔记，并在后续加入新资料时继续更新已有知识。

目前的使用入口是 Codex Skill，不是 Obsidian 插件，也不是独立桌面应用。正常使用全程由 Codex 完成，不需要额外配置 DSH、DeepSeek、Jev 或这些服务的 API Key。

### 现有功能

| 功能 | 使用效果 |
| --- | --- |
| 多种资料输入 | 接收 TXT 转写、Markdown、粘贴文本、PPT/PPTX、PDF、图片、文档，以及项目文件或 ZIP；非文本资料的读取能力取决于当前 Codex 环境中的工具。 |
| 原资料配图 | 按需要将 PDF/PPT 中有助理解的图表、流程图等插入对应小节，标明页码或幻灯片号；选用的图片随笔记保存，相同图片复用，不整本截图。 |
| 简明学习笔记 | 默认推荐“术语＋一句大意”，必要时补关键条件、公式或区别；不强制每个点都补定义、原理、例子和易错点。 |
| 简短情境引入 | 可用“例：一年期存款”这样的短语代替完整的课堂过程描述；必要题设、条件、数字和推理步骤仍保留。 |
| 基于材料整理 | 新增知识必须来自原始材料或已有有效笔记；缺失题面、公式和不确定内容标记为待补或待核对，不凭模型常识扩写。 |
| 已有笔记生长 | 保留已有有效内容，有新含义才补充；不同资料重复说明同一件事时合并来源，不反复追加同义段落。 |
| Obsidian 连接 | 为相关且可解析的已有页面添加 `[[双链]]`，包括课程范围、目录和知识地图中的已有主题。 |
| 数学公式 | 使用行内 `$...$` 和独立成行的 `$$` 公式块，检查定界符是否配对。 |
| 标题编号 | 二级标题统一按 `## 1. 标题` 连续编号；三级标题按内容需要使用 `### 1.1 标题`，同步维护受影响的标题链接和 AI 索引。正文列表按内容关系选择。 |
| 分离两套产物 | 人类笔记和 AI 知识索引分别存放；AI 层帮助后续定位已有对象、相关章节和来源。 |
| 后续增量更新 | 新材料优先匹配已有主题和知识对象，再决定扩展页面、增加连接或新建页面。 |
| 按需读取 | 先理解本批资料，再按对象读取相关旧笔记和必要原始证据；发现条件、公式或例子不全时扩大范围，不用固定条数限制知识完整性。 |
| 重复处理筛选 | 只有来源、笔记、依赖和当前范围的哈希都确认未变化时，才复用已有结果；相似度不能单独跳过更新。 |
| 证据对应 | 检索结果只负责找候选；公式、条件、数字、教师例子和纠正内容会回到原始位置核对。 |
| 可追溯结果 | 报告产物路径、更新内容、验证结果与未解决问题，保留紧凑的来源和变更记录。 |

默认围绕当前主题完成知识页。多份资料可以一起提交，按实际主题归组；不会因为选择了课程目录就默认重建整门课。

### 安装

**方式一：下载 Skill 文件夹。**

从当前分支下载仓库，将完整的 `skill/learning-knowledge-growth/` 文件夹复制到 Codex 的 `skills` 目录。默认位置为 `~/.codex/skills/learning-knowledge-growth/`；Windows 通常为 `%USERPROFILE%\.codex\skills\learning-knowledge-growth\`。如果设置了 `CODEX_HOME`，使用它下面的 `skills` 目录。

也可以下载 [Skill ZIP 安装包](dist/learning-knowledge-growth.skill.zip)，解压到上述 `learning-knowledge-growth` 文件夹，确认文件夹内直接包含 `SKILL.md`、`agents/`、`references/` 和 `scripts/`。

**方式二：使用仓库安装命令。** 需要 Git、Node.js 22 或更高版本，以及 npm：

```powershell
git clone --branch codex/knowledge-compilation https://github.com/ynugyz/learning-agent.git
cd learning-agent
npm run skill:install
```

安装命令会替换当前 Codex 配置中同名的 Skill；不会修改笔记目录。安装 Skill 本身不需要先执行 `npm install`。首次安装后，重新打开 Codex 对话；若未发现 Skill，重启 Codex。

### 第一次使用

1. 在 Codex 中打开可访问笔记目录的工作区。
2. 在聊天框调用 `$learning-knowledge-growth`，添加转写或其它学习资料，也可以提供可访问的本地文件路径。
3. 指定课程或主题，以及两个独立的输出位置。
4. 说明已有笔记在哪里，并明确是否允许更新它们。

首次处理一批新资料时，Skill 会确认资料类型和笔记展开程度。已说明的偏好不重复询问。推荐 **简明提要**：知道有哪些知识点、理解大意、保留继续查阅的入口；也可选择 **重点解释** 或 **详细整理**。“AI 自行取舍”从简明开始，只在不补充就会误解时展开。旧的“完整保留”“平衡整理”设置仍可识别，当前明确要求优先于旧设置。

完整读懂资料不等于把细节全写进笔记。课堂资料附带教材时，默认围绕本次主题使用教材，不自动把整章内容并入正文。未展开的细节留在原始资料中，AI 层保存紧凑的定位信息。PPT、PDF、文档和图片会使用对应读取能力保留原始位置；无法读取的部分会标明，不凭空补齐。

提供 PDF/PPT 时，Skill 会自行判断哪些原图值得保留。你也可以说“保留重要结构图”或“这次只要文字”。配图依赖当前环境能可靠渲染原资料；无法渲染时会说明缺口并继续整理可读内容。自带的可选图片保存工具使用 Python 3.10+ 标准库，不需要 API Key；它负责附件复用和相对链接，文档渲染仍由当前可用工具完成。

可以直接使用下面的提示，替换其中的路径：

```text
$learning-knowledge-growth
请整理附件中的概率论资料。
采用简明提要：术语加简短大意，关键条件保留，不懂的我自己查。
人类笔记目录：<我的 Obsidian Vault 中的概率论文件夹>
AI 知识目录：<单独存放 AI 索引的概率论文件夹>
已有笔记就在上述人类笔记目录中，允许更新相关页面。
保留已有有效内容，只吸收材料支持的知识，并连接相关已有笔记。
```

两个目录首次使用时必须指定；Skill 会保存配置，后续可复用。人类笔记目录也可以是普通 Markdown 文件夹，不要求使用 Obsidian。不要把中间产物目录指定为 Vault 根目录。

### 以后怎样投喂

- **同一科目继续生长：** 添加新资料，说明沿用哪个课程和配置。新对话中可以提供 AI 目录或 `knowledge-growth.config.json` 路径，帮助恢复上下文。
- **新科目：** 提供新的课程名称、人类笔记目录和 AI 知识目录，无需手动编写课程白名单配置。
- **更新已有页面：** 提供页面名称或路径，并明确允许更新；有效旧内容会被保留，新材料用于补充和重组。
- **先看结果再写入：** 指定一个独立测试输出目录，作为本次人类笔记位置。
- **多份资料：** 可以一起添加相关文件；按主题整理，不强制“一份文件一个页面”。

“生长”发生在每次调用 Skill 时。它不是后台监听服务，单纯把文件放进目录并不会自动启动。

### 最后会得到什么

| 位置 | 产物 |
| --- | --- |
| 人类笔记目录 | 正式 `.md` 笔记，以及实际用到的 `_assets/learning/` 原图附件；标题和正文不带“候选”“草稿”等流程标签。 |
| AI 知识目录 | 课程 `index.json` 与 `cards/` 知识卡片。来源、哈希、维护状态、未决项和关系直接保存在这一层，用于后续检索，不是人类笔记的完整复制。 |
| 对话中的结果报告 | 本次输入、课程、写入路径、更新页面、增加的链接和待补问题。 |

临时工作文件放在 AI 目录外的独立工作区，成功后整目录清理；失败时默认只保留一份简短错误说明。运行清单和累计变更日志不是长期必需品；本次变化会在对话中说明，必要的来源与维护信息已经进入 AI 层。原始资料保持不变。已有笔记不会因为新资料没再次提到某个知识点就被删除。

### 换电脑与更新 Skill

换电脑后安装同一 Skill，并同步人类笔记及其 `_assets/learning/` 附件、AI 索引和需要继续追溯的原始资料。保持笔记与附件的相对位置，图片无需依赖旧电脑的盘符。告知 Codex 新机器上的目录路径；仅安装 Skill 不会带来旧知识库，也不能访问另一台电脑的本地文件。

使用仓库安装方式时，在原克隆目录执行：

```powershell
git pull --ff-only
npm run skill:install
```

使用 ZIP 方式时，下载最新安装包并替换 Skill 文件夹。更新 Skill 不会自动重写已经生成的笔记。

### 使用边界与反馈

Skill 需要当前 Codex 环境能读取输入并写入你指定的目录；云端环境不能直接访问本机盘符。图片模糊、扫描件损坏或缺少板书时，可能需要补充材料。它不保证自动恢复未提供的知识，也不承诺每次调用都具有相同耗时或结果。

仓库里的旧运行脚本属于实验工具，普通用户使用上述 Skill 入口即可。遇到问题，可在 [GitHub Issues](https://github.com/ynugyz/learning-agent/issues) 提供问题说明、使用版本和脱敏后的最小示例。

如果这个项目对你的学习整理有帮助，欢迎在 GitHub 上点一个 Star，支持项目继续改进。

### WorkBuddy 适配版

仓库同时提供独立的 WorkBuddy Skill（当前适配版 v0.2.0）：`learning-knowledge-growth-workbuddy`。它使用 WorkBuddy 要求的中英文 Skill frontmatter，保留同一套 SourceMap、LessonModel、Alignment、ChangePlan、Human Note 和 AI Layer 规则；Codex 版和 WorkBuddy 版互不覆盖。

| WorkBuddy 入口 | 用法 |
| --- | --- |
| 普通对话 | 在 WorkBuddy 的“技能 → 添加技能 → 上传技能”中导入 [WorkBuddy Skill ZIP](dist/learning-knowledge-growth.workbuddy.skill.zip)，启用后附加资料。 |
| Expert | 将 WorkBuddy Skill 目录加入 Expert 的 `skills` 列表，再在对话中召唤该 Expert。 |
| Buddy App | 在工作模式或场景胶囊中预绑定该 Skill，让进入该场景的对话自动使用学习资料整理规则。 |

WorkBuddy 的模型由 Expert、工作模式或 Buddy App 的模型配置决定，Skill 不写死模型名称或 API Key。建议先用当前可用的较强 DeepSeek 模型跑一份范围受控的资料，再用 DeepSeek Flash 或其它快速模型跑同一资料进行对照。模型名称和可用性以 WorkBuddy 当前模型池为准。Skill 不调用 DSH、Jev 或外部 DeepSeek API；WorkBuddy 已配置的 DeepSeek 模型可以直接作为执行模型。

WorkBuddy 版是 **Skill-only** 包，不是连接器。`ima 知识库`（若当前客户端提供）、腾讯乐享知识库、腾讯文档和腾讯网盘都只能作为用户明确授权后的可选资料来源或结果去处；默认仍使用授权本地目录。Skill 不自动扫描、后台同步或写回知识库，写回前应确认目标库和改动范围。详见 [WorkBuddy 连接器适配说明](workbuddy/connector-integration.md)。

第一次运行需要在 WorkBuddy 的已授权目录中分别指定：原始资料位置、Human Note 输出位置和 AI Layer 输出位置，并选择“简明提要”“重点解释”或“详细整理”。建议先使用测试目录，确认来源、公式、双链和增量更新后再授权真实 Vault。具体绑定方式、权限边界和模型对照步骤见 [WorkBuddy Harness 说明](workbuddy/README.md)。

官方格式参考：[WorkBuddy Skill](https://open.workbuddy.cn/en/docs/skill)、[Expert](https://open.workbuddy.cn/en/docs/expert)、[Buddy App](https://open.workbuddy.cn/en/docs/buddy-app)。

## English guide

### What this is

Learning Agent provides an installable Codex Skill, `learning-knowledge-growth`. Attach learning materials in a Codex conversation, select output folders, and ask Codex to create formal study notes. Later runs can extend existing knowledge with new material.

The current user interface is a Codex Skill, not an Obsidian plugin or a standalone desktop application. The normal workflow uses Codex throughout and requires no additional DSH, DeepSeek, or Jev setup or API keys.

### Available features

| Feature | What you get |
| --- | --- |
| Multiple input formats | TXT transcripts, Markdown, pasted text, PPT/PPTX, PDFs, images, documents, and project files or ZIP archives. Reading non-text formats depends on tools available in your Codex environment. |
| Original source figures | Relevant PDF/slide charts and diagrams beside the corresponding explanation, with page or slide references. Selected images travel with the notes and identical files are reused; entire decks are not dumped as screenshots. |
| Concise study notes | The recommended style is a recognizable term plus a brief meaning, adding essential conditions, formulas or distinctions as needed. No mandatory definition–mechanism–example checklist for every point. |
| Concise scenario cues | Short phrases such as “Example: one-year deposit” replace long classroom narratives. Necessary assumptions, quantities and reasoning steps remain. |
| Source-grounded content | New knowledge must come from supplied materials or valid existing notes. Missing formulas, incomplete questions, and uncertainty are recorded rather than filled in from model memory. |
| Growing existing notes | Preserve valid content and integrate genuinely new meaning. Repeated explanations add source references rather than another synonymous paragraph. |
| Obsidian links | Meaningful `[[wikilinks]]` to resolvable existing pages, including topics listed in course outlines, contents, and knowledge maps. |
| Mathematics | Inline `$...$` and display math with `$$` delimiters on separate lines, with delimiter checks. |
| Heading numbering | Consecutive H2 numbers (`## 1. Title`); H3 numbers when useful (`### 1.1 Title`), with affected heading links and AI section references kept in sync. Body lists follow the content relationships. |
| Separate outputs | Human study notes and AI retrieval records stored in independently selected folders. |
| Incremental updates | New material is matched against existing topics and objects before extending pages, adding links, or creating new pages. |
| On-demand reading | Understand the current material first, then load relevant existing sections and original evidence for each object. Expand retrieval when conditions, formulas or examples are missing; no fixed evidence count limits completeness. |
| Safe reuse | Reuse an existing result only when source, note, dependency and current-scope hashes all match; similarity alone cannot skip an update. |
| Evidence support | Retrieval finds candidates; formulas, conditions, numbers, generalized teacher examples and corrections are checked against their original locations. |
| Traceable results | Source references, maintenance state, unresolved issues, and validation status are kept in the AI layer; the conversation reports the current change. |

The default scope is the current topic. Multiple files can be grouped by topic; selecting a course folder does not automatically trigger a whole-course rebuild.

### Installation

**Option 1: Copy the Skill folder.**

Download this branch and copy the complete `skill/learning-knowledge-growth/` directory into your Codex skills directory. The default location is `~/.codex/skills/learning-knowledge-growth/`, typically `%USERPROFILE%\.codex\skills\learning-knowledge-growth\` on Windows. If `CODEX_HOME` is set, use its `skills` directory.

Alternatively, download the [Skill ZIP bundle](dist/learning-knowledge-growth.skill.zip) and extract it into that directory. Ensure `SKILL.md`, `agents/`, `references/`, and `scripts/` are directly inside `learning-knowledge-growth/`.

**Option 2: Install from the repository.** Requires Git, Node.js 22 or later, and npm:

```powershell
git clone --branch codex/knowledge-compilation https://github.com/ynugyz/learning-agent.git
cd learning-agent
npm run skill:install
```

The installer replaces the same-named Skill in your current Codex configuration; it does not modify your notes. Installing the Skill does not require running `npm install` first. Open a new Codex conversation after installation; restart Codex if the Skill is not discovered.

### First use

1. Open a Codex workspace that can access your note folders.
2. Invoke `$learning-knowledge-growth` and attach materials, or supply accessible local paths.
3. Specify the course or topic and two separate output folders.
4. Identify existing notes and explicitly state whether they may be updated.

For a new batch, the Skill confirms the material type and explanation depth without repeating preferences already provided. **Concise overview** is recommended: recognize the topics, understand their gist, and find where to read more. **Selective explanation** and **Detailed notes** are also available. “Let Codex choose” starts concise and expands only to prevent misunderstanding. Legacy density settings remain recognized; the current explicit request takes precedence.

Understanding the source fully does not require printing every detail. A textbook supplied alongside lecture material supports the current topic instead of automatically expanding the note to the whole chapter. Unexpanded detail stays in the original material, with compact retrieval locations in the AI layer. Slides, PDFs, documents and images retain their original locations through the appropriate reading tools; unreadable content is marked rather than invented.

For PDFs and slides, the Skill selects useful source figures automatically. You can also ask to “keep important diagrams” or request text only. Figure extraction depends on reliable document rendering in the current environment; missing rendering is reported while readable content can still be compiled. The optional bundled attachment helper uses Python 3.10+ with only its standard library and no API key. It handles image reuse and relative links; available document tools handle rendering.

Replace the placeholders in this example:

```text
$learning-knowledge-growth
Compile the attached probability materials.
Use a concise overview: brief meanings and essential conditions, with terms I can look up later.
Human note folder: <my probability folder inside an Obsidian Vault>
AI knowledge folder: <a separate probability index folder>
Existing notes are in the Human note folder. You may update relevant pages.
Preserve valid content, use only source-supported knowledge,
and link to relevant existing notes.
```

Both folders are required on first use and saved for reuse. A plain Markdown folder is also suitable for Human notes; Obsidian is optional. Keep intermediate working files outside the Vault root.

### Adding more material

- **Continue a course:** Attach new material and name the course and configuration to reuse. In a new conversation, provide the AI folder or `knowledge-growth.config.json` path to restore context.
- **Start another subject:** Provide its name and new Human and AI output folders. No manual course whitelist configuration is required.
- **Update an existing page:** Supply its name or path and authorize updates. Valid content is retained; supported additions can expand and reorganize it.
- **Try before writing to your notes:** Choose a separate test folder for this run's Human output.
- **Submit several files:** Attach related materials together. Organization follows topics rather than a mandatory one-file-per-page rule.

Growth happens when you invoke the Skill. It is not a background folder watcher; dropping a file into a folder alone does not start a run.

### Outputs

| Location | Contents |
| --- | --- |
| Human note folder | Formal `.md` study notes and only the source-image attachments used in `_assets/learning/`, without candidate or draft labels in titles and prose. |
| AI knowledge folder | A course `index.json` and knowledge cards in `cards/`; provenance, hashes, maintenance state, unresolved items, and relations are embedded there. These support retrieval rather than duplicating entire Human notes. |
| Conversation report | Inputs, course, output paths, updated pages, added links, and unresolved evidence gaps. |

Temporary files stay in a separate workspace and are deleted after a successful run. Failed runs normally keep one compact error note, not a growing archive of raw intermediates. Original sources remain unchanged. Existing knowledge is not deleted merely because the latest source omits it.

### Moving to another computer and updating

Install the Skill on the new computer and synchronize your Human notes, their `_assets/learning/` attachments, the AI index, and original materials needed for provenance. Keep the relative layout of notes and attachments so images do not depend on old drive paths. Tell Codex the new local paths. Installing the Skill alone does not transfer an existing knowledge base or grant access to files on another computer.

For a repository installation, run in the original clone:

```powershell
git pull --ff-only
npm run skill:install
```

For ZIP installations, download the latest bundle and replace the Skill folder. Updating the Skill does not automatically rewrite previously generated notes.

### Limits and feedback

Your Codex environment must be able to read the inputs and write to the selected folders. A cloud environment cannot directly access local drive paths. Blurry images, damaged scans, or missing board content may require additional evidence. The Skill does not guarantee recovery of missing knowledge or identical timing and results across runs.

Legacy scripts in this repository are experimental tools; ordinary users can use the Skill entry point above. Report problems through [GitHub Issues](https://github.com/ynugyz/learning-agent/issues), including the version and a minimal example with personal information removed.

If this project helps you organize your learning, a GitHub Star is welcome and supports continued improvement.

### WorkBuddy adapter

The repository also provides a separate WorkBuddy Skill, `learning-knowledge-growth-workbuddy`. It uses WorkBuddy's bilingual Skill frontmatter while preserving the same SourceMap, LessonModel, Alignment, ChangePlan, Human Note, and AI Layer behavior. The Codex and WorkBuddy packages are independent.

| WorkBuddy entry point | How to use it |
| --- | --- |
| Regular conversation | Import [the WorkBuddy Skill ZIP](dist/learning-knowledge-growth.workbuddy.skill.zip) from WorkBuddy's Skills panel, enable it, and attach your materials. |
| Expert | Add the WorkBuddy Skill directory to the Expert `skills` list, then summon that Expert. |
| Buddy App | Pre-bind the Skill to a work mode or scene capsule so conversations in that scene use the learning workflow. |

WorkBuddy selects the model through the Expert, work mode, or Buddy App configuration. The Skill does not hardcode a model name or API key. Start with the strongest available DeepSeek model on a bounded sample, then compare a faster DeepSeek Flash or equivalent model on the same input. Model names and availability follow the current WorkBuddy model pool. The Skill does not call DSH, Jev, or an external DeepSeek API; a DeepSeek model already configured in WorkBuddy can run it directly.

The first run should use a WorkBuddy-authorized test folder and separate Human Note and AI Layer output directories. See the [WorkBuddy Harness guide](workbuddy/README.md) for binding, permissions, model comparison, and the first-run prompt. Official format references: [WorkBuddy Skill](https://open.workbuddy.cn/en/docs/skill), [Expert](https://open.workbuddy.cn/en/docs/expert), and [Buddy App](https://open.workbuddy.cn/en/docs/buddy-app).

## 项目资源 / Project resources

| 路径 / Path | 内容 / Contents |
| --- | --- |
| [skill/learning-knowledge-growth](skill/learning-knowledge-growth/) | Skill 源文件与配套参考 / Skill instructions and references |
| [workbuddy/learning-knowledge-growth-workbuddy](workbuddy/learning-knowledge-growth-workbuddy/) | WorkBuddy 适配版 Skill / WorkBuddy-compatible Skill |
| [dist/learning-knowledge-growth.skill.zip](dist/learning-knowledge-growth.skill.zip) | 可下载的 Skill 安装包 / Downloadable Skill bundle |
| [dist/learning-knowledge-growth.workbuddy.skill.zip](dist/learning-knowledge-growth.workbuddy.skill.zip) | WorkBuddy 可导入安装包 / WorkBuddy importable Skill bundle |
| [prompts](prompts/) | 笔记与索引提示词 / Note and index prompts |
| [docs](docs/) | 项目记录与开发文档 / Project records and development documentation |
| [tools](tools/) | 安装工具与检查命令 / Installation and validation tools |
| [tests](tests/) | 测试 / Tests |

参赛准备 / Competition preparation：

- [安永校园 AI 创新挑战赛参赛计划](docs/COMPETITION_PLAN_EY_CSDC_CAMPUS_AI.md)
- [参赛行动清单](docs/COMPETITION_ACTION_TRACKER.md)
- [人工确认记录](docs/COMPETITION_HUMAN_CONFIRMATIONS.md)
- [作品说明与答辩问答初稿](docs/COMPETITION_PITCH_AND_QA.md)
- [演示 Runbook](docs/COMPETITION_DEMO_RUNBOOK.md)
- [指标记录模板](docs/COMPETITION_METRICS_TEMPLATE.md)
- [公开发布审查](docs/RELEASE_READINESS.md)

开发检查 / Development checks（Windows PowerShell）：

```powershell
npm ci
npm run check
```

开发约定见 [AGENTS.md](AGENTS.md)。仓库不附带个人课程笔记、用户知识库或 API 密钥。

可选附件工具回归检查 / Optional attachment-helper checks（Python 3.10+）：`python -B tests/source-image-attachment.test.py`。

Development conventions are in [AGENTS.md](AGENTS.md). Personal course notes, user knowledge bases, and API keys are not bundled with the repository.
