"""Render an Excalidraw scene to an SVG preview (and optionally PNG) so the agent can look at its own figure.

usage: python -B render_excalidraw_preview.py <scene.excalidraw.md|.excalidraw> <out.svg> [--png out.png]

The SVG is a close approximation for checking layout: boxes, bound labels, lines, arrowheads, dots and text.
--png uses a locally installed Chromium-based browser in headless mode when one is found; otherwise only
the SVG is written. Neither file belongs in the Vault unless the user asks for a static preview.
"""
import argparse, html, json, os, shutil, subprocess, sys, tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lint_excalidraw_layout import load_elements, text_box  # noqa: E402


def to_svg(elements):
    els = [e for e in elements if not e.get('isDeleted')]
    xs, ys = [], []
    for e in els:
        pts = e.get('points') or [[0, 0], [e.get('width', 0), e.get('height', 0)]]
        xs += [e['x'] + p[0] for p in pts]; ys += [e['y'] + p[1] for p in pts]
    x0, y0, x1, y1 = min(xs) - 30, min(ys) - 30, max(xs) + 30, max(ys) + 30
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.0f} {y0:.0f} {x1-x0:.0f} {y1-y0:.0f}" width="{x1-x0:.0f}" '
         f'height="{y1-y0:.0f}" font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">'
         f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="#fff"/>'
         '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
         '<path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>']
    for e in els:
        sc = e.get('strokeColor', '#1e1e1e'); bg = e.get('backgroundColor', 'transparent')
        bg = 'none' if bg == 'transparent' else bg; sw = e.get('strokeWidth', 2)
        dash = ' stroke-dasharray="7 5"' if e.get('strokeStyle') == 'dashed' else ''
        if e['type'] in ('rectangle', 'diamond'):
            rx = 10 if e.get('roundness') else 0
            o.append(f'<rect x="{e["x"]}" y="{e["y"]}" width="{e["width"]}" height="{e["height"]}" rx="{rx}" fill="{bg}" stroke="{sc}" stroke-width="{sw}"{dash}/>')
        elif e['type'] == 'ellipse':
            o.append(f'<ellipse cx="{e["x"]+e["width"]/2}" cy="{e["y"]+e["height"]/2}" rx="{e["width"]/2}" ry="{e["height"]/2}" fill="{bg}" stroke="{sc}" stroke-width="{sw}"/>')
        elif e['type'] in ('line', 'arrow', 'freedraw'):
            pts = ' '.join(f'{e["x"]+a:.1f},{e["y"]+b:.1f}' for a, b in e['points'])
            mk = ' marker-end="url(#ah)"' if e['type'] == 'arrow' and e.get('endArrowhead', 'arrow') else ''
            o.append(f'<polyline points="{pts}" fill="none" stroke="{sc}" stroke-width="{sw}"{dash}{mk}/>')
        elif e['type'] == 'text':
            bx = text_box(e); size = e.get('fontSize', 20)
            anchor = {'left': 'start', 'center': 'middle', 'right': 'end'}.get(e.get('textAlign'), 'start')
            tx = {'start': bx[0], 'middle': (bx[0] + bx[2]) / 2, 'end': bx[2]}[anchor]
            for i, line in enumerate(e['text'].split('\n')):
                o.append(f'<text x="{tx:.1f}" y="{e["y"] + size * (1 + 1.25 * i):.1f}" font-size="{size}" fill="{sc}" '
                         f'text-anchor="{anchor}">{html.escape(line)}</text>')
    return '\n'.join(o + ['</svg>'])


def find_browser():
    names = ['msedge', 'chrome', 'chromium', 'google-chrome', 'microsoft-edge']
    for n in names:
        p = shutil.which(n)
        if p: return p
    for base in (os.environ.get('ProgramFiles(x86)', ''), os.environ.get('ProgramFiles', ''), os.environ.get('LOCALAPPDATA', '')):
        for rel in ('Microsoft/Edge/Application/msedge.exe', 'Google/Chrome/Application/chrome.exe'):
            p = Path(base) / rel
            if base and p.exists(): return str(p)
    return None


def to_png(svg_text, png_path, width, height):
    browser = find_browser()
    if not browser: return False
    with tempfile.TemporaryDirectory(prefix='lkg-preview-') as d:  # ASCII-only paths: some browsers reject non-ASCII
        src, out = Path(d) / 'scene.svg', Path(d) / 'scene.png'
        src.write_text(svg_text, encoding='utf8')
        subprocess.run([browser, '--headless=new', '--disable-gpu', '--no-first-run', f'--user-data-dir={Path(d) / "profile"}',
                        f'--window-size={width},{height}', f'--screenshot={out}', src.as_uri()],
                       capture_output=True, timeout=60)
        if not out.exists(): return False
        shutil.copyfile(out, png_path)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('scene'); ap.add_argument('svg'); ap.add_argument('--png')
    a = ap.parse_args()
    svg = to_svg(load_elements(a.scene))
    Path(a.svg).write_text(svg, encoding='utf8')
    result = {'svg': a.svg}
    if a.png:
        import re
        w, h = (int(float(v)) for v in re.search(r'width="(\d+)" height="(\d+)"', svg).groups())
        result['png'] = a.png if to_png(svg, a.png, min(w, 2400), min(h, 2400)) else None
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
