# Learning Agent — WorkBuddy 适配版

这是一份面向 WorkBuddy 的 Skill 包。它与仓库中的 Codex 版共享同一套知识编译语义，但使用 WorkBuddy 要求的 `SKILL.md` frontmatter，并适配 WorkBuddy 的 Skill、Expert 和 Buddy App 绑定方式。

## 包含内容

`learning-knowledge-growth-workbuddy/` 包含：

- WorkBuddy 可识别的 `SKILL.md`；
- `references/`：输入资料、Human Note、AI Layer、WorkBuddy Harness 说明；
- `scripts/attach_source_image.py`：保存已检查的 PDF/PPT 原图并生成相对 Markdown 链接。

## 导入

在 WorkBuddy 的“技能 → 添加技能 → 上传技能”中导入：

`dist/learning-knowledge-growth.workbuddy.skill.zip`

也可以直接上传 `workbuddy/learning-knowledge-growth-workbuddy/` 文件夹。

导入后可直接在对话中调用，或将 Skill 绑定到 Expert 的 `skills` 列表，再进一步绑定到 Buddy App 工作模式或场景胶囊。

## 模型

Skill 不固定模型。模型由 WorkBuddy 的 Expert、工作模式或 Buddy App 模型配置决定。建议先用当前可用的较强 DeepSeek 模型跑一份受控资料，再用 DeepSeek Flash 或其它快速模型跑同一资料进行对照。模型名称和可用性以 WorkBuddy 当前模型池为准。

Skill 不保存 API Key，也不调用 DSH、Jev 或外部模型服务。WorkBuddy 的模型配置负责模型和凭证，Skill 负责资料整理规则。

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

## 官方依据

- [WorkBuddy Skill 结构与 frontmatter](https://open.workbuddy.cn/en/docs/skill)
- [WorkBuddy Expert 与 skills 绑定](https://open.workbuddy.cn/en/docs/expert)
- [WorkBuddy Buddy App 工作模式、场景和模型配置](https://open.workbuddy.cn/en/docs/buddy-app)
- [WorkBuddy 连接器与 Skill 文件](https://open.workbuddy.cn/docs/connector)
