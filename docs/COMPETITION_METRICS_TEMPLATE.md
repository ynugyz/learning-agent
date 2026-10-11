# 比赛指标记录模板 / Competition Metrics Record

> 版本：Competition Metrics Template v0.1
> 使用范围：`COMPETITION_DEMO_RUNBOOK.md` 的两次增量演示。
> 比赛条款、资格、赛道和数据纪律唯一依据是用户提供的《安永校园AI创新挑战赛.pdf》；仓库当前 `learning-knowledge-growth` Skill 和实际运行证据只用于说明产品运行与复现。
> 重要：空白字段不能当作零；没有证据的指标保持 `UNKNOWN`，不能在答辩中口头补成估计值。

## 1. 参赛上下文 / Competition Context

| 字段 | 记录 |
| --- | --- |
| `case_id` | `[填写]` |
| `track` | `PERSONAL` / `TEAM` / `UNKNOWN` |
| `track_confirmation_evidence` | `[人工确认文件或记录路径]` |
| `team_size` | `[个人填 1；团体填 2--4；未知填 UNKNOWN]` |
| `eligibility_confirmed_by_human` | `YES` / `NO` / `UNKNOWN` |
| `originality_confirmed_by_human` | `YES` / `NO` / `UNKNOWN` |
| `pdf_source` | `安永校园AI创新挑战赛.pdf` |
| `pdf_path` | `[本地只读路径]` |
| `data_policy_confirmed_by_human` | `YES` / `NO` / `UNKNOWN` |
| `data_type` | `competition_simulated_data` / `development_synthetic_fixture` / `UNKNOWN` |
| `public_release_consent` | `YES` / `NO` / `UNKNOWN` |
| `last_updated_utc` | `[填写]` |

PDF 明确了目标学生、个人/团体赛形式、赛道主题、个人赛推荐与禁止方向、导师/奖项与人才激励、原创与数据安全、知识产权安排；它没有提供统一量化评分表。因此下面指标是产品内部验收数据，不是官方评分权重。

## 2. 版本与输入证据 / Reproducibility

| 字段 | 第一次运行 | 第二次运行 |
| --- | --- | --- |
| `run_id` | `[填写]` | `[填写]` |
| `run_started_utc` | `[填写]` | `[填写]` |
| `run_finished_utc` | `[填写]` | `[填写]` |
| `elapsed_ms` | `[实际值]` | `[实际值]` |
| `git_commit` | `[填写]` | `[填写]` |
| `skill_version_or_hash` | `[填写]` | `[填写]` |
| `codex_model_environment` | `[实际环境]` | `[实际环境]` |
| `prompt_or_skill_source` | `[路径/版本]` | `[路径/版本]` |
| `schema_versions` | `[如实际记录]` | `[如实际记录]` |
| `input_manifest_path` | `[路径]` | `[路径]` |
| `input_count` | `[数量]` | `[数量]` |
| `input_paths` | `[逐项列出]` | `[逐项列出]` |
| `input_sha256` | `[逐项列出]` | `[逐项列出]` |
| `seed_note_paths` | `[逐项列出]` | `[沿用或列出]` |
| `seed_note_sha256` | `[逐项列出]` | `[沿用或列出]` |
| `human_output_root` | `[演示沙盒路径]` | `[同一目录]` |
| `ai_output_root` | `[演示沙盒路径]` | `[同一目录]` |
| `manifest_path` | `[路径]` | `[路径]` |
| `validation_report_path` | `[路径]` | `[路径]` |
| `human_review_path` | `[路径]` | `[路径]` |
| `production_vault_written` | `NO` / `UNKNOWN` | `NO` / `UNKNOWN` |

如果当前 Skill 或 Codex 环境没有提供某字段，记录 `UNKNOWN` 并说明原因；不得用常数或经验值填充。

## 3. 结果计数 / Output Counts

| 指标 | 第一次运行 | 第二次运行 | 证据路径 |
| --- | ---: | ---: | --- |
| Human pages created | `[数量]` | `[数量]` | `[Human 输出或 manifest]` |
| Human pages updated | `[数量]` | `[数量]` | `[diff]` |
| Human pages unchanged | `[数量]` | `[数量]` | `[report]` |
| AI index records | `[数量]` | `[数量]` | `[index.json]` |
| AI cards | `[数量]` | `[数量]` | `[cards/]` |
| page relations added/updated | `[数量]` | `[数量]` | `[index.json/diff]` |
| source references | `[数量]` | `[数量]` | `[manifest/AI layer]` |
| deferred items | `[数量]` | `[数量]` | `[validation/report]` |
| unresolved references | `[数量]` | `[数量]` | `[validation]` |
| unsupported validation errors | `[数量]` | `[数量]` | `[validation]` |
| model calls | `[实际可见值/UNKNOWN]` | `[实际可见值/UNKNOWN]` | `[runtime report]` |
| input/output tokens | `[实际可见值/UNKNOWN]` | `[实际可见值/UNKNOWN]` | `[runtime report]` |

“模型调用数”“Token”“耗时”只有在运行记录中实际可见时才填写；不能从页面数量反推。

## 4. 人工 Gold 覆盖记录 / Human Gold Coverage

Gold 必须由参赛者人工确认。Agent 只能整理表格、匹配来源和计算比例，不能自行制造正确答案。

先在 `expected/` 为每个案例列出知识单元，每行一个可判断项目：

| `gold_id` | 类型 | 简述 | 是否必须出现 | 来源/允许依据 | 实际结果 | 判断 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `gold-001` | 定义/机制/公式/例子/边界/方法/比较/易错点 | `[人工填写]` | `YES`/`NO` | `[source ref 或 seed note]` | `[输出位置]` | `PRESENT`/`PARTIAL`/`MISSING`/`UNSUPPORTED` | `[路径#anchor]` |
| `gold-002` | `[填写]` | `[填写]` | `[填写]` | `[填写]` | `[填写]` | `[填写]` | `[填写]` |

计算：

```text
source_coverage = 正确保留的必需 Gold 单元数 / 必需 Gold 单元总数
```

判定说明：

- `PRESENT`：内容存在，且与人工 Gold 的范围一致；
- `PARTIAL`：只覆盖一部分，需记录缺口；
- `MISSING`：材料支持但没有进入结果；
- `UNSUPPORTED`：结果出现了 Gold 和输入均不支持的内容，应进入问题清单；
- 公式缺失、板书缺失或术语不稳应标记 `MISSING`/`DEFERRED`，不能用模型常识补齐后判定为通过。

## 5. 两层输出质量指标 / Human and AI Layer Metrics

以下是内部指标，不是安永 PDF 的官方评分。每一项都要填数值、分母定义和证据路径。

| 指标 | 定义 | 第一次 | 第二次 | 目标/解释 | 证据 |
| --- | --- | ---: | ---: | --- | --- |
| `source_coverage` | 必需 Gold 单元中被正确保留的比例 | `[0--1/UNKNOWN]` | `[0--1/UNKNOWN]` | 由 Gold 决定；无 Gold 不计算 | `[Gold + review]` |
| `provenance_coverage` | 分子=有来源或有效旧笔记依据的新增知识块；分母=全部新增知识块 | `[0--1/UNKNOWN]` | `[0--1/UNKNOWN]` | 内部目标 1.0；不得无证据通过 | `[manifest/cards]` |
| `valid_content_preservation` | 分子=仍保留的人工标注旧有效单元；分母=运行前人工标注旧有效单元 | `[0--1/UNKNOWN]` | `[0--1/UNKNOWN]` | 内部目标 1.0 | `[old/new diff]` |
| `wikilink_resolution` | 分子=目标可解析的新双链；分母=新增双链总数 | `[0--1/UNKNOWN]` | `[0--1/UNKNOWN]` | 内部目标 1.0 | `[validation]` |
| `unsupported_claim_rate` | 分子=无法追溯的新增断言；分母=新增断言总数 | `[0--1/UNKNOWN]` | `[0--1/UNKNOWN]` | 内部目标 0 | `[claim audit]` |
| `incremental_match_rate` | 第二次应更新既有对象且实际命中的比例 | `N/A` | `[0--1/UNKNOWN]` | 只能依据第二次 Gold 计算 | `[AI diff + Gold]` |
| `deferred_evidence_rate` | 分子=标记 deferred 的证据不足候选项；分母=全部候选项 | `[0--1/UNKNOWN]` | `[0--1/UNKNOWN]` | 不是越高越好；需结合审阅说明 | `[report]` |
| `formula_delimiter_pass` | 数学定界符检查是否通过 | `PASS/FAIL` | `PASS/FAIL` | 必须能复现 | `[validation]` |
| `rollback_success` | 是否能恢复运行前状态 | `PASS/FAIL/UNKNOWN` | `PASS/FAIL/UNKNOWN` | 演示前至少验证一次 | `[backup/diff]` |
| `human_review_time_min` | 人工从结果到接受/退回的实际分钟数 | `[实测/UNKNOWN]` | `[实测/UNKNOWN]` | 仅记录，不预设节省比例 | `[review log]` |

### 5.1 覆盖和溯源审计表

| `claim_or_block_id` | 输出页面/卡片 | 类型 | 来源引用 | 既有有效笔记引用 | 可追溯 | 人工结论 |
| --- | --- | --- | --- | --- | --- | --- |
| `[填写]` | `[路径#anchor]` | `[定义等]` | `[source#span]` | `[note#anchor]` | `YES/NO` | `ACCEPT/REPAIR/DEFER/REJECT` |

### 5.2 增量差异表

| `object_id` | 第一次位置 | 第二次位置 | 变化类型 | 第二次材料来源 | 是否保留旧内容 | 是否人工接受 |
| --- | --- | --- | --- | --- | --- | --- |
| `[填写]` | `[path#anchor]` | `[path#anchor]` | `EXPAND/REFINE/RELATION/NEW/NO_CHANGE/DEFERRED` | `[source#span]` | `YES/NO` | `YES/NO/PENDING` |

## 6. 安全与公开检查 / Safety and Release Gate

| 检查 | 状态 | 证据 | 人工签名/日期 |
| --- | --- | --- | --- |
| 只使用赛事模拟数据；其它材料有主办方书面确认 | `PASS/FAIL/UNKNOWN` | `[manifest/confirmation]` | `[填写]` |
| 未包含企业或客户真实敏感数据 | `PASS/FAIL/UNKNOWN` | `[scan/review]` | `[填写]` |
| 未包含个人生产 Vault 或真实课堂材料 | `PASS/FAIL/UNKNOWN` | `[path review]` | `[填写]` |
| 未包含 API Key、访问令牌或密码 | `PASS/FAIL/UNKNOWN` | `[secret scan]` | `[填写]` |
| 作品原创、无代做或外购成品 | `PASS/FAIL/UNKNOWN` | `[human statement]` | `[填写]` |
| Codex/外部工具使用边界已确认 | `PASS/FAIL/UNKNOWN` | `[赛事沟通记录]` | `[填写]` |
| 学生作品著作权与安永非商用展示授权已确认 | `PASS/FAIL/UNKNOWN` | `[人工确认]` | `[填写]` |
| 所有截图、附件和链接已人工脱敏 | `PASS/FAIL/UNKNOWN` | `[release review]` | `[填写]` |

PDF 明确要求原创、仅使用赛事模拟数据、不得使用或传播企业/客户真实敏感数据，并说明学生著作权和安永非商用展示/案例收录使用权安排。没有人工确认时，公开发布状态必须保持 `BLOCKED_BY_HUMAN_GATE`。

## 7. 运行结论 / Run Conclusion

```yaml
run_status: NOT_STARTED
first_run_status: UNKNOWN
second_run_status: UNKNOWN
validation_status: UNKNOWN
human_review_status: PENDING
public_release_status: BLOCKED_BY_HUMAN_GATE
production_vault_written: NO
unsupported_claim_rate: UNKNOWN
source_coverage: UNKNOWN
provenance_coverage: UNKNOWN
valid_content_preservation: UNKNOWN
wikilink_resolution: UNKNOWN
incremental_match_rate: UNKNOWN
```

### 结论写作模板

> 本次演示使用 `[data_type]`，输入为 `[input paths]`，运行版本为 `[commit/Skill hash]`。第一次运行 `[结果]`，第二次运行 `[结果]`。实测 `source_coverage=[值]`、`provenance_coverage=[值]`、`valid_content_preservation=[值]`、`wikilink_resolution=[值]`、`unsupported_claim_rate=[值]`、`incremental_match_rate=[值]`，证据分别见 `[paths]`。未测量的项目保持 `UNKNOWN`。Production Vault 写入状态为 `[NO/UNKNOWN]`。公开或正式提交仍需通过人工数据、原创、授权和赛道确认门。

不要写成“提高了 X%”“节省了 Y Token”“完全自动化”，除非两次运行和基准对照的原始证据已经存在并可复核。

## 8. 最小提交前证据包

完成一次可复演演示后，至少保留：

- 两次输入及其 SHA-256；
- 两次 run manifest 和验证报告；
- 第一次 Human Note 与 AI index/cards；
- 第二次 Human Note diff 与 AI index/cards diff；
- 人工 Gold 与覆盖清单；
- 人工 review 记录和回退证据；
- 安全/原创/授权检查表；
- 本模板填写后的指标文件；
- 公开包文件清单与最终 hash。

这些证据只能在人工审阅通过后进入公开仓库或比赛提交包。比赛表单、视频上传、授权确认和最终提交始终由参赛者人工完成。
