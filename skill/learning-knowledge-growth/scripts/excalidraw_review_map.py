"""Chapter review map: an Excalidraw view of the AI layer's card relations.

usage: python -B excalidraw_review_map.py map-spec.json

Spec:
{ "title": "随机变量及其分布", "out": "<course>/复习地图-随机变量及其分布.excalidraw.md",
  "preview": "<run>/map-preview.svg",          # optional
  "cards": "<ai-root>/cards",                  # card JSON files with knowledgeId and relations
  "regions": [ {"title": "均匀分布与指数分布", "page": "均匀分布与指数分布", "cols": 2,
                "nodes": [ {"id": "<knowledgeId>", "label": "均匀分布", "hint": "f = 1/(b−a)",
                            "page": "<other note, optional>", "section": "<heading, optional>"} ]} ],
  "external": [ {"id": "<knowledgeId>", "label": "…", "hint": "…", "link": "[[note#heading]]"} ],
  "rowBreaks": [2],                            # optional: region indexes that start a new row;
                                               # without it, rows wrap at maxWidth (default 1500)
  "skip": [["<idA>", "<idB>"]] }               # relation pairs to leave out
Boxes link to the node's home section (node page, else region page; section from the node or the
card's first sectionRef). Arrows come only from card relations whose two ends are on the map, are
routed through the gutters between boxes, and carry the Chinese relation label. The script prints
boxCrossings and labelOverlaps; deliver only when both are 0 (reorder nodes, change cols/rowBreaks).
Leave out example and boundary cards; keep about 8–25 nodes per map.
"""
import json, sys, math, random, hashlib
from pathlib import Path

spec = json.loads(Path(sys.argv[1]).read_text(encoding='utf8'))
INK, MUTED = '#1e1e1e', '#868e96'
PALETTE = [('#4dabf7', '#e7f5ff'), ('#da77f2', '#f8f0fc'), ('#38d9a9', '#e6fcf5'), ('#ffa94d', '#fff4e6'),
           ('#ff8787', '#fff5f5'), ('#748ffc', '#edf2ff'), ('#69db7c', '#ebfbee'), ('#ffd43b', '#fff9db')]
LABEL = {'part-of': '属于', 'applies-to': '应用于', 'contrasts-with': '对比', 'related-to': '相关', 'exemplifies': '例证',
         'uses': '使用', 'prerequisite-to': '前提', 'specializes': '特例', 'special-case-of': '特例', 'generalizes': '推广',
         'approximates': '近似', 'refines': '细化', 'extends': '扩展', 'explains': '解释', 'simplifies': '简化', 'causes': '导致'}
PRIORITY = ['part-of', 'special-case-of', 'specializes', 'generalizes', 'prerequisite-to', 'explains', 'approximates',
            'applies-to', 'uses', 'refines', 'extends', 'simplifies', 'causes', 'contrasts-with', 'exemplifies', 'related-to']
REVERSE = {'generalizes': 'special-case-of'}  # draw "A generalizes B" as "B 特例 A"
W, H, GAP, PAD_T, PAD = 270, 100, 46, 64, 28
rng = random.Random(spec['title'])
els, counter = [], [0]


def eid(p):
    counter[0] += 1
    return f'{p}{counter[0]:03d}' + hashlib.md5(f"{spec['title']}{counter[0]}".encode()).hexdigest()[:5]


def base(t, x, y, w, h, stroke, **kw):
    e = dict(id=eid(t[0]), type=t, x=x, y=y, width=w, height=h, angle=0, strokeColor=stroke,
             backgroundColor='transparent', fillStyle='solid', strokeWidth=2, strokeStyle='solid', roughness=0,
             opacity=100, groupIds=[], frameId=None, roundness=None, seed=rng.randint(1, 2**31), version=1,
             versionNonce=rng.randint(1, 2**31), isDeleted=False, boundElements=None, updated=1, link=None, locked=False)
    e.update(kw); els.append(e); return e


def text(x, y, s, size, color=INK, align='left', container=None):
    w = max(sum(size if ord(c) > 255 else size * 0.56 for c in l) for l in s.split('\n'))
    return base('text', x, y, w, size * 1.25 * len(s.split('\n')), color, text=s, originalText=s, fontSize=size,
                fontFamily=2, textAlign=align, verticalAlign='middle' if container else 'top', containerId=container,
                lineHeight=1.25, baseline=round(size * 0.9))


def box(x, y, label, hint, link, stroke, dashed=False):
    r = base('rectangle', x, y, W, H, stroke, backgroundColor='#ffffff', roundness={'type': 3},
             strokeStyle='dashed' if dashed else 'solid', link=link, boundElements=[])
    t = text(0, 0, label + ('\n' + hint if hint else ''), 22, INK, 'center', container=r['id'])
    t['x'], t['y'] = x + (W - t['width']) / 2, y + (H - t['height']) / 2
    r['boundElements'].append({'id': t['id'], 'type': 'text'})
    return r


cards = {}
for p in Path(spec['cards']).glob('*.json'):
    c = json.loads(p.read_text(encoding='utf8')); cards[c['knowledgeId']] = c

# ---- layout regions in rows
nodes, regions, gx_lines, gy_lines, titles = {}, [], set(), set(), []
x, y, row_h, top = 40, 120, 0, 120
breaks = set(spec.get('rowBreaks', []))
max_w = spec.get('maxWidth', 1400) - ((W + GAP * 1.6) if spec.get('external') else 0)  # wrap regions into a new row past this width so the embedded map stays legible
for ri, reg in enumerate(spec['regions']):
    n = len(reg['nodes']); cols = min(reg.get('cols', 2), n); rows = math.ceil(n / cols)
    rw, rh = PAD * 2 + cols * W + (cols - 1) * GAP, PAD_T + PAD + rows * H + (rows - 1) * GAP
    if ri in breaks or (ri and 'rowBreaks' not in spec and x + rw > 40 + max_w):
        x, y = 40, y + row_h + GAP * 1.6; row_h = 0
    stroke, bg = PALETTE[ri % len(PALETTE)]
    base('rectangle', x, y, rw, rh, stroke, backgroundColor=bg, roundness={'type': 3}, opacity=60, link=f"[[{reg['page']}]]")
    tt = text(x + 20, y + 16, reg['title'], 24, stroke); titles.append(tt)
    regions.append((x, y, rw, rh, {nd['id'] for nd in reg['nodes']}))
    for k, nd in enumerate(reg['nodes']):
        c = cards[nd['id']]
        sec = nd.get('section') or (c.get('sectionRefs') or [''])[0].split('#')[-1]
        pg = nd.get('page') or reg['page']
        link = f"[[{pg}#{sec}]]" if sec else f"[[{pg}]]"
        nx, ny = x + PAD + (k % cols) * (W + GAP), y + PAD_T + (k // cols) * (H + GAP)
        nodes[nd['id']] = box(nx, ny, nd['label'], nd.get('hint', ''), link, INK)
        if k % cols: gx_lines.add(nx - GAP / 2)
        if k // cols: gy_lines.add(ny - GAP / 2)
    gx_lines.update({x - GAP * 0.8, x + rw + GAP * 0.8}); gy_lines.update({y - GAP * 0.8, y + rh + GAP * 0.8})
    x += rw + GAP * 1.6; row_h = max(row_h, rh)
ext = spec.get('external', [])
if ext:
    ex = max(r[0] + r[2] for r in regions) + GAP * 1.6
    for k, e in enumerate(ext):
        nodes[e['id']] = box(ex, top + PAD_T + k * (H + GAP), e['label'], e.get('hint', ''), e['link'], MUTED, dashed=True)
    gx_lines.add(ex - GAP * 0.8)
bottom = max(r[1] + r[3] for r in regions)


# ---- routing helpers
def center(r):
    return r['x'] + W / 2, r['y'] + H / 2


def exit_point(r, tx, ty):
    cx, cy = center(r); dx, dy = tx - cx, ty - cy
    s = min((W / 2 + 6) / abs(dx) if dx else 1e9, (H / 2 + 6) / abs(dy) if dy else 1e9)
    return cx + dx * s, cy + dy * s


def seg_hits_rect(p, q, r, m=6):
    x0, y0, x1, y1 = r['x'] - m, r['y'] - m, r['x'] + W + m, r['y'] + H + m
    (px, py), (qx, qy) = p, q
    t0, t1, dx, dy = 0.0, 1.0, qx - px, qy - py
    for pp, qq in ((-dx, px - x0), (dx, x1 - px), (-dy, py - y0), (dy, y1 - py)):
        if pp == 0:
            if qq < 0: return False
        else:
            t = qq / pp
            if pp < 0: t0 = max(t0, t)
            else: t1 = min(t1, t)
            if t0 > t1: return False
    return True


drawn_segs = []


def seg_hits_region(p, q, reg):
    rx, ry, rw, rh, _ = reg
    return _seg_rect(p, q, rx + 4, ry + 4, rx + rw - 4, ry + rh - 4)


def _seg_rect(p, q, x0, y0, x1, y1):
    (px, py), (qx, qy) = p, q
    t0, t1, dx, dy = 0.0, 1.0, qx - px, qy - py
    for pp, qq in ((-dx, px - x0), (dx, x1 - px), (-dy, py - y0), (dy, y1 - py)):
        if pp == 0:
            if qq < 0: return False
        else:
            tt = qq / pp
            if pp < 0: t0 = max(t0, tt)
            else: t1 = min(t1, tt)
            if t0 > t1: return False
    return True


def collinear_overlap(p, q, s, u, tol=7):
    if abs(p[0] - q[0]) < 1 and abs(s[0] - u[0]) < 1 and abs(p[0] - s[0]) < tol:
        return min(max(p[1], q[1]), max(s[1], u[1])) - max(min(p[1], q[1]), min(s[1], u[1])) > 10
    if abs(p[1] - q[1]) < 1 and abs(s[1] - u[1]) < 1 and abs(p[1] - s[1]) < tol:
        return min(max(p[0], q[0]), max(s[0], u[0])) - max(min(p[0], q[0]), min(s[0], u[0])) > 10
    return False


def cost(pts, a, b):
    segs = list(zip(pts, pts[1:]))
    hits = sum(seg_hits_rect(p, q, r) for p, q in segs for k, r in nodes.items() if k not in (a, b))
    hits += sum(_seg_rect(p, q, tt['x'] - 4, tt['y'] - 4, tt['x'] + tt['width'] + 4, tt['y'] + tt['height'] + 4) for p, q in segs for tt in titles)
    foreign = sum(seg_hits_region(p, q, reg) for p, q in segs for reg in regions if a not in reg[4] and b not in reg[4])
    shared = sum(collinear_overlap(p, q, s, u) for p, q in segs for s, u in drawn_segs)
    length = sum(math.dist(p, q) for p, q in segs)
    return hits, foreign + shared, length + 120 * (len(pts) - 2)


def route(a, b):
    ca, cb = center(nodes[a]), center(nodes[b])
    cands = [[]]
    for gx in gx_lines:
        cands.append([(gx, ca[1]), (gx, cb[1])])
    for gy in gy_lines:
        cands.append([(ca[0], gy), (cb[0], gy)])
    for gx in gx_lines:
        for gy in gy_lines:
            cands.append([(gx, ca[1]), (gx, gy), (cb[0], gy)])
            cands.append([(ca[0], gy), (gx, gy), (gx, cb[1])])
    best = None
    for via in cands:
        p0 = exit_point(nodes[a], *(via[0] if via else cb)); p1 = exit_point(nodes[b], *(via[-1] if via else ca))
        pts = [p0, *via, p1]
        c = cost(pts, a, b)
        if best is None or c < best[0]: best = (c, pts)
    return best


# ---- arrows from relations
pairs = {}
for cid, c in cards.items():
    for r in c.get('relations', []):
        a, b, t = cid, r.get('target') or r.get('targetKnowledgeId'), r['type']
        if t in REVERSE: a, b, t = b, a, REVERSE[t]
        if a in nodes and b in nodes and a != b and [a, b] not in spec.get('skip', []) and [b, a] not in spec.get('skip', []):
            key = frozenset((a, b)); cand = (PRIORITY.index(t) if t in PRIORITY else 99, a, b, t)
            pairs[key] = min(pairs.get(key, cand), cand)
crossings, label_overlaps = 0, 0
def overlap(a, b, m=2):
    return not (a['x'] + a['width'] + m < b['x'] or b['x'] + b['width'] + m < a['x'] or a['y'] + a['height'] + m < b['y'] or b['y'] + b['height'] + m < a['y'])
obstacles = list(nodes.values()) + titles
for _, a, b, t in sorted(pairs.values(), key=lambda v: (v[1], v[2])):
    (hits, _, _), pts = route(a, b); crossings += hits
    drawn_segs.extend(zip(pts, pts[1:]))
    p0 = pts[0]; rel = [[round(px - p0[0], 1), round(py - p0[1], 1)] for px, py in pts]
    xs, ys = [p[0] for p in rel], [p[1] for p in rel]
    ra, rb = nodes[a], nodes[b]
    e = base('arrow', p0[0], p0[1], max(xs) - min(xs), max(ys) - min(ys), MUTED, points=rel, lastCommittedPoint=None,
             startArrowhead=None, endArrowhead='arrow', startBinding={'elementId': ra['id'], 'focus': 0, 'gap': 6},
             endBinding={'elementId': rb['id'], 'focus': 0, 'gap': 6})
    ra['boundElements'].append({'id': e['id'], 'type': 'arrow'}); rb['boundElements'].append({'id': e['id'], 'type': 'arrow'})
    lab = text(0, 0, LABEL.get(t, '相关'), 20, '#495057')
    placed = False
    for i in sorted(range(len(pts) - 1), key=lambda i: -math.dist(pts[i], pts[i + 1])):
        for f in (0.5, 0.35, 0.65, 0.2, 0.8, 0.1, 0.9):
            mx, my = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f
            for ox, oy in ((5, -22), (5, 4), (-lab['width'] - 5, -22), (-lab['width'] - 5, 4), (-lab['width'] / 2, -10), (8, -10), (-lab['width'] - 8, -10)):
                lab['x'], lab['y'] = mx + ox, my + oy
                if not any(overlap(lab, o) for o in obstacles):
                    placed = True; break
            if placed: break
        if placed: break
    if not placed: label_overlaps += 1
    obstacles.append(lab)

text(40, 10, f"{spec['title']}：复习地图（Ctrl/Cmd + 悬停预览，点击打开对应小节）", 28)
text(40, bottom + GAP * 1.6, '节点与箭头来自 AI 层知识卡片的 relations；灰色虚线框是本章以外的相关页面。', 20, MUTED)

scene = dict(type='excalidraw', version=2, source='learning-knowledge-growth',
             elements=els, appState=dict(gridSize=None, viewBackgroundColor='#ffffff'), files={})
texts = '\n\n'.join(f"{e['text']} ^{e['id']}" for e in els if e['type'] == 'text')
Path(spec['out']).write_text("---\nexcalidraw-plugin: parsed\ntags: [excalidraw]\n---\n==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==\n\n"
                             f"# Excalidraw Data\n\n## Text Elements\n{texts}\n\n%%\n## Drawing\n```json\n{json.dumps(scene, ensure_ascii=False, indent=1)}\n```\n%%\n", encoding='utf8')

# ---- preview
if spec.get('preview'):
    sys.path.insert(0, str(Path(__file__).parent))
    from render_excalidraw_preview import to_svg
    Path(spec['preview']).write_text(to_svg(els), encoding='utf8')
sys.path.insert(0, str(Path(__file__).parent))
from lint_excalidraw_layout import lint
font = lint(els, spec.get('displayWidth', 1000))
print(json.dumps({'nodes': len(nodes), 'arrows': len(pairs), 'boxCrossings': crossings, 'labelOverlaps': label_overlaps,
                  'sceneWidth': font['sceneWidth'], 'smallText': sum('renders at about' in f for f in font['fails'])}, ensure_ascii=False))
