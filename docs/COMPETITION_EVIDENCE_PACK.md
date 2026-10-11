# 参赛证据包执行清单

本文件把比赛计划转换成一次可以照着执行的证据收集流程。比赛条款只来自用户提供的《安永校园AI创新挑战赛.pdf》；下面的目录、命令和内部目标是项目管理约定，不是赛事官方格式。

## 1. 证据包目录

正式准备时，在仓库外建立一个私有目录；不要把报名凭证、个人信息或未授权材料提交到 Git：

```text
competition-pack-private/
├─ registration/
│  ├─ registration-proof.*
│  └─ eligibility-proof.*
├─ official-input/
│  ├─ source-materials/
│  └─ provenance.md
├─ benchmark-review/
│  ├─ case-01-gold.md
│  ├─ case-02-gold.md
│  └─ case-03-gold.md
├─ runs/
│  ├─ initial/
│  └─ follow-up/
├─ presentation/
│  ├─ slides.*
│  ├─ demo-script.md
│  └─ recording.*
└─ submission/
   ├─ final-manifest.md
   └─ upload-proof.*
```

## 2. 必须人工确认的门

只有参赛者能完成以下事项；Agent 只能提供表格和检查：

| 门 | 人工动作 | 证据 |
| --- | --- | --- |
| H1 赛道与资格 | 确认个人赛、报名状态和资格证明 | `registration/` |
| H2 数据 | 保存赛事提供的模拟数据及来源说明 | `official-input/` |
| H3 原创与授权 | 确认原创、著作权、非商用展示和案例收录安排 | 书面记录 |
| H4 Gold | 为三个开发案例写出“必须保留/允许变化/不可生成” | `benchmark-review/` |
| H5 结果 | 审阅 Human Note、AI 层、链接、公式、deferred 和 diff | 两次 run 记录 |
| H6 提交 | 确认格式、时间、上传渠道并保存凭证 | `submission/` |

没有对应证据时，状态必须保持 `PENDING_HUMAN_REVIEW`，不能在答辩中说“已完成”。

## 3. 两次演示的固定顺序

### 首次运行

1. 使用赛事模拟数据和有限已有知识快照。
2. 运行 `learning-knowledge-growth`。
3. 保存输入哈希、Skill 版本、模型环境和运行清单。
4. 保存 Human Note、AI `index.json`、知识卡片和验证报告。
5. 人工确认定义、机制、公式、例子、边界、方法和链接是否来自材料。

### 增量运行

1. 输入同主题的第二份模拟材料。
2. 复用第一次的 Human / AI 输出目录。
3. 保存更新前后的 diff 和新的输入哈希。
4. 人工确认旧的有效内容保留，新增内容进入正确页面，重复内容没有制造孤立页。
5. 展示一项证据不足内容如何保留为 deferred，并说明回退位置。

## 4. 每次运行必须保存的最小记录

```text
run-manifest.json
input-hashes.txt
human-output/
ai-output/
validation-report.md
change-diff.md
human-review.md
rollback-check.md
```

`human-review.md` 至少写明：审阅人、审阅时间、接受/拒绝的页面、未解决项和是否允许写入个人 Vault。正式演示默认只展示隔离输出，不直接修改 Production Vault。

## 5. 公开前的确定性检查

在仓库根目录执行：

```powershell
npm run check
npm test
npm run typecheck
git diff --check
Get-FileHash dist/learning-knowledge-growth.skill.zip -Algorithm SHA256
```

然后人工确认：

- Git 中没有真实课程笔记、录音、个人信息、API Key 或未授权素材；
- 所有答辩数字都能回到 `run-manifest.json` 和验证报告；
- 公开分支、版本号和许可证已经决定；
- README 没有把开发合成 fixture 当作赛事模拟数据；
- Codex 辅助披露文字与实际分工一致。

## 6. 当前状态

- 个人赛、资格和 Codex 披露边界：已由参赛者在对话中确认，凭证仍需人工保存。
- 开发合成案例：已建立三个子案例骨架；Gold 仍为 `NEEDS_HUMAN_AUTHORING`。
- 赛事正式模拟数据：尚未放入仓库，也不能由 Agent 代替提供。
- 两次正式演示结果、人工审阅、视频和上传凭证：尚未完成。

因此当前项目是“比赛准备中、可复演材料已就位”，尚不能声称“已完成正式提交”。
