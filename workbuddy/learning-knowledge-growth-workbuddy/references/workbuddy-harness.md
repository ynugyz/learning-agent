# WorkBuddy Harness 使用说明

## 1. 这份包负责什么

WorkBuddy 负责模型、会话、文件权限和 Skill 调度；本 Skill 负责学习资料的理解、知识整理、Human Note 和 AI Layer 输出。Skill 不安装模型，不保存 API Key，也不从外部启动第二套模型。

它可以挂在三种入口：

1. **普通对话 + Skill**：在 WorkBuddy 技能面板导入并启用本 Skill，在对话中附加资料。
2. **Expert**：创建 Expert，把本 Skill 目录加入 Expert 的 `skills` 列表。Expert 的系统提示负责身份和权限，本 Skill 负责资料编译。
3. **Buddy App 工作模式或场景胶囊**：把本 Skill 预绑定到“学习资料整理”工作模式或场景。用户进入该模式后，上传资料即可调用同一套编译规则。

同一套 WorkBuddy Skill 可以被多个 Expert 或场景复用；每个入口可以有自己的系统提示、输出根目录和模型配置。不要把不同科目的 Human Note 混在同一个 AI 根目录里。

## 2. 导入与授权

将 `learning-knowledge-growth-workbuddy/` 压缩包导入 WorkBuddy 的“技能 → 添加技能 → 上传技能”。导入后检查技能描述和版本，再启用它。

WorkBuddy 只能访问本次授权的文件夹。建议准备一个实验根目录，例如：

```text
learning-experiment/
├─ inbox/              # 转写、PPT、PDF 等原始资料
├─ human-notes/        # Human Note 输出
└─ ai-knowledge/       # index.json 与 cards/
```

在第一次对话中明确告诉 WorkBuddy：`human-notes/` 和 `ai-knowledge/` 的实际路径，允许写入这两个目录，原始资料只读。生产 Vault 先使用副本或测试目录，确认结果后再授权真实目录。

## 3. 模型怎么运行

模型由 WorkBuddy 的 Expert、工作模式或 Buddy App 的模型配置决定，不在 `SKILL.md` 里写死。

建议按两步实验：

1. **基准运行**：选择当前 WorkBuddy 可用的 DeepSeek 长上下文或较强推理模型，处理一份真实但范围受控的资料，观察来源、链接、公式和已有笔记更新是否正确。
2. **成本运行**：使用 WorkBuddy 中的 DeepSeek Flash 或其它快速模型处理同一份资料，保持 Skill、输入、输出目录和解释深度不变，与基准结果比较。

模型名称会随 WorkBuddy 的模型池和版本变化；以模型选择面板实际显示的名称为准。模型替换不应改变 Skill 文件。比较模型时，固定资料、权限、工作模式、提示和解释深度，否则无法判断差异来自模型还是流程。

Skill 不调用 DSH、Jev 或外部 DeepSeek API。WorkBuddy 已配置的 DeepSeek 模型可以直接作为本 Skill 的执行模型；API Key、平台凭证和模型路由留在 WorkBuddy 的配置中。

## 4. 推荐的 WorkBuddy 系统提示

可在 Expert 或工作模式中使用下面的简短提示：

```text
你负责把用户授权的学习资料整理成可持续生长的知识库。
使用 learning-knowledge-growth-workbuddy Skill。
先完整理解本次授权资料，再按用户指定的展开程度写 Human Note；默认简明提要。
Human Note 与 AI Layer 分开保存，保留已有有效内容，新增内容必须有原始资料或已有有效笔记依据。
只读取用户授权的目录，不扫描整个电脑或 Vault；原始资料只读。
开始写入前确认 Human 输出目录、AI 输出目录和本次解释深度。
```

## 5. 用户第一次调用示例

```text
使用学习资料整理 Skill。
原始资料：<授权目录>/inbox/概率论条件概率.pdf
Human Note 目录：<授权目录>/human-notes/概率论
AI Layer 目录：<授权目录>/ai-knowledge/概率论
已有笔记在 Human Note 目录中，允许更新相关页面。
采用简明提要：术语加一句大意，保留关键条件和公式，不扩写成教材。
```

处理 PPT 或 PDF 时，可以补充“保留有助理解的结构图和公式图”；不需要时写“只要文字”。图片附件会随 Human Note 放在 `_assets/learning/`，AI Layer 只记录来源和定位。

## 6. Harness 验收

用同一份小资料分别运行一次较强 DeepSeek 模型和一次快速模型，检查：

- 是否只访问授权目录；
- 是否生成正式 Human Note 和 `index.json` / `cards/`；
- 是否使用已有笔记而不是每次新建同义页面；
- 是否保留公式条件、来源定位和可解析的 wikilink；
- 是否按“简明提要”避免教材式扩写；
- 是否把不确定内容暂存，而不是覆盖旧知识；
- 是否没有把中间 JSON、API Key 或运行日志写进 Human Note；
- 是否能在下一次添加资料时继续更新同一知识对象。

先用一份资料完成基准，再扩大到多个科目。WorkBuddy 的 Skill 触发、模型路由和权限行为属于 Harness 层，应在每个入口单独验证。
