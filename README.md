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
| 正式学习笔记 | 按主题整理定义、机制、公式、代码、例子、比较、边界、方法和易错点，不把正文写成课堂流水账。 |
| 基于材料整理 | 新增知识必须来自原始材料或已有有效笔记；缺失题面、公式和不确定内容标记为待补或待核对，不凭模型常识扩写。 |
| 已有笔记生长 | 保留已有有效内容，允许重新组织和充分展开；旧页面的长度不限制新内容的完整度。 |
| Obsidian 连接 | 为相关且可解析的已有页面添加 `[[双链]]`，包括课程范围、目录和知识地图中的已有主题。 |
| 数学公式 | 使用行内 `$...$` 和独立成行的 `$$` 公式块，检查定界符是否配对。 |
| 分离两套产物 | 人类笔记和 AI 知识索引分别存放；AI 层帮助后续定位已有对象、相关章节和来源。 |
| 后续增量更新 | 新材料优先匹配已有主题和知识对象，再决定扩展页面、增加连接或新建页面。 |
| 可追溯结果 | 报告产物路径、更新内容、验证结果与未解决问题，保留紧凑的来源和变更记录。 |

默认围绕当前主题完成知识页。多份资料可以一起提交，按实际主题归组；不会因为选择了课程目录就默认重建整门课。

### 安装

**方式一：下载 Skill 文件夹。**

从当前分支下载仓库，将完整的 `skill/learning-knowledge-growth/` 文件夹复制到 Codex 的 `skills` 目录。默认位置为 `~/.codex/skills/learning-knowledge-growth/`；Windows 通常为 `%USERPROFILE%\.codex\skills\learning-knowledge-growth\`。如果设置了 `CODEX_HOME`，使用它下面的 `skills` 目录。

也可以下载 [Skill ZIP 安装包](dist/learning-knowledge-growth.skill.zip)，解压到上述 `learning-knowledge-growth` 文件夹，确认文件夹内直接包含 `SKILL.md`、`agents/` 和 `references/`。

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

可以直接使用下面的提示，替换其中的路径：

```text
$learning-knowledge-growth
请整理附件中的概率论资料。
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
| 人类笔记目录 | 可直接在 Obsidian 或 Markdown 编辑器阅读的正式 `.md` 笔记；标题和正文不带“候选”“草稿”等流程标签。 |
| AI 知识目录 | 课程 `index.json`、`cards/` 知识卡片，以及紧凑的来源、变更和验证记录。用于后续检索，不是人类笔记的完整复制。 |
| 对话中的结果报告 | 本次输入、课程、写入路径、更新页面、增加的链接和待补问题。 |

临时工作文件留在 AI 目录或单独工作区，成功后按 Skill 规则清理；失败时保留诊断现场。原始资料保持不变。已有笔记不会因为新资料没再次提到某个知识点就被删除。

### 换电脑与更新 Skill

换电脑后安装同一 Skill，并同步人类笔记、AI 索引和需要继续追溯的原始资料。告知 Codex 新机器上的目录路径；仅安装 Skill 不会带来旧知识库，也不能访问另一台电脑的本地文件。

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

## English guide

### What this is

Learning Agent provides an installable Codex Skill, `learning-knowledge-growth`. Attach learning materials in a Codex conversation, select output folders, and ask Codex to create formal study notes. Later runs can extend existing knowledge with new material.

The current user interface is a Codex Skill, not an Obsidian plugin or a standalone desktop application. The normal workflow uses Codex throughout and requires no additional DSH, DeepSeek, or Jev setup or API keys.

### Available features

| Feature | What you get |
| --- | --- |
| Multiple input formats | TXT transcripts, Markdown, pasted text, PPT/PPTX, PDFs, images, documents, and project files or ZIP archives. Reading non-text formats depends on tools available in your Codex environment. |
| Formal study notes | Definitions, mechanisms, formulas, code, examples, comparisons, boundaries, methods, and common mistakes organized by topic rather than as a lecture diary. |
| Source-grounded content | New knowledge must come from supplied materials or valid existing notes. Missing formulas, incomplete questions, and uncertainty are recorded rather than filled in from model memory. |
| Growing existing notes | Valid content is preserved while pages can be reorganized and expanded. The length of an old page does not limit the completeness of an update. |
| Obsidian links | Meaningful `[[wikilinks]]` to resolvable existing pages, including topics listed in course outlines, contents, and knowledge maps. |
| Mathematics | Inline `$...$` and display math with `$$` delimiters on separate lines, with delimiter checks. |
| Separate outputs | Human study notes and AI retrieval records stored in independently selected folders. |
| Incremental updates | New material is matched against existing topics and objects before extending pages, adding links, or creating new pages. |
| Traceable results | Output paths, changes, validation results, unresolved issues, and compact provenance records. |

The default scope is the current topic. Multiple files can be grouped by topic; selecting a course folder does not automatically trigger a whole-course rebuild.

### Installation

**Option 1: Copy the Skill folder.**

Download this branch and copy the complete `skill/learning-knowledge-growth/` directory into your Codex skills directory. The default location is `~/.codex/skills/learning-knowledge-growth/`, typically `%USERPROFILE%\.codex\skills\learning-knowledge-growth\` on Windows. If `CODEX_HOME` is set, use its `skills` directory.

Alternatively, download the [Skill ZIP bundle](dist/learning-knowledge-growth.skill.zip) and extract it into that directory. Ensure `SKILL.md`, `agents/`, and `references/` are directly inside `learning-knowledge-growth/`.

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

Replace the placeholders in this example:

```text
$learning-knowledge-growth
Compile the attached probability materials.
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
| Human note folder | Formal `.md` study notes readable in Obsidian or another Markdown editor, without candidate or draft labels in titles and prose. |
| AI knowledge folder | A course `index.json`, knowledge cards in `cards/`, and compact provenance, change, and validation records. These support retrieval rather than duplicating entire Human notes. |
| Conversation report | Inputs, course, output paths, updated pages, added links, and unresolved evidence gaps. |

Temporary files stay in the AI folder or a separate workspace. Successful runs clean up working files according to the Skill instructions; failed runs retain diagnostics. Original sources remain unchanged. Existing knowledge is not deleted merely because the latest source omits it.

### Moving to another computer and updating

Install the Skill on the new computer and synchronize your Human notes, AI index, and original materials needed for provenance. Tell Codex the new local paths. Installing the Skill alone does not transfer an existing knowledge base or grant access to files on another computer.

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

## 项目资源 / Project resources

| 路径 / Path | 内容 / Contents |
| --- | --- |
| [skill/learning-knowledge-growth](skill/learning-knowledge-growth/) | Skill 源文件与配套参考 / Skill instructions and references |
| [dist/learning-knowledge-growth.skill.zip](dist/learning-knowledge-growth.skill.zip) | 可下载的 Skill 安装包 / Downloadable Skill bundle |
| [prompts](prompts/) | 笔记与索引提示词 / Note and index prompts |
| [docs](docs/) | 项目记录与开发文档 / Project records and development documentation |
| [tools](tools/) | 安装工具与检查命令 / Installation and validation tools |
| [tests](tests/) | 测试 / Tests |

开发检查 / Development checks（Windows PowerShell）：

```powershell
npm ci
npm run check
```

开发约定见 [AGENTS.md](AGENTS.md)。仓库不附带个人课程笔记、用户知识库或 API 密钥。

Development conventions are in [AGENTS.md](AGENTS.md). Personal course notes, user knowledge bases, and API keys are not bundled with the repository.
