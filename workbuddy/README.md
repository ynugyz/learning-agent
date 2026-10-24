# Learning Agent — WorkBuddy 适配版（v0.2.0）

这是一份面向 WorkBuddy 的 Skill 包。它与仓库中的 Codex 版共享同一套知识编译语义，但使用 WorkBuddy 要求的 `SKILL.md` frontmatter，并适配 WorkBuddy 的 Skill、Expert 和 Buddy App 绑定方式。

## 包含内容

`learning-knowledge-growth-workbuddy/` 包含：

- WorkBuddy 可识别的 `SKILL.md`；
- `references/`：输入资料、Human Note、AI Layer、WorkBuddy Harness 说明；
- `scripts/attach_source_image.py`：保存已检查的 PDF/PPT 原图并生成相对 Markdown 链接。

## 导入

普通用户只需要导入 ZIP。在 WorkBuddy 的“技能 → 添加技能 → 上传技能”中导入：

`dist/learning-knowledge-growth.workbuddy.skill.zip`

`workbuddy/learning-knowledge-growth-workbuddy/` 文件夹只用于开发和检查，不作为普通用户的首选安装入口。

导入后可直接在对话中调用，或将 Skill 绑定到 Expert 的 `skills` 列表，再进一步绑定到 Buddy App 工作模式或场景胶囊。

## 模型

Skill 不固定模型。模型由 WorkBuddy 的 Expert、工作模式或 Buddy App 模型配置决定。建议先用当前可用的较强 DeepSeek 模型跑一份受控资料，再用 DeepSeek Flash 或其它快速模型跑同一资料进行对照。模型名称和可用性以 WorkBuddy 当前模型池为准。

Skill 不保存 API Key，也不调用 DSH、Jev 或外部模型服务。WorkBuddy 的模型配置负责模型和凭证，Skill 负责资料整理规则。

这是一份 **Skill-only** 包，不是连接器。若 WorkBuddy 当前连接器列表提供 `ima 知识库`，可以在用户授权后按需读取选定资料或保存结果；腾讯乐享知识库、腾讯文档和腾讯网盘也可作为可选通道。Skill 不会自动扫描、后台同步或写回任何知识库。连接器细则见 [连接器适配说明](connector-integration.md)。

## 第一次运行

需要在对话中明确：

```text
使用 learning-knowledge-growth-workbuddy。
原始资料目录：<WorkBuddy 已授权目录>/inbox
Human Note 输出：<WorkBuddy 已授权目录>/human-notes
AI Layer 输出：<WorkBuddy 已授权目录>/ai-knowledge
已有笔记允许更新。
采用简明提要：术语加简短大意，保留关键条件和公式，不扩写成教材。
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
