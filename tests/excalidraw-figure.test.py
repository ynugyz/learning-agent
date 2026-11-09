"""Tests for the bundled figure builder, layout lint and preview renderer."""

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "skill/learning-knowledge-growth/scripts"


def run(script, *args):
    return subprocess.run([sys.executable, "-B", str(SCRIPTS / script), *map(str, args)],
                          capture_output=True, text=True, encoding="utf-8", timeout=60)


SPEC = {
    "name": "supply-demand",
    "elements": [
        {"kind": "plot", "x": 80, "y": 140, "w": 380, "h": 280, "xrange": [0, 1], "yrange": [0, 1],
         "xlabel": "Q", "ylabel": "P", "title": "Market",
         "curves": [{"expr": "0.15 + 0.7*x", "from": 0.1, "to": 0.95, "color": "ink", "label": "S"},
                    {"expr": "0.9 - 0.7*x", "from": 0.05, "to": 0.95, "color": "blue", "label": "D1"}],
         "points": [{"at": [0.5357, 0.525], "color": "blue", "label": "E1", "guides": True}]},
        {"kind": "box", "id": "a", "x": 600, "y": 160, "w": 240, "h": 80, "text": "shock"},
        {"kind": "box", "id": "b", "x": 600, "y": 320, "w": 240, "h": 80, "text": "demand shifts"},
        {"kind": "arrow", "from": "a", "to": "b", "label": "raises demand"},
    ],
}


class FigureToolTests(unittest.TestCase):
    def test_builder_output_passes_lint_and_validator(self):
        with tempfile.TemporaryDirectory(prefix="lkg-fig-") as d:
            spec = Path(d) / "spec.json"
            spec.write_text(json.dumps(SPEC), encoding="utf-8")
            built = run("excalidraw_figure.py", spec, "--out-dir", d, "--preview", Path(d) / "p.svg")
            self.assertEqual(built.returncode, 0, built.stdout + built.stderr)
            self.assertEqual(json.loads(built.stdout)["status"], "PASS")
            scene = Path(d) / "supply-demand.excalidraw.md"
            checked = run("validate_excalidraw.py", scene)
            self.assertEqual(json.loads(checked.stdout)["status"], "PASS", checked.stdout)
            text = scene.read_text(encoding="utf-8")
            self.assertNotIn('"roughness": 1', text)
            self.assertIn("<polyline", (Path(d) / "p.svg").read_text(encoding="utf-8"))

    def test_lint_flags_text_on_a_line_and_captions(self):
        els = [
            {"id": "l", "type": "line", "x": 0, "y": 50, "width": 400, "height": 0, "points": [[0, 0], [400, 0]], "roughness": 1},
            {"id": "t", "type": "text", "x": 150, "y": 38, "width": 80, "height": 25, "text": "label", "fontSize": 20, "textAlign": "left"},
            {"id": "c", "type": "text", "x": 0, "y": 200, "width": 300, "height": 25, "text": "示意图，未按比例", "fontSize": 20, "textAlign": "left"},
        ]
        with tempfile.TemporaryDirectory(prefix="lkg-lint-") as d:
            path = Path(d) / "bad.excalidraw"
            path.write_text(json.dumps({"type": "excalidraw", "version": 2, "elements": els}), encoding="utf-8")
            res = run("lint_excalidraw_layout.py", path)
            report = json.loads(res.stdout)
            self.assertEqual(report["status"], "FAIL")
            self.assertTrue(any("crosses text" in f for f in report["fails"]))
            self.assertTrue(any("caption" in w for w in report["warnings"]))
            self.assertTrue(any("roughness" in w for w in report["warnings"]))

    def test_lint_flags_small_text_on_wide_scene(self):
        els = [{"id": "t", "type": "text", "x": 0, "y": 0, "width": 60, "height": 20, "text": "tiny", "fontSize": 16, "textAlign": "left"},
               {"id": "r", "type": "rectangle", "x": 3000, "y": 0, "width": 100, "height": 50}]
        with tempfile.TemporaryDirectory(prefix="lkg-lint-") as d:
            path = Path(d) / "wide.excalidraw"
            path.write_text(json.dumps({"type": "excalidraw", "version": 2, "elements": els}), encoding="utf-8")
            report = json.loads(run("lint_excalidraw_layout.py", path).stdout)
            self.assertTrue(any("renders at about" in f for f in report["fails"]))


if __name__ == "__main__":
    unittest.main()
