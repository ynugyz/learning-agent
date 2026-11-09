# Learning Agent 可编辑工作区

这里是日常优化内容的工作区，不是审计报告目录。把需要整理的资料、已有成果和修改意见放在这里，
直接编辑 Markdown 即可。

## 建议用法

```text
workspace/
├─ inbox/       原始转写、PPT、PDF 或其它资料
├─ references/  想保留的已有笔记、示例和风格参考
├─ drafts/      正在修改的工作稿
├─ output/      觉得可以交付的人类笔记
└─ ai/          给后续检索使用的机器层资料
```

本目录中的文件可以随时手工编辑、替换或重新组织。需要优化时，在聊天中调用
`$learning-knowledge-growth`，并说明：

```text
请读取 workspace/inbox/ 和 workspace/references/。
以 workspace/drafts/ 中的内容为工作稿，按已有优秀笔记的结构优化。
把最终人类笔记放入 workspace/output/，机器层放入 workspace/ai/。
保留已有有效内容，只根据提供的材料补充和重组。
```

如果某次结果满意，再由你手动复制到 Obsidian Vault；如果还需要调整，就继续编辑
`drafts/`，不必重新建立整个项目。

## 当前可编辑入口

- [EDITABLE_WORKSPACE.md](EDITABLE_WORKSPACE.md)：记录本次想优化的内容和目标。
- `inbox/`：投放资料。
- `references/`：放参考笔记。
- `drafts/`：修改工作稿。
- `output/`：保存最终人类笔记。
- `ai/`：保存机器层索引和知识卡片。

临时文件可以留在这里，不需要为了每一次修改建立新的课程目录。
