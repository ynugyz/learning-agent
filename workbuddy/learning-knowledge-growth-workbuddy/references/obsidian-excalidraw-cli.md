# Obsidian Excalidraw 原生工作方式

这份说明把 Excalidraw 当作 Obsidian 中的可编辑场景，而不是一张外部图片。规则依据 Excalidraw for Obsidian 的原生 CLI/agent skill，以及社区中对绑定关系的实现方式整理；它不把另一套 Agent Skill 当成运行时依赖。

## 优先级

这份文件只讲怎样通过 Obsidian 创建和编辑场景。画什么、画成什么样、质量底线和交互模型，先读 [visuals-and-excalidraw.md](visuals-and-excalidraw.md)。

1. **坐标图、函数曲线、曲线移动、数轴、多面板对比、复习地图**：按来源公式计算点位，生成本地 `.excalidraw.md`。标签避开线和文字；CLI 的方框、标签、箭头基本元素不会替你算曲线。
2. **带标签的小型示意图和编辑已有场景**：Obsidian 正在运行、版本支持 Excalidraw CLI（通常要求 API 1.12.2+）并且插件已启用时，优先用原生 CLI / ExcalidrawAutomate。CLI 的序列化器会把简化的 `label`、`start`、`end` 转换为真实的文字容器和箭头绑定。
3. **已接入的 Excalidraw MCP/App**：只在宿主确实提供该工具时调用；工具返回的场景必须保存为 Obsidian 可打开的文件，并把手绘风格改为 `roughness: 0`。
4. **手写本地文件**：以上都不适用时才手写 `.excalidraw.md` 或 legacy `.excalidraw`，并执行本文件的绑定校验；不能只拼出几何位置相邻的元素。

无论哪条路径，交付前都用宿主的图片预览看一眼，再检查绑定一致性。

不要安装第二套 Excalidraw CLI，也不要在没有工具时声称已经实时操作 Obsidian 画布。

## 原生 CLI 的最小流程

先确认目标 Vault 和能力，不要假定当前活动画布：

```text
obsidian vault="<vault>" obsidian-excalidraw-plugin:help
obsidian vault="<vault>" obsidian-excalidraw-plugin:schema action=create
```

创建时使用 Vault-relative 的精确路径，并优先使用 `.excalidraw.md`：

```json
{
  "apiVersion": 1,
  "command": "create",
  "requestId": "bayes-flow-create-1",
  "path": "Drawings/Bayes-Flow.excalidraw.md",
  "elements": [
    {"id":"prior","type":"rectangle","x":0,"y":0,"width":220,"height":90,"label":{"text":"先验概率"}},
    {"id":"posterior","type":"rectangle","x":340,"y":0,"width":220,"height":90,"label":{"text":"后验概率"}},
    {"id":"arrow-1","type":"arrow","x":220,"y":45,"start":{"id":"prior"},"end":{"id":"posterior"}}
  ]
}
```

然后按固定顺序操作：

1. `create`，记录返回的 `idMap` 和 `revision`；
2. `open` 或明确指定 `path`；
3. `read source=live detail=elements`，确认实际元素和绑定；
4. 修改时使用 `apply`，携带 `expectedRevision`、唯一 `requestId` 和实际 ID；
5. 检查返回的 `ok`、`mutation` 和 `persistence`，只有 `persistence=saved` 才算写入完成；
6. 需要预览时再 `export` 为 SVG/PNG，并检查导出图；导出不会替代可编辑源文件。

遇到 `STALE_REVISION` 先重新读取；遇到 `BUSY` 只用同一个 requestId 重试；未知结果必须先 read-back，不能直接重复写入。

## 场景绑定规则

### 形状与文字

形状（`rectangle`、`diamond`、`ellipse` 等）和其标签是两个元素，但必须互相声明：

- 形状的 `boundElements` 包含 `{ "id": "<text-id>", "type": "text" }`；
- 文字的 `containerId` 指向形状 ID；
- 文字的 `x/y/width/height` 位于形状内部，不能只是画在旁边；
- 形状移动时，标签应随容器移动。

### 箭头与形状

箭头与两个端点必须双向绑定：

- 箭头有 `startBinding` 和/或 `endBinding`，每项指向目标形状 ID；
- 每个绑定形状的 `boundElements` 都反向列出该箭头；
- `points` 必须从起点实际延伸到终点，不能只靠视觉上相交；
- 无明确关系时不画箭头；普通自由箭头可以没有绑定，但不能把“应该连接”画成自由箭头。

如果手写 JSON，只允许在没有原生 CLI/MCP 时这样做，并在交付前使用宿主可用的 Excalidraw 场景校验器。

## Obsidian 内嵌预览

Human Note 直接嵌入可编辑文件：

```markdown
![[Drawings/Bayes-Flow.excalidraw.md|1000x700]]
```

也可使用 `.excalidraw` legacy 文件：

```markdown
![[Drawings/Bayes-Flow.excalidraw|1000x700]]
```

这类 `![[...]]` 是 Obsidian 的嵌入预览，会显示场景并保留跳转到源图的能力。不要把图先导出成 PNG，再把 PNG 当成唯一成果；PNG/SVG 只能作为兼容性预览或分享附件。需要局部预览时使用 Excalidraw 支持的 `#^elementId`、`area=` 或 `group=` 语法，但只有真实存在的元素 ID 才能引用。

## 与 Learning Agent 的对应

- DiagramIR 只描述来源支持的节点、关系、布局方向和不确定项；不包含坐标。
- Human layer 保存 `.excalidraw.md` 和正文中的 `![[...]]`；可选导出图也放在同一 Human 资产目录。
- AI layer 只保存 `assetRef`、哈希、来源定位和对应知识对象，不保存 base64 或整份场景。
- 生成图必须能回到一个 Human Note 小节和至少一个 SourceMap 定位。
- 如果图中关系无法从资料确认，保留“待确认”或不画，不用常识补箭头。

## 来源

- Excalidraw for Obsidian 原生 CLI 与 portable agent skill：<
- Obsidian-compatible 自动布局与绑定生成器（MIT）：<
- Excalidraw MCP：<
