# EY Campus AI Challenge Demo Fixture v0.1

这是一个仅用于开发和内部演示的 **development_synthetic_fixture**，内容为纯合成材料，不包含真实课堂录音、个人笔记、企业资料或个人信息。

## 用途

本案例用于演示 Learning Agent 的一次增量知识生长流程：

1. 第一次输入：从一段带口语重复、公式和边界说明的合成转写中，扩展一页已有知识。
2. 第二次输入：只增加一个有来源的新例子，检查系统是否继续更新同一知识对象，而不是重新创建重复页面。
3. 最终输出：同时生成 Human layer 和 AI layer，并保留来源、链接、验证状态与待人工判断事项。

## 输入文件

- `sources/lesson-01-transcript.txt`：第一次输入。
- `sources/lesson-02-follow-up.txt`：第二次补充输入。
- `sources/knowledge-snapshot/01-present-value.md`：已有知识页的合成快照。
- `sources/knowledge-snapshot/02-opportunity-cost.md`：用于链接解析的相关合成知识页。
- `sources/knowledge-snapshot/03-finance-basics-moc.md`：用于课程范围链接解析的合成 MOC。

文件中的人物、课程、数字和表述均为演示构造，不应当被当作现实事实。只有在人工确认比赛规则、公开权限和最终演示包内容后，才可以将其纳入参赛材料。

## 这个案例要观察什么

- 能否从 evidence 中保留定义、公式、变量含义、例子和边界。
- 能否保留已有页中的有效内容，并在有证据时扩展相应小节。
- 能否将已加载的相关页面转换为可解析的 Obsidian 双链。
- 第二次输入是否命中同一知识对象，并形成可解释的增量变化。
- 缺少证据时是否标记为 deferred，而不是自行补充教材知识。
- Human layer 与 AI layer 是否能够通过稳定 ID、section anchor 和 provenance 相互定位。

## 不包含的内容

本案例不包含预设的正确 LessonModel、Alignment、ChangePlan 或最终笔记。模型输出不能直接当作 Gold。

人工 Gold 占位位于 `benchmark/gold/ey-campus-demo-v0.1.json`。只有人工完成标注并复核后，才可以将它用于评分。

## 人工完成项

- [ ] 确认哪些定义、公式、例子和边界必须保留。
- [ ] 确认已有页中哪些内容是有效内容，不能被静默删除。
- [ ] 确认第二次输入应当扩展同一对象还是创建新对象。
- [ ] 确认每条关系和双链是否具有实际学习意义。
- [ ] 确认任何课堂简化、缺失证据或不确定表述的处理方式。
- [ ] 在公开演示前确认合成材料和输出可以公开。
