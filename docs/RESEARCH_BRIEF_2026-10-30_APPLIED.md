# 2026-10-30 研究简报落地记录

本轮只把研究简报转成 Skill 的运行规则，不新增知识表、图数据库或模型调用阶段。

## 已落地

- **证据先于摘要**：用稳定来源 ID、原始定位和必要相邻片段组装临时证据包；先满足定义、条件、公式、边界和不确定性覆盖，再做 token 裁剪。
- **确定性增量预筛选**：在 Alignment/ChangePlan 前比较对象身份、任务范围、来源/定位哈希、Human Note 哈希、AI 卡片哈希、解释深度和依赖哈希；缺失或过期时继续完整判断。
- **非破坏式变更**：ChangePlan 默认提出添加、收窄范围、加关系、标注不确定性或针对性纠正；不因新资料未提及就删除旧内容。
- **摘要回溯**：AI 卡片只负责路由；高层语义摘要仍需回到原始片段核对。
- **可测对照**：WorkBuddy Harness 增加“全量判断 vs 预筛选”对照要求，记录调用量、token、评估数量和必要更新召回；出现漏更新就停用预筛选。

## 未采用

- 没有新增 SourceMap、LessonModel、Alignment 或 ChangePlan 字段。
- 没有把 AI Layer 扩成第二份 Human Note。
- 没有引入图数据库、永久证据包、逐次运行历史或新的外部模型服务。

## 参考

本记录依据用户提供的《Learning Agent 每周研究简报》；相关原始研究入口包括：

- https://arxiv.org/abs/2610.34673
- https://arxiv.org/abs/2610.36967
- https://arxiv.org/abs/2610.37443
- https://arxiv.org/abs/2610.22668
- https://arxiv.org/abs/2610.02002

这些研究结果只作为工程假设和实验方向，不被当作 Learning Agent 已完成的效果证明。
