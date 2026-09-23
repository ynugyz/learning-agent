# REAL_CASE_001 ChangePlan Collision Report

## File mutation groups

### Mine/learn/AI/学校课程/人工智能导论/AI导论920.md

- mutationIds：mut-m04, mut-m08, mut-m11, mut-m18, mut-m19, mut-m25
- collisionStatus：ORDER_DEPENDENT
- anchorOverlap：mut-m18 ↔ mut-m19
- deltaDuplication：false
- mutationInvalidationRisk：false
- canMergeTransaction：true
- analysis：m18 and m19 share the parent knowledge-expression anchor but add distinct logic-mapping and graph-abstraction deltas. Process m18 before m19; keep m25 at the graph-inference child anchor.

### Mine/learn/AI/学校课程/人工智能导论/人工智能发展史与关键突破.md

- mutationIds：mut-m05
- collisionStatus：NONE
- anchorOverlap：none
- deltaDuplication：false
- mutationInvalidationRisk：false
- canMergeTransaction：true
- analysis：Single mutation; no file collision.

### Mine/learn/AI/学校课程/人工智能导论/AI技术路线与金融应用.md

- mutationIds：mut-m14
- collisionStatus：NONE
- anchorOverlap：none
- deltaDuplication：false
- mutationInvalidationRisk：false
- canMergeTransaction：true
- analysis：Single wikilink mutation at the connection section.

## Collision conclusions

- AI导论920.md：m18/m19 使用同一 parent heading，但 delta 不重复；需按 m18 → m19 顺序在一个 transaction 处理。
- AI导论920.md：m04/m08/m11/m25 的 anchors 不重叠；保持同一 transaction 仍可一次生成 diff。
- 人工智能发展史与关键突破.md、AI技术路线与金融应用.md 各只有一个 mutation，状态为 NONE。
- m03 没有进入 mutation group，因为 link endpoint 未解析。

MERGEABLE 只表示 Writer 后续可在同一 transaction 处理，不表示现在合并正文。
