# Benchmark

Input cases, human-authored Gold data, and reviewed results.

## Subdirectories

| Directory | Contents | Tracked? |
| --- | --- | --- |
| `cases/` | Benchmark inputs and their metadata | Yes |
| `gold/` | Human-authored reference answers | Yes, once authored by a human |
| `results/` | Reviewed results promoted from `runs/` | Yes |

## Categories to cover (`AGENTS.md` §10)

Normal conceptual lessons; noisy ASR; missing source information; conflicting
sources; teacher analogies; teacher opinions; problem-solving tips;
mathematics/formula-heavy material; repeated existing knowledge; genuine
corrections to old knowledge.

## Hard rules

1. **Human Gold data must not be fabricated by the agent.** Where Gold data does
   not exist, create a placeholder or a `TODO` — never an invented reference
   answer (`AGENTS.md` §10 and §16).
2. Cases are versioned inputs. Editing a case invalidates prior comparisons
   recorded against it.
3. Source variation and prompt variation are tested **separately**. Multiple
   major variables must not change silently in one comparison (`AGENTS.md` §9).
4. Large generated outputs belong in `runs/`, not here.

## Status

已有一个 `ey-campus-demo-v0.1` 开发合成 fixture，用于验证增量生长、来源覆盖和双链检查；
它不是赛事提供的模拟数据，不能直接作为正式比赛输入。对应 Gold 仍是
`NEEDS_HUMAN_AUTHORING` 占位文件，当前没有可提交的 Gold 或已审核结果。
大型 benchmark suite 仍不在当前里程碑范围内。
