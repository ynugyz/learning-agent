# Learning Agent 统一投喂工作区

把课堂转写拖到仓库根目录的 `run-learning-inbox.cmd`，系统会：

1. 把原始文件保存到 `inbox/`；
2. 根据文件名尝试选择课程 profile；
3. 使用该课程的旧笔记白名单运行完整编译；
4. 把本次结果保存到 `runs/<run-id>/`。

文件名包含“宏观经济学”“Java”“会计”“人工智能”等课程名时会自动选择对应 profile。
新科目可以在命令行直接把 Vault 中的科目文件夹传入：

```powershell
.\tools\run-learning-inbox.ps1 -Transcript "D:\课堂转写\第一讲.txt" `
  -CourseFolder "D:\Basical App\Work App\Obsidian\Obsidian Vault\Mine\learn\新科目"
```

系统会从这个明确指定的文件夹中自动挑选少量 Markdown 笔记作为本次快照，并立即开始处理。
无法判断科目时会停止并提示补充课程名，避免把笔记写入错误课程。

这个目录可以整体放进同步盘，在另一台电脑上继续使用。生产 Obsidian Vault 仍然只读，
候选笔记需要确认后再复制回 Vault。
