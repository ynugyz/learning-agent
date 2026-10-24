# 公开发布准备审查

本文记录 Learning Agent 当前仓库在公开发布或提交比赛材料前的发布检查结果。
比赛规则只依据参赛者提供的《安永校园AI创新挑战赛.pdf》；本文不以网络资料补充比赛要求。

## 当前状态

截至 2026-10-11，最新产品内容位于 `codex/knowledge-compilation` 分支。该分支包含
可安装的 `learning-knowledge-growth` Skill、双语 README、验证工具和测试，但远程仓库的
默认 `main` 仍停留在早期初始提交。公开发布前必须由仓库维护者把确认后的内容合并或明确
设置公开分支；只把当前分支的链接发给评审，不能假定默认首页已经包含这些内容。

当前 Skill ZIP：

```text
dist/learning-knowledge-growth.skill.zip
SHA-256: F5A88691B8B87B96FD8631986C04136B4C3E637FD98AD7F2E131815FA6C0446A
```

ZIP 当前只包含 Skill 运行所需的 `SKILL.md`、`agents/openai.yaml`、四个
`references/` 文件和可选的 `scripts/attach_source_image.py` 附件工具。发布前下载后应重新计算哈希，并确认压缩包内没有运行日志、课程笔记、
生产 Vault 文件或凭据。

WorkBuddy 本地资料适配包（当前版本 `0.2.1`）位于 `dist/learning-knowledge-growth.workbuddy.skill.zip`，包内使用 WorkBuddy 所需的中英文
frontmatter，不包含 `agents/openai.yaml`。它由 `tools/build-workbuddy-skill.mjs` 从当前 Skill 语义生成，验证时应检查
WorkBuddy frontmatter、`@references/` 路由、顶层目录结构和 ZIP 内容清单。它是只处理附件和授权目录的 Skill-only 包；知识库连接器不随基础 ZIP 打包，避免安装时申请外部服务能力。

```text
WorkBuddy ZIP SHA-256: 22E957A7BEE49DAE1894B53BFB8D7B707759DA2C371D2C1A0130380A83CB6871
```

## 已核对项目

| 项目 | 当前结果 | 发布判断 |
| --- | --- | --- |
| README | 已有中文/英文使用说明、安装、双层产物、边界和反馈方式 | 可作为用户入口；发布分支仍需确认 |
| Skill ZIP | 已跟踪，内容范围小，结构可安装；已在 `runs/clean-skill-install-20261011/` 做隔离安装烟测 | 可发布；发布时保留哈希 |
| 测试与检查 | `npm run check`、类型检查和现有测试在最近变更后通过 | 每次发布前重跑 |
| 凭据 | 追踪文件未发现真实 API key；`.env.example` 只有空值或变量名 | 继续禁止提交真实密钥 |
| 生产 Vault | 仓库未打包生产 Markdown 或 AI 索引 | 保持此边界 |
| npm 元数据 | `private: true`、`license: UNLICENSED`、版本仍为 `0.0.0` | 不作为 npm 包发布；许可证和版本由维护者确认 |
| 旧 DSH 文档 | 当前工作树中的旧运行手册未纳入公开提交 | 不要把旧 DSH 流程包装成当前 Skill 的必需依赖 |

## 发布阻塞项

### P0：清理配置中的个人路径

已发现的实验配置和 ChangePlan 包含本机路径、微信目录标识、真实转写文件名、生产 Obsidian
Vault 页面和课程知识。它们已从 Git 索引移出，工作区中的本地副本保存在被忽略的
`workspace/private-config-backup-20261011/`，因此旧实验文件没有被删除；公开提交不会再携带
这些内容。历史实验如需复现，应在本机使用备份，并按当前公开 fixture 重新建立配置。

提交前仍需检查 `git ls-files` 和 secret hygiene，确认这些文件没有重新被加入公开索引。

**历史暴露阻塞：**旧提交和远程历史可能仍包含已移出的个人路径或课程内容。本项目不自动改写
历史，也不 force-push；公开发布前必须由仓库维护者决定是否使用经过人工审查的新发布分支，或
按 GitHub 的敏感信息处置流程清理历史。

### P0：确认公开分支

当前 README 安装示例指向 `codex/knowledge-compilation`，而远程默认 `main` 仍是旧初始提交。
维护者必须人工确认评审入口：合并至 `main`、将该分支设为默认分支，或在报名材料中明确提供
经过检查的分支/tag。不要在没有检查 CI 和文件差异的情况下强制推送或重写历史。

### P1：许可证与版本

当前 `package.json` 仍为私有开发包（`private: true`、`UNLICENSED`）。这不妨碍直接展示
Skill，但若要把仓库作为真正的开源项目供他人复用，维护者需要人工选择许可证、版本号和
发布方式。本文不替维护者选择许可证，也不把比赛 PDF 中的“原创”和“非商用展示/案例收录”
条款解释成软件许可证。

## 安永 PDF 对应的发布边界

参赛者已确认报名个人赛并具备参赛资格。根据 PDF，个人赛适合以“用 AI 解决真实学习/生活痛点”的效率工具参赛；Learning Agent
可以展示资料整理、知识连接和增量更新。提交演示应只使用赛事提供的模拟数据；不要把真实课堂录音、
生产 Vault、个人路径和密钥放入提交包。其它数据类型不能从本 PDF 推出获准使用。作品应由报名主体独立完成，不应
使用外部商业付费成品直接参赛。最终报名赛道、资格、原创声明、数据授权和提交方式需要参赛者
人工确认；本仓库不替参赛者完成报名或授权签署。

## 发布前执行顺序

1. 人工确认参赛赛道和作品命名。
2. 处理上面的 P0 个人路径配置，并在干净检出中复查历史和当前文件。
3. 确认公开分支/tag，并检查 README 中的安装链接和命令。
4. 运行 `npm ci`、`npm run check`、`npm test` 和 `git diff --check`。
5. 重新生成或确认 Skill ZIP，计算 SHA-256，检查 ZIP 内容清单。
6. 用全新临时目录安装 Skill（隔离安装烟测已完成），再使用仓库内 `development_synthetic_fixture` 完成一次可复演的开发运行；它不代表 PDF 允许的正式竞赛输入。
7. 确认演示只展示正式 Human Note、AI 索引、来源和验证结果；不展示候选历史文件或个人实验路径。
8. 人工完成报名表、视频/幻灯片上传、原创声明与数据授权确认。

说明：Skill 是供 Codex 执行的说明与参考包，不是本地 Node runner。仅靠仓库命令不能生成可信的 Human/AI 端到端结果；正式演示必须在可访问该 Skill 和输入材料的 Codex 环境中完成，并保存运行证据。

## 不应随发布包公开的内容

- 生产 Obsidian Vault、个人课程笔记和未脱敏课堂转写；
- `scratch/real-case-001/` 的历史 ChangePlan 与 `configs/real-case-001-*.json` 私有配置；
- `runs/`、`scratch/`、`workspace/` 中的运行输出；
- API key、`.env`、访问令牌和本机凭据；
- 未经整理的旧 DSH/低成本模型运行手册；
- 没有人工确认的 Gold benchmark 或“正确答案”。
