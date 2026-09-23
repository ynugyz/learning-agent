# REAL_CASE_001 ChangePlan Human Review

## Summary

- total teaching modules = 28
- ACTIONABLE modules = 9
- NOOP_KEEP modules = 3
- BLOCKED_REVIEW modules = 16
- resolved mutations = 8
- blocked target count = 1
- target files count = 3
- shared target files count = 1
- collision status = ORDER_DEPENDENT（AI导论920.md 的 m18/m19 anchor）

## Module → disposition → target → operation → anchor → delta → risk → status

| module | Alignment decision | Plan disposition | Target | Operation | Anchor | Delta summary | Risk | Status |
|---|---|---|---|---|---|---|---|---|
| m03 | LINK | ACTIONABLE | 人工智能能力与图灵测试.md | BLOCKED_LINK_ENDPOINT_UNRESOLVED | — | LINK endpoint unresolved; no mutation. | BLOCKED_LINK_ENDPOINT_UNRESOLVED | BLOCKED_LINK_ENDPOINT_UNRESOLVED |
| m04 | EXPAND | ACTIONABLE | AI导论920.md | APPEND_TO_SECTION | # AI导论920：三大流派与知识表达 > ## 原有课堂速记（保留） > ### 如何实现人工智能？ > #### 差异 | 补充三大学派作为主要实现路线的总纲定位，并保持“用规则教 / 用数据学 / 用问题引导”的课堂记忆链。 | none | ACTIONABLE |
| m05 | EXPAND | ACTIONABLE | 人工智能发展史与关键突破.md | APPEND_TO_SECTION | # 人工智能发展史与关键突破 > ## 研究路线（课堂分类，边界经整理） | 补充符号主义以数学逻辑为根基、早期规则推理占主导及规则不可穷尽这一课堂解释。 | none | ACTIONABLE |
| m06 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | ASR/terminology risk; “memory”与知识图谱的关系及“推理逻辑没落”需要人工核对，不能据相似词直接扩展。 | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m07 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | ASR and notational risk affect names, dates and formula-adjacent claims; competing candidate notes need adjudication. | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m08 | EXPAND | ACTIONABLE | AI导论920.md | APPEND_TO_SECTION | # AI导论920：三大流派与知识表达 > ## 原有课堂速记（保留） > ### 如何实现人工智能？ > #### 行为学派 | 补充行为主义通过问题引导、环境反馈学习，并把婴儿学步明确标为课堂类比。 | none | ACTIONABLE |
| m09 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | ASR-suspect units and broad synthesis make the scope of the claimed fusion uncertain. | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m10 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | teacher-opinion content is not a settled factual claim; review before any refinement. | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m11 | EXPAND | ACTIONABLE | AI导论920.md | APPEND_TO_SECTION | # AI导论920：三大流派与知识表达 > ## 原有课堂速记（保留） > ### 如何实现人工智能？ > #### 人工智能的实现 | 补充混合增强形态中的 skill、插件、Harness、Agent 组件，以及机械臂/外骨骼等载体作为课堂展望。 | none | ACTIONABLE |
| m12 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | RETRIEVAL_INCONCLUSIVE: exact and broader metadata search produced no adequate subject match; cannot promote to NEW. | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m13 | KEEP | NOOP_KEEP | — | NOOP_KEEP | — | Alignment KEEP is final for this stage; no mutation. | NOOP_KEEP | NOOP_KEEP |
| m14 | LINK | ACTIONABLE | AI技术路线与金融应用.md | ADD_WIKILINK | # AI技术路线与金融应用 > ## 连接与复习 | 在方法论笔记的连接区建立教师领域定位建议与人工智能导论课程 MOC 的关系链接。 | asr-suspect | ACTIONABLE |
| m15 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | teacher opinion plus ASR-suspect and needs-human-review evidence; do not merge into a subject page. | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m17 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | ASR-suspect and formula risk; the equivalence claim needs human adjudication. | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m18 | EXPAND | ACTIONABLE | AI导论920.md | INSERT_NEW_SECTION | # AI导论920：三大流派与知识表达 > ## 知识表达与推理 | 补充规则写死难以扩展，以及知识表达问题转向集合之间寻找映射的课堂解释。 | asr-suspect, compression-loses-meaning | ACTIONABLE |
| m19 | EXPAND | ACTIONABLE | AI导论920.md | INSERT_NEW_SECTION | # AI导论920：三大流派与知识表达 > ## 知识表达与推理 | 补充从关系网、多步关系传递到图结构抽象的入门铺垫。 | terminology-unstable | ACTIONABLE |
| m20 | KEEP | NOOP_KEEP | — | NOOP_KEEP | — | Alignment KEEP is final for this stage; no mutation. | NOOP_KEEP | NOOP_KEEP |
| m21 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | formula and notational risk plus ASR-suspect units make the examples and table reconstruction unsafe without review. | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m22 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | RETRIEVAL_INCONCLUSIVE: candidate hits are lexical false positives; do not call NEW. | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m23 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | NO_MATCH_AFTER_ADEQUATE_RETRIEVAL 未被证明；窄词零命中不足以证明 Vault 中不存在该知识，且源证明公式缺失，无法可靠 identity match。 | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m24 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | ASR-suspect and formula risk affect the formal examples; review before EXPAND. | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m25 | EXPAND | ACTIONABLE | AI导论920.md | APPEND_TO_SECTION | # AI导论920：三大流派与知识表达 > ## 知识表达与推理 > ### 知识图谱推理 | 补充由逻辑表示转向知识图谱的课堂动机、实体—关系—实体定义和关系示例边界。 | asr-suspect | ACTIONABLE |
| m26 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | 知识对象身份成立，但 proposed delta 依赖 ASR / compression-loses-meaning 风险，因此不得自动扩展旧知识。 | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m27 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | RETRIEVAL_INCONCLUSIVE plus ASR/formula risk; no NEW. | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m28 | KEEP | NOOP_KEEP | — | NOOP_KEEP | — | Alignment KEEP is final for this stage; no mutation. | NOOP_KEEP | NOOP_KEEP |
| m29 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | identity is clear but source reliability is insufficient for an automatic KEEP/REFINE decision. | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m30 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | suspected conflict with existing note; compression-loses-meaning risk requires review. | BLOCKED_REVIEW | BLOCKED_REVIEW |
| m31 | REVIEW | BLOCKED_REVIEW | — | BLOCKED_REVIEW | — | ASR-suspect, formula and needs-human-review evidence; conditional-independence wording is internally inconsistent. | BLOCKED_REVIEW | BLOCKED_REVIEW |

详述见 CHANGE_PLAN_REPORT.md 与 change-plan.draft.json。

## 重点人工审核

### A. 多 existingKnowledgeRefs 的 target selection

- m05：选择人工智能发展史与关键突破.md 作为历史路线 canonical target；AI导论920.md 不重复写入同一历史增量。
- 其他 EXPAND 均选择单一 canonical target；没有因为多个 existingKnowledgeRefs 而复制 delta。

### B. LINK endpoint

- m14：linkFrom = AI技术路线与金融应用.md，linkTo = 人工智能导论 MOC.md，relationIntent = teacher_advice_related_to_course_domain。
- m03：BLOCKED_LINK_ENDPOINT_UNRESOLVED；缺少合法第二端点，不强造新页。

### C-D. Shared target / anchor overlap

- AI导论920.md 共享 m04、m08、m11、m18、m19、m25。
- 只有 m18/m19 共享父 anchor；collisionStatus = ORDER_DEPENDENT。
- Writer transaction 顺序要求 m18 先于 m19；m25 使用知识图谱推理子 anchor。

### E. Delta duplication

每个 mutation 只有一个 sourceAlignmentModuleRefs 与一个 canonical target。m19 的图结构导入、m25 的知识图谱正式定义被分开，禁止重复写入。

### F. Risk boundary

contentRequirements 只描述最终内容必须表达什么。公式缺失、ASR 不确定人名/年份、教师观点和 REVIEW module 内容均列入 forbiddenClaims 或保持阻断。

### G. REVIEW mutation check

16 个 REVIEW 全部为 BLOCKED_REVIEW，mutationIds = 0，downstream 不允许 mutation。

### H. KEEP mutation check

3 个 KEEP 全部为 NOOP_KEEP，mutationIds = 0。

## Preconditions

所有实际 mutation 都绑定 TARGET_BASELINE_MANIFEST.json 中的 SHA-256。执行时 hash 变化必须产生 STALE_PLAN，不得 silent rebase。

## Stop boundary

本阶段只生成 executable intent prototype，不执行 ChangePlan，不调用 Writer，不创建 Candidate Vault，不修改生产 Vault。
