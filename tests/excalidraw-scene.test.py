"""Portable tests for the optional native Excalidraw scene contract."""

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "skill/learning-knowledge-growth/scripts/validate_excalidraw.py"


class ExcalidrawSceneTests(unittest.TestCase):
    def run_validator(self, payload, suffix=".excalidraw", raw=False):
        with tempfile.TemporaryDirectory(prefix="learning-excalidraw-test-") as directory:
            path = Path(directory) / ("diagram" + suffix)
            content = payload if raw else json.dumps(payload, ensure_ascii=False)
            path.write_text(content, encoding="utf-8")
            return subprocess.run(
                [sys.executable, "-B", str(SCRIPT), str(path)],
                capture_output=True, text=True, timeout=15,
            )

    def test_valid_scene(self):
        result = self.run_validator({
            "type": "excalidraw",
            "version": 2,
            "source": "https://excalidraw.com",
            "elements": [{"id": "a", "type": "rectangle", "x": 0, "y": 0, "width": 100, "height": 60}],
            "appState": {},
            "files": {},
        })
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["status"], "PASS")

    def test_duplicate_element_ids_fail(self):
        result = self.run_validator({
            "type": "excalidraw", "version": 2,
            "elements": [
                {"id": "a", "type": "rectangle", "x": 0, "y": 0, "width": 1, "height": 1},
                {"id": "a", "type": "text", "x": 5, "y": 5, "width": 1, "height": 1},
            ],
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("duplicate element id", result.stdout)

    def test_wrong_root_fails(self):
        result = self.run_validator({"type": "not-excalidraw", "version": 2, "elements": []})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("scene.type", result.stdout)

    def test_bound_text_and_arrow_scene_passes(self):
        result = self.run_validator({
            "type": "excalidraw", "version": 2,
            "elements": [
                {
                    "id": "shape-a", "type": "rectangle", "x": 0, "y": 0,
                    "width": 120, "height": 60,
                    "boundElements": [{"id": "text-a", "type": "text"}, {"id": "arrow-a", "type": "arrow"}],
                },
                {
                    "id": "text-a", "type": "text", "x": 10, "y": 10,
                    "width": 80, "height": 20, "containerId": "shape-a",
                },
                {
                    "id": "shape-b", "type": "ellipse", "x": 240, "y": 0,
                    "width": 120, "height": 60,
                    "boundElements": [{"id": "arrow-a", "type": "arrow"}],
                },
                {
                    "id": "arrow-a", "type": "arrow", "x": 120, "y": 30,
                    "width": 120, "height": 0,
                    "startBinding": {"elementId": "shape-a"},
                    "endBinding": {"elementId": "shape-b"},
                },
            ],
        })
        self.assertEqual(result.returncode, 0, result.stdout)
        report = json.loads(result.stdout)
        self.assertEqual(report["boundTextCount"], 1)
        self.assertEqual(report["boundArrowEndpointCount"], 2)

    def test_coordinate_plane_geometry_scene_passes(self):
        """A small math aid may use native lines, arrows, ellipses and text."""
        result = self.run_validator({
            "type": "excalidraw", "version": 2,
            "elements": [
                # Coordinate axes and a plotted circle are native editable
                # geometry; they do not need to be flattened into an image.
                {"id": "x-axis", "type": "line", "x": 0, "y": 120,
                 "width": 260, "height": 0,
                 "points": [[0, 0], [260, 0]]},
                {"id": "y-axis", "type": "line", "x": 130, "y": 0,
                 "width": 0, "height": 240,
                 "points": [[0, 0], [0, 240]]},
                {"id": "origin-label", "type": "text", "x": 136, "y": 124,
                 "width": 52, "height": 20, "text": "原点"},
                {"id": "curve", "type": "ellipse", "x": 70, "y": 50,
                 "width": 120, "height": 120,
                 "boundElements": [{"id": "curve-label", "type": "text"}]},
                {"id": "curve-label", "type": "text", "x": 96, "y": 88,
                 "width": 64, "height": 20, "text": "示意曲线",
                 "containerId": "curve"},
            ],
            "files": {},
        })
        self.assertEqual(result.returncode, 0, result.stdout)
        report = json.loads(result.stdout)
        self.assertEqual(report["elementCount"], 5)
        self.assertEqual(report["boundTextCount"], 1)

    def test_modern_excalidraw_markdown_passes(self):
        scene = {
            "type": "excalidraw", "version": 2,
            "elements": [{"id": "a", "type": "rectangle", "x": 0, "y": 0, "width": 1, "height": 1}],
            "files": {},
        }
        markdown = "---\nexcalidraw-plugin: parsed\n---\n\n```json\n" + json.dumps(scene) + "\n```\n"
        result = self.run_validator(markdown, suffix=".excalidraw.md", raw=True)
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertEqual(json.loads(result.stdout)["format"], "excalidraw.md")

    def test_one_sided_text_binding_fails(self):
        result = self.run_validator({
            "type": "excalidraw", "version": 2,
            "elements": [
                {"id": "shape", "type": "rectangle", "x": 0, "y": 0, "width": 10, "height": 10},
                {"id": "text", "type": "text", "x": 0, "y": 0, "width": 4, "height": 4, "containerId": "shape"},
            ],
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("not mirrored", result.stdout)

    def test_one_sided_arrow_binding_fails(self):
        result = self.run_validator({
            "type": "excalidraw", "version": 2,
            "elements": [
                {"id": "shape", "type": "rectangle", "x": 0, "y": 0, "width": 10, "height": 10},
                {"id": "arrow", "type": "arrow", "x": 0, "y": 0, "width": 10, "height": 0,
                 "startBinding": {"elementId": "shape"}},
            ],
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("not mirrored", result.stdout)

    def test_null_bound_elements_is_allowed(self):
        result = self.run_validator({
            "type": "excalidraw", "version": 2,
            "elements": [{"id": "a", "type": "rectangle", "x": 0, "y": 0, "width": 1, "height": 1, "boundElements": None}],
        })
        self.assertEqual(result.returncode, 0, result.stdout)

    def test_unknown_binding_type_fails(self):
        result = self.run_validator({
            "type": "excalidraw", "version": 2,
            "elements": [
                {"id": "a", "type": "rectangle", "x": 0, "y": 0, "width": 1, "height": 1,
                 "boundElements": [{"id": "b", "type": "banana"}]},
                {"id": "b", "type": "rectangle", "x": 2, "y": 0, "width": 1, "height": 1},
            ],
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unsupported bound element type", result.stdout)

    def test_text_cannot_contain_itself(self):
        result = self.run_validator({
            "type": "excalidraw", "version": 2,
            "elements": [{"id": "text", "type": "text", "x": 0, "y": 0, "width": 1, "height": 1,
                           "containerId": "text", "boundElements": [{"id": "text", "type": "text"}]}],
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must be a shape", result.stdout)


if __name__ == "__main__":
    unittest.main()
