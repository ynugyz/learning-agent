"""Layout lint for an Obsidian Excalidraw scene: catches figures that pass structural validation but read badly.

usage: python -B lint_excalidraw_layout.py <scene.excalidraw.md|.excalidraw> [--display-width 900]

FAIL  text that will be smaller than about 12 px at the display width; free text overlapping other text;
      free text crossed by a line or arrow.
WARN  boxes stuffed with text (more than 4 lines or about 60 characters); captions or source notes drawn
      inside the figure; the hand-drawn style (roughness > 0); a box-and-arrow-only figure (check whether
      the learning question needs coordinates or curves, or whether Mermaid or a table is enough).
compressed-json scenes are decoded first.
"""
import argparse, json, re, sys
from pathlib import Path

KEY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
CAPTION = re.compile(r'示意图|据课堂|未按比例|来源[:：]|数据来源|图注')


def lz_decompress_base64(s):
    """Decode the plugin's compressed-json (LZString.compressToBase64)."""
    data = [KEY.index(c) for c in re.sub(r'\s', '', s)]
    if not data: return ''
    st = {'pos': 32, 'val': data[0], 'idx': 1}

    def read(n):
        r, p = 0, 1
        for _ in range(n):
            bit = st['val'] & st['pos']; st['pos'] >>= 1
            if st['pos'] == 0:
                st['pos'] = 32; st['val'] = data[st['idx']] if st['idx'] < len(data) else 0; st['idx'] += 1
            r |= (1 if bit else 0) * p; p <<= 1
        return r
    dic, enlarge, size, nbits = {}, 4, 4, 3
    c = read(2)
    if c == 2: return ''
    w = chr(read(8 if c == 0 else 16)); dic[3] = w; out = [w]
    while True:
        c = read(nbits)
        if c in (0, 1):
            dic[size] = chr(read(8 if c == 0 else 16)); size += 1; c = size - 1; enlarge -= 1
        elif c == 2:
            return ''.join(out)
        if enlarge == 0: enlarge = 2 ** nbits; nbits += 1
        entry = dic[c] if c in dic else w + w[0]
        out.append(entry); dic[size] = w + entry[0]; size += 1; enlarge -= 1; w = entry
        if enlarge == 0: enlarge = 2 ** nbits; nbits += 1


def load_elements(path):
    t = Path(path).read_text(encoding='utf8')
    m = re.search(r'```json\s*\n(.*?)\n```', t, re.S)
    if m: return json.loads(m.group(1))['elements']
    m = re.search(r'```compressed-json\s*\n(.*?)\n```', t, re.S)
    if m: return json.loads(lz_decompress_base64(m.group(1)))['elements']
    return json.loads(t)['elements']


def text_box(e):
    size = e.get('fontSize', 20)
    lines = e.get('text', '').split('\n')
    w = max(sum(size if ord(ch) > 255 else size * 0.56 for ch in l) for l in lines)
    h = size * e.get('lineHeight', 1.25) * len(lines)
    x = e['x'] + (e['width'] - w) / 2 if e.get('textAlign') == 'center' else e['x'] + e['width'] - w if e.get('textAlign') == 'right' else e['x']
    return x, e['y'], x + w, e['y'] + h


def seg_hits(p, q, box, m=2):
    x0, y0, x1, y1 = box[0] + m, box[1] + m, box[2] - m, box[3] - m
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


def lint(elements, display_width=900):
    els = [e for e in elements if not e.get('isDeleted')]
    fails, warns = [], []
    xs, ys = [], []
    for e in els:
        pts = e.get('points') or [[0, 0], [e.get('width', 0), e.get('height', 0)]]
        xs += [e['x'] + p[0] for p in pts]; ys += [e['y'] + p[1] for p in pts]
    width = (max(xs) - min(xs)) if xs else 1
    scale = min(1.0, display_width / max(width, 1))
    texts = [e for e in els if e['type'] == 'text']
    free = [e for e in texts if not e.get('containerId')]
    for e in texts:
        px = e.get('fontSize', 20) * scale
        if px < 12: fails.append(f'text "{e["text"][:16]}" renders at about {px:.0f}px (< 12) at {display_width}px width')
    boxes = {id(e): text_box(e) for e in free}
    for i, a in enumerate(free):
        for b in free[i + 1:]:
            A, B = boxes[id(a)], boxes[id(b)]
            if A[0] < B[2] - 2 and B[0] < A[2] - 2 and A[1] < B[3] - 2 and B[1] < A[3] - 2:
                fails.append(f'text overlap: "{a["text"][:12]}" / "{b["text"][:12]}"')
    lines = [e for e in els if e['type'] in ('line', 'arrow')]
    for t in free:
        B = boxes[id(t)]
        for ln in lines:
            pts = [(ln['x'] + p[0], ln['y'] + p[1]) for p in ln['points']]
            if any(seg_hits(pts[k], pts[k + 1], B) for k in range(len(pts) - 1)):
                fails.append(f'line crosses text "{t["text"][:16]}"'); break
    for e in texts:
        if e.get('containerId'):
            n_lines, n_chars = e['text'].count('\n') + 1, len(e['text'].replace('\n', ''))
            if n_lines > 4 or n_chars > 60:
                warns.append(f'box holds {n_lines} lines / {n_chars} chars ("{e["text"][:12]}…"): move detail into the note')
        if CAPTION.search(e.get('text', '')):
            warns.append(f'caption-like text inside the figure ("{e["text"][:16]}"): put it under the embed in Markdown')
    if any((e.get('roughness') or 0) > 0 for e in els):
        warns.append('hand-drawn style (roughness > 0): use 0 for crisp text and lines')
    rects = [e for e in els if e['type'] in ('rectangle', 'diamond') and e.get('boundElements')]
    curves = [e for e in lines if len(e.get('points', [])) >= 4]
    dots = [e for e in els if e['type'] == 'ellipse' and e.get('width', 0) <= 24]
    if len(rects) >= 5 and not curves and not dots:
        warns.append('box-and-arrow-only figure: if the lesson is about shapes, shifts or coordinates, draw a plot; '
                     'a non-spatial flow belongs in Mermaid, an attribute comparison in a table')
    status = 'FAIL' if fails else 'WARN' if warns else 'PASS'
    return {'status': status, 'sceneWidth': round(width), 'displayWidth': display_width, 'fails': fails, 'warnings': warns}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('scene'); ap.add_argument('--display-width', type=int, default=900)
    a = ap.parse_args()
    report = lint(load_elements(a.scene), a.display_width)
    print(json.dumps({'path': a.scene, **report}, ensure_ascii=False, indent=1))
    sys.exit(1 if report['status'] == 'FAIL' else 0)


if __name__ == '__main__':
    main()
