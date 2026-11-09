"""Build a clean Obsidian Excalidraw figure from a small JSON spec, then lint it.

usage: python -B excalidraw_figure.py spec.json --out-dir <dir> [--preview preview.svg] [--display-width 900]

Use it for coordinate planes, computed curves, curve shifts, number lines, side-by-side panels
and small labelled schematics. Every coordinate inside a "plot" is a math coordinate; the tool maps
it to the canvas, so curves come from formulas instead of hand-placed pixels.

Spec (all keys optional unless marked):
{
  "name": "汇率市场供求",                       # required: file stem, writes <name>.excalidraw.md
  "elements": [
    {"kind": "plot", "x": 80, "y": 120, "w": 380, "h": 260, "xrange": [0, 1], "yrange": [0, 1],
     "xlabel": "Q", "ylabel": "P", "title": "人民币资产市场", "subtitle": "需求右移",
     "curves":   [{"expr": "0.9 - 0.8*x", "from": 0.1, "to": 0.9, "color": "blue", "label": "D₁", "dashed": false}],
     "segments": [{"from": [0.3, 0.7], "to": [0.45, 0.7], "color": "red", "arrow": true, "label": "右移"}],
     "points":   [{"at": [0.5, 0.5], "color": "ink", "label": "E₁", "guides": true}],
     "xticks": [[0.5, "Q₁"]], "yticks": [[0.5, "P₁"]], "axes": "corner"},     # axes: corner | origin
    {"kind": "box", "id": "a", "x": 0, "y": 0, "w": 220, "h": 80, "text": "先验概率", "color": "blue", "fill": "light"},
    {"kind": "arrow", "from": "a", "to": "b", "label": "更新"},
    {"kind": "text", "x": 0, "y": 0, "text": "…", "size": 22, "color": "muted", "align": "center"},
    {"kind": "line", "points": [[0, 0], [100, 0]], "color": "ink", "dashed": false, "arrow": false},
    {"kind": "dot", "x": 0, "y": 0, "color": "red", "r": 7}
  ]
}
Colours: ink, muted, blue, red, green, orange, purple, grey, or a #hex. Box fill: light | none | #hex.
Expressions use x and the math module names (sin, exp, log, log2, sqrt, pi, e …); nothing else.
Captions, sources and "示意图" notes belong under the embed in Markdown, not inside the figure.
"""
import argparse, hashlib, json, math, random, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

INK, MUTED = '#1e1e1e', '#868e96'
COLORS = {'ink': INK, 'muted': MUTED, 'blue': '#1971c2', 'red': '#e03131', 'green': '#2f9e44', 'orange': '#e8590c',
          'purple': '#9c36b5', 'grey': '#adb5bd'}
LIGHT = {'#1971c2': '#e7f5ff', '#e03131': '#fff5f5', '#2f9e44': '#ebfbee', '#e8590c': '#fff4e6', '#9c36b5': '#f8f0fc', INK: '#f8f9fa', MUTED: '#f8f9fa'}
MATH = {k: getattr(math, k) for k in dir(math) if not k.startswith('_')}
col = lambda c, d=INK: COLORS.get(c, c) if c else d


def text_width(s, size):
    return max(sum(size if ord(ch) > 255 else size * 0.56 for ch in line) for line in s.split('\n'))


class Scene:
    def __init__(self, name):
        self.name, self.els, self.n, self.ids = name, [], 0, {}
        self.rng = random.Random(name)

    def _id(self, p):
        self.n += 1
        return f'{p}{self.n:03d}' + hashlib.md5(f'{self.name}{self.n}'.encode()).hexdigest()[:5]

    def base(self, t, x, y, w, h, stroke, **kw):
        e = dict(id=self._id(t[0]), type=t, x=round(x, 2), y=round(y, 2), width=round(w, 2), height=round(h, 2), angle=0,
                 strokeColor=stroke, backgroundColor='transparent', fillStyle='solid', strokeWidth=2, strokeStyle='solid',
                 roughness=0, opacity=100, groupIds=[], frameId=None, roundness=None, seed=self.rng.randint(1, 2**31),
                 version=1, versionNonce=self.rng.randint(1, 2**31), isDeleted=False, boundElements=None, updated=1,
                 link=None, locked=False)
        e.update(kw); self.els.append(e); return e

    def line(self, pts, color=INK, dashed=False, arrow=False, width=2):
        x0, y0 = pts[0]
        rel = [[round(px - x0, 2), round(py - y0, 2)] for px, py in pts]
        xs, ys = [p[0] for p in rel], [p[1] for p in rel]
        return self.base('arrow' if arrow else 'line', x0, y0, max(xs) - min(xs), max(ys) - min(ys), color, strokeWidth=width,
                         strokeStyle='dashed' if dashed else 'solid', points=rel, lastCommittedPoint=None, startBinding=None,
                         endBinding=None, startArrowhead=None, endArrowhead='arrow' if arrow else None)

    def text(self, x, y, s, size=22, color=INK, align='left', container=None):
        w, h = text_width(s, size), size * 1.25 * len(s.split('\n'))
        if not container:
            x -= w / 2 if align == 'center' else w if align == 'right' else 0
        return self.base('text', x, y, w, h, color, text=s, originalText=s, fontSize=size, fontFamily=2, textAlign=align,
                         verticalAlign='middle' if container else 'top', containerId=container, lineHeight=1.25,
                         baseline=round(size * 0.9))

    def _clear(self, box, ignore=()):
        from lint_excalidraw_layout import seg_hits, text_box
        for e in self.els:
            if e['id'] in ignore or e.get('containerId'): continue
            if e['type'] == 'text':
                b = text_box(e)
                if box[0] < b[2] and b[0] < box[2] and box[1] < b[3] and b[1] < box[3]: return False
            elif e['type'] in ('line', 'arrow'):
                pts = [(e['x'] + a, e['y'] + c) for a, c in e['points']]
                if any(seg_hits(pts[k], pts[k + 1], box, m=-3) for k in range(len(pts) - 1)): return False
            elif e['type'] in ('rectangle', 'ellipse', 'diamond'):
                if box[0] < e['x'] + e['width'] and e['x'] < box[2] and box[1] < e['y'] + e['height'] and e['y'] < box[3]: return False
        return True

    def place(self, x, y, s, size, color, offsets):
        """Put a label at the first offset (dx, dy, align) whose box touches no line, text or shape."""
        w, h = text_width(s, size), size * 1.25 * (s.count(chr(10)) + 1)
        for dx, dy, al in offsets:
            left = x + dx - (w / 2 if al == 'center' else w if al == 'right' else 0)
            if self._clear((left, y + dy, left + w, y + dy + h)):
                return self.text(x + dx, y + dy, s, size, color, al)
        for r in (30, 44, 60, 80):                     # fallback: search a ring of positions around the anchor
            for k in range(16):
                a = math.pi * 2 * k / 16 - math.pi / 2
                cx, cy = x + r * math.cos(a), y + r * math.sin(a)
                if self._clear((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)):
                    return self.text(cx, cy - h / 2, s, size, color, 'center')
        dx, dy, al = offsets[0]
        return self.text(x + dx, y + dy, s, size, color, al)

    def dot(self, x, y, color=INK, r=6):
        return self.base('ellipse', x - r, y - r, 2 * r, 2 * r, color, backgroundColor=color)

    def box(self, bid, x, y, w, h, s, color=INK, fill='light', size=22):
        bg = LIGHT.get(color, '#f8f9fa') if fill == 'light' else ('transparent' if fill in (None, 'none') else fill)
        r = self.base('rectangle', x, y, w, h, color, backgroundColor=bg, roundness={'type': 3}, boundElements=[])
        t = self.text(0, 0, s, size, INK, 'center', container=r['id'])
        t['x'], t['y'] = x + (w - t['width']) / 2, y + (h - t['height']) / 2
        r['boundElements'].append({'id': t['id'], 'type': 'text'})
        self.ids[bid] = r
        return r

    def connect(self, a, b, label=None, color=INK, dashed=False):
        ra, rb = self.ids[a], self.ids[b]
        ca = (ra['x'] + ra['width'] / 2, ra['y'] + ra['height'] / 2)
        cb = (rb['x'] + rb['width'] / 2, rb['y'] + rb['height'] / 2)

        def edge(r, c, tgt):
            dx, dy = tgt[0] - c[0], tgt[1] - c[1]
            s = min((r['width'] / 2 + 8) / abs(dx) if dx else 1e9, (r['height'] / 2 + 8) / abs(dy) if dy else 1e9)
            return c[0] + dx * s, c[1] + dy * s
        p, q = edge(ra, ca, cb), edge(rb, cb, ca)
        e = self.line([p, q], color, dashed, arrow=True)
        e['startBinding'] = {'elementId': ra['id'], 'focus': 0, 'gap': 8}
        e['endBinding'] = {'elementId': rb['id'], 'focus': 0, 'gap': 8}
        ra['boundElements'].append({'id': e['id'], 'type': 'arrow'}); rb['boundElements'].append({'id': e['id'], 'type': 'arrow'})
        if label:
            mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
            dx, dy = q[0] - p[0], q[1] - p[1]
            L = math.hypot(dx, dy) or 1
            nx, ny = -dy / L, dx / L
            w = text_width(label, 20)
            off = 14 + (abs(nx) * w / 2) + (abs(ny) * 13)
            self.place(mx, my - 12, label, 20, MUTED, [(nx * off, ny * off, 'center'), (-nx * off, -ny * off, 'center'),
                                                      (nx * off * 1.6, ny * off * 1.6, 'center'), (-nx * off * 1.6, -ny * off * 1.6, 'center')])
        return e

    # ---- plots
    def plot(self, sp):
        ox, oy, w, h = sp['x'], sp['y'], sp['w'], sp['h']
        (x0, x1), (y0, y1) = sp.get('xrange', [0, 1]), sp.get('yrange', [0, 1])
        X = lambda v: ox + w * (v - x0) / (x1 - x0)
        Y = lambda v: oy + h - h * (v - y0) / (y1 - y0)
        if sp.get('title'): self.text(ox + w / 2, oy - 70 - (34 if sp.get('subtitle') else 0), sp['title'], 26, INK, 'center')
        if sp.get('subtitle'): self.text(ox + w / 2, oy - 66, sp['subtitle'], 22, COLORS['red'], 'center')
        if sp.get('axes', 'corner') == 'origin':
            ax, ay = X(min(max(0, x0), x1)), Y(min(max(0, y0), y1))
            self.line([(X(x0), ay), (ox + w + 10, ay)], arrow=True); self.line([(ax, oy + h), (ax, oy - 10)], arrow=True)
        else:
            ax, ay = ox, oy + h
            self.line([(ox, oy + h), (ox + w + 10, oy + h)], arrow=True); self.line([(ox, oy + h), (ox, oy - 10)], arrow=True)
        if sp.get('xlabel'): self.text(ox + w + 18, ay - 14, sp['xlabel'], 20, MUTED)
        if sp.get('ylabel'): self.text(ax + 8, oy - 42, sp['ylabel'], 20, MUTED)
        for v, lab in sp.get('xticks', []):
            self.line([(X(v), ay - 5), (X(v), ay + 5)], INK); self.text(X(v), ay + 10, str(lab), 20, MUTED, 'center')
        for v, lab in sp.get('yticks', []):
            self.line([(ax - 5, Y(v)), (ax + 5, Y(v))], INK); self.text(ax - 10, Y(v) - 13, str(lab), 20, MUTED, 'right')
        for cv in sp.get('curves', []):
            f = eval(compile(f'lambda x: {cv["expr"]}', 'expr', 'eval'), {'__builtins__': {}}, MATH)  # noqa: S307 - local, math names only
            a, b, n = cv.get('from', x0), cv.get('to', x1), cv.get('samples', 120)
            pts, seg = [], []
            for i in range(n + 1):
                xv = a + (b - a) * i / n
                try:
                    yv = f(xv)
                except (ValueError, ZeroDivisionError, OverflowError):
                    yv = None
                if yv is None or not (y0 - (y1 - y0) * 0.02 <= yv <= y1 + (y1 - y0) * 0.02):
                    if len(seg) > 1: pts.append(seg)
                    seg = []; continue
                seg.append((X(xv), Y(yv)))
            if len(seg) > 1: pts.append(seg)
            c = col(cv.get('color'), COLORS['blue'])
            for s in pts: self.line(s, c, cv.get('dashed', False), width=cv.get('width', 4))
            if cv.get('label') and pts:
                lx, ly = pts[-1][-1]
                first = [(cv['dx'], cv['dy'], 'left')] if 'dx' in cv or 'dy' in cv else []
                self.place(lx, ly, cv['label'], 22, c, first + [(10, -14, 'left'), (10, -34, 'left'), (10, 4, 'left'), (-10, -40, 'right'), (-10, 10, 'right')])
        for sg in sp.get('segments', []):
            c = col(sg.get('color'))
            (a, b), (cx, cy) = sg['from'], sg['to']
            self.line([(X(a), Y(b)), (X(cx), Y(cy))], c, sg.get('dashed', False), sg.get('arrow', False), sg.get('width', 3))
            if sg.get('label'):
                self.text((X(a) + X(cx)) / 2 + sg.get('dx', 0), min(Y(b), Y(cy)) + sg.get('dy', -34), sg['label'], 20, c, 'center')
        for pt in sp.get('points', []):
            c = col(pt.get('color'))
            px, py = X(pt['at'][0]), Y(pt['at'][1])
            if pt.get('guides'):
                self.line([(px, py), (px, ay)], c, dashed=True, width=1); self.line([(px, py), (ax, py)], c, dashed=True, width=1)
            self.dot(px, py, c, pt.get('r', 7))
            if pt.get('label'):
                first = [(pt['dx'], pt['dy'], pt.get('align', 'left'))] if 'dx' in pt or 'dy' in pt else []
                self.place(px, py, pt['label'], 22, c, first + [(12, -34, 'left'), (12, 6, 'left'), (-12, -34, 'right'), (-12, 6, 'right'),
                                                               (0, -44, 'center'), (0, 14, 'center'), (18, -14, 'left'), (-18, -14, 'right')])

    def build(self, spec):
        for el in spec['elements']:
            k = el['kind']
            if k == 'plot': self.plot(el)
            elif k == 'box': self.box(el['id'], el['x'], el['y'], el.get('w', 220), el.get('h', 80), el['text'], col(el.get('color')), el.get('fill', 'light'), el.get('size', 22))
            elif k == 'arrow': self.connect(el['from'], el['to'], el.get('label'), col(el.get('color')), el.get('dashed', False))
            elif k == 'text': self.text(el['x'], el['y'], el['text'], el.get('size', 22), col(el.get('color')), el.get('align', 'left'))
            elif k == 'line': self.line([tuple(p) for p in el['points']], col(el.get('color')), el.get('dashed', False), el.get('arrow', False), el.get('width', 2))
            elif k == 'dot': self.dot(el['x'], el['y'], col(el.get('color')), el.get('r', 6))
            else: raise SystemExit(f'unknown element kind: {k}')

    def markdown(self):
        scene = dict(type='excalidraw', version=2, source='learning-knowledge-growth', elements=self.els,
                     appState=dict(gridSize=None, viewBackgroundColor='#ffffff'), files={})
        texts = '\n\n'.join(f"{e['text']} ^{e['id']}" for e in self.els if e['type'] == 'text')
        return ("---\nexcalidraw-plugin: parsed\ntags: [excalidraw]\n---\n"
                "==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==\n\n"
                f"# Excalidraw Data\n\n## Text Elements\n{texts}\n\n%%\n## Drawing\n```json\n"
                f"{json.dumps(scene, ensure_ascii=False, indent=1)}\n```\n%%\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('spec'); ap.add_argument('--out-dir', required=True); ap.add_argument('--preview')
    ap.add_argument('--display-width', type=int, default=900)
    a = ap.parse_args()
    spec = json.loads(Path(a.spec).read_text(encoding='utf8'))
    s = Scene(spec['name']); s.build(spec)
    out = Path(a.out_dir) / f"{spec['name']}.excalidraw.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(s.markdown(), encoding='utf8', newline='\n')
    here = Path(__file__).parent
    sys.path.insert(0, str(here))
    from lint_excalidraw_layout import lint  # noqa: E402
    report = lint(s.els, a.display_width)
    if a.preview:
        from render_excalidraw_preview import to_svg  # noqa: E402
        Path(a.preview).write_text(to_svg(s.els), encoding='utf8')
    print(json.dumps({'file': str(out), **report}, ensure_ascii=False, indent=1))
    sys.exit(1 if report['status'] == 'FAIL' else 0)


if __name__ == '__main__':
    main()
