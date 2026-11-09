# Learning Agent — WorkBuddy 适配版（v0.4.1）

这是一份面向 WorkBuddy 的 Skill 包。它与仓库中的 Codex 版共享同一套知识编译语义，但使用 WorkBuddy 要求的 `SKILL.md` frontmatter，并适配 WorkBuddy 的 Skill、Expert 和 Buddy App 绑定方式。

## 包含内容

`learning-knowledge-growth-workbuddy/` 包含：

- WorkBuddy 可识别的 `SKILL.md`；
- `references/`：输入资料、Human Note、AI Layer、WorkBuddy Harness 说明；
- WorkBuddy 内置的文件和图片能力：保存已检查的 PDF/PPT 原图并生成相对 Markdown 链接；WorkBuddy 包不携带外部 Python 辅助脚本，场景校验由宿主能力或人工文件级检查完成。

## 导入

普通用户只需要导入 ZIP。在 WorkBuddy 的“技能 → 添加技能 → 上传技能”中导入：

`dist/learning-knowledge-growth.workbuddy.skill.zip`

`workbuddy/learning-knowledge-growth-workbuddy/` 文件夹只用于开发和检查，不作为普通用户的首选安装入口。

导入后可直接在对话中调用，或将 Skill 绑定到 Expert 的 `skills` 列表，再进一步绑定到 Buddy App 工作模式或场景胶囊。

## 模型

Skill 不固定模型。模型由 WorkBuddy 的 Expert、工作模式或 Buddy App 模型配置决定。建议先用当前可用的较强 DeepSeek 模型跑一份受控资料，再用 DeepSeek Flash 或其它快速模型跑同一资料进行对照。模型名称和可用性以 WorkBuddy 当前模型池为准。

Skill 不保存 API Key，也不调用 DSH、Jev 或外部模型服务。WorkBuddy 的模型配置负责模型和凭证，Skill 负责资料整理规则。

v0.4.1 在运行优化之外加入 Excalidraw 原生可编辑图支持：优先使用 Obsidian 原生 CLI/Automate，其次使用宿主已接入的 Excalidraw MCP/App，最后才生成本地 `.excalidraw.md`/`.excalidraw`。流程、结构、变量关系和数学/几何构造都可以触发视觉审核。图中文字和箭头必须有真实双向绑定，Human Note 直接嵌入可编辑图；PNG/SVG 只作为可选预览。若 Excalidraw 不可用，仍可只交付文字或来源截图，并记录文件级校验回退。

此前 v0.4.0 的运行优化仍保留：先用来源 ID、定位和哈希组装临时证据包，再生成笔记；对已有对象先做保守的 unchanged 预筛选，只有身份、范围、来源、笔记、卡片和依赖都完全一致时才复用。缺少任何条件都会继续正常判断，因此相似文本不会被直接当作“无需更新”。ChangePlan 默认保留已有有效内容，不会因为新资料没有再次提到就静默删除。

这是一个 **本地资料版 Skill-only** 包：Skill 只处理当前对话附件和 WorkBuddy 明确授权的目录，不主动连接外部服务。若你在 WorkBuddy 中另外启用了 ima 知识库或其它资料连接器，先把需要的资料选入当前对话，再让 Skill 处理；Skill 本身不申请连接器权限，也不会后台同步或自动写回知识库。连接器设计说明仍保留在仓库的 [连接器适配说明](connector-integration.md) 中，但不随基础 ZIP 安装。

## 第一次运行

需要在对话中明确：

```text
使用 learning-knowledge-growth-workbuddy。
原始资料目录：<WorkBuddy 已授权目录>/inbox
Human Note 输出：<WorkBuddy 已授权目录>/human-notes
AI Layer 输出：<WorkBuddy 已授权目录>/ai-knowledge
已有笔记允许更新。
采用简明提要：覆盖本批资料提到的概念，每项通常一两句话，保留关键条件和公式；仅提及的概念不擅自扩写。
```

WorkBuddy 只会访问授权目录。建议先用测试目录，确认 Human Note、AI Layer、来源链接和增量更新都符合预期，再授权真实 Vault。

为了减少首次配置，如果不想分别填写两个目录，也可以只提供一个已经授权的工作区，并明确同意使用默认子目录：`inbox/` 放原始资料，`human-notes/` 放人类笔记，`ai-knowledge/` 放 AI 层。已经指定了自己的两个输出目录时，Skill 会优先使用它们。

### 发布、分享和售卖前

- 只发布 `dist/learning-knowledge-growth.workbuddy.skill.zip`，不要把个人课程笔记、Production Vault、API Key 或本机绝对路径放进包内。
- 让使用者知道：模型费用、WorkBuddy 账号权限、连接器授权和输出目录由使用者自己承担；Skill 不承诺固定模型或固定耗时。
- 说明当前版本和兼容范围；升级时替换 Skill 包，不会自动重写已有笔记。
- 先用一份公开或脱敏资料完成安装自检，再把 Skill 绑定到真实知识库。
- 如果要提供商业授权、禁止再分发或团队授权，应在公开发布前单独选择并附上明确许可证；当前仓库不替用户作法律授权决定。

## 官方依据

- [WorkBuddy Skill 结构与 frontmatter](https://open.workbuddy.cn/en/docs/skill)
- [WorkBuddy Expert 与 skills 绑定](https://open.workbuddy.cn/en/docs/expert)
- [WorkBuddy Buddy App 工作模式、场景和模型配置](https://open.workbuddy.cn/en/docs/buddy-app)
- [WorkBuddy 连接器与 Skill 文件](https://open.workbuddy.cn/docs/connector)
