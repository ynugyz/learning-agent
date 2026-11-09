---
id: ai-index-builder
version: 1
status: active
---

# AI Index Builder v1

将已有 Human Notes、当前 LessonModel、SourceMap、Alignment 和 ChangePlan 编译为紧凑的 AI 检索层。AI 层用于定位、对齐和增量更新，不是人类笔记的副本。

## 输入顺序

1. 先读课程 `index.json`；
2. 只读与本次 lesson objects 匹配的知识卡片；
3. 再打开卡片指定的 Human Note 章节；
4. 只有需要确认来源、冲突或缺失信息时才读取原始 evidence。

## 输出要求

更新课程索引，并为本次涉及的对象创建或更新卡片。每张卡片至少包含：

- 稳定 `knowledgeId`；
- `canonicalTerm` 和已有别名；
- `knowledgeRole`；
- 一到两句 `semanticCore`；
- 可检索的 `keyClaims`；
- 真实存在的 `sectionRefs`；
- `humanNoteRef`；
- `sourceRefs`；
- 有意义的关系及目标 `knowledgeId`；
- uncertainty/open items；
- maintenance state 和 fingerprint。

## 选择规则

- 先匹配已有对象，再决定 NEW；
- 同一对象的新课堂内容更新原卡片和原页面章节；
- 相关但不同的对象保留独立身份，用关系连接；
- 证据不足时标记 deferred，不把推测写成 key claim；
- 不复制完整 Markdown、转写段落、课堂叙事、公式长篇解释或复习正文；
- 不创建没有来源或没有真实目标的关系；
- 不删除最新来源未提及的旧对象。

返回机器层 JSON，不输出 Human Note 正文。所有路径、章节锚点、来源引用和关系目标都必须可解析或明确标记 unresolved。
