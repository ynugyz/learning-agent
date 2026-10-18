"""Portable image-publication checks; no models, document tools or Vault access."""

import base64
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
from urllib.parse import unquote
import zlib


SCRIPT = Path(__file__).resolve().parents[1] / "skill/learning-knowledge-growth/scripts/attach_source_image.py"

# Tiny synthetic images, never real course/user material. JPEG and WebP were
# encoded once with Pillow; running these tests requires only the standard library.
JPEG = base64.b64decode(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwChRRRXsHln/9k="
)
WEBP = base64.b64decode("UklGRh4AAABXRUJQVlA4TBEAAAAvAUAAAAdQvEIVtP+BiOh/AAA=")


def png_chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)


PNG = (b"\x89PNG\r\n\x1a\n"
       + png_chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
       + png_chunk(b"IDAT", zlib.compress(b"\x00\x50\x78\xa0"))
       + png_chunk(b"IEND", b""))


class AttachmentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="learning-figure-test-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / "中文 Human notes"
        self.root.mkdir()
        self.note = self.root / "第三章 公式" / "复习 笔记.md"
        self.image = self.base / "已检查 图片.png"
        self.image.write_bytes(PNG)
        self.source = self.base / "原始资料.pdf"
        # The helper hashes opaque original files; rendering/page validation is
        # intentionally the caller's job and not represented by this test source.
        self.source.write_bytes(b"%PDF-1.4\nsynthetic locator/hash test fixture\n%%EOF")

    def call(self, *, note=None, image=None, source=None, locator=None, extra=(), ok=True):
        command = [sys.executable, "-B", str(SCRIPT), "--human-root", str(self.root),
                   "--note", str(note or self.note), "--image", str(image or self.image),
                   "--source", str(source or self.source), "--alt", "机制 [结构图]",
                   *(locator or ["--page", "2"]), *extra]
        result = subprocess.run(command, capture_output=True, encoding="utf-8", timeout=15)
        if ok:
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stderr, "")
            return json.loads(result.stdout)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertEqual(result.stdout, "")
        return result.stderr

    def test_unicode_nested_note_portable_link_and_exact_bytes(self):
        original = self.source.read_bytes()
        result = self.call(extra=["--region", "右侧流程图（保留图例）"])
        self.assertFalse(result["reused"])
        self.assertEqual(result["notePath"], "第三章 公式/复习 笔记.md")
        self.assertEqual(result["source"]["locator"], {"page": 2, "region": "右侧流程图（保留图例）"})
        self.assertEqual(result["source"]["hash"], hashlib.sha256(original).hexdigest())
        self.assertEqual(result["imageHash"], hashlib.sha256(PNG).hexdigest())
        self.assertIn(result["imageHash"], result["assetPath"])
        self.assertIn(r"![机制 \[结构图\]]", result["markdown"])
        link = result["markdown"].split("](", 1)[1][:-1]
        self.assertNotIn("\\", link)
        self.assertEqual((self.note.parent / unquote(link)).resolve(), (self.root / result["assetPath"]).resolve())
        self.assertEqual((self.root / result["assetPath"]).read_bytes(), PNG)
        self.assertEqual(self.image.read_bytes(), PNG)
        self.assertEqual(self.source.read_bytes(), original)
        self.assertFalse(self.note.exists())
        self.assertEqual([p.name for p in self.root.rglob("*") if p.is_file()], [Path(result["assetPath"]).name])

    def test_existing_note_is_unchanged(self):
        self.note.parent.mkdir()
        original = "# 既有笔记\r\n保持原文\r\n".encode("utf-8")
        self.note.write_bytes(original)
        self.call()
        self.assertEqual(self.note.read_bytes(), original)

    def test_relative_note_path(self):
        self.assertEqual(self.call(note="新课/知识.md")["notePath"], "新课/知识.md")

    def test_reuse_across_source_files_and_pages_preserves_each_locator(self):
        first = self.call()
        slide_source = self.base / "另一份资料.pptx"
        slide_source.write_bytes(b"synthetic slide source")
        second = self.call(source=slide_source, locator=["--slide", "7"])
        third = self.call(locator=["--page", "3"])
        self.assertTrue(second["reused"])
        self.assertTrue(third["reused"])
        self.assertEqual(first["assetPath"], second["assetPath"])
        self.assertEqual(second["source"]["locator"], {"slide": 7})
        self.assertEqual(third["source"]["locator"], {"page": 3})
        self.assertNotEqual(first["source"]["hash"], second["source"]["hash"])
        self.assertEqual(len(list((self.root / "_assets/learning").iterdir())), 1)

    def test_jpeg_and_webp(self):
        for suffix, data in ((".jpeg", JPEG), (".webp", WEBP)):
            with self.subTest(suffix=suffix):
                image = self.base / ("figure" + suffix)
                image.write_bytes(data)
                result = self.call(image=image)
                self.assertEqual((self.root / result["assetPath"]).read_bytes(), data)

    def test_missing_source_is_rejected_before_publishing(self):
        self.call(source=self.base / "absent.pdf", ok=False)
        self.assertFalse((self.root / "_assets").exists())

    def test_page_number_and_source_kind_validation(self):
        for locator in (["--page", "0"], ["--page", "-1"], ["--page", "1.5"],
                        ["--slide", "1"], ["--page", "1", "--slide", "1"]):
            with self.subTest(locator=locator):
                self.call(locator=locator, ok=False)
        self.assertFalse((self.root / "_assets").exists())

    def test_obviously_truncated_or_invalid_images_are_rejected(self):
        cases = [(".png", PNG[:20]), (".jpg", JPEG[:-2]), (".webp", WEBP[:-1]),
                 (".png", b"not an image"), (".png", JPEG), (".svg", b"<svg></svg>"),
                 (".png", PNG[:-1] + b"!")]
        for index, (suffix, data) in enumerate(cases):
            with self.subTest(index=index):
                image = self.base / ("broken" + suffix)
                image.write_bytes(data)
                self.call(image=image, ok=False)
        self.assertFalse((self.root / "_assets").exists())

    def test_root_escape_and_windows_special_paths_are_rejected(self):
        for note in (self.base / "outside.md", "../escape.md", "CON.md", "x/file.md:stream",
                     "folder./note.md", "C:relative.md", "bad?/note.md"):
            with self.subTest(note=str(note)):
                self.call(note=note, ok=False)
        self.assertFalse((self.root / "_assets").exists())

    def test_corrupted_destination_is_not_overwritten(self):
        result = self.call()
        asset = self.root / result["assetPath"]
        asset.write_bytes(b"externally changed; must not be overwritten")
        self.assertIn("unexpected contents", self.call(ok=False))
        self.assertEqual(asset.read_bytes(), b"externally changed; must not be overwritten")

    def make_directory_link(self, link, target):
        try:
            link.symlink_to(target, target_is_directory=True)
            return
        except OSError as error:
            if os.name != "nt":
                self.skipTest("Directory symlinks unavailable: " + str(error))
        # Junctions do not require Windows administrator/developer-mode rights.
        result = subprocess.run([os.environ.get("COMSPEC", "cmd.exe"), "/d", "/c",
                                 "mklink", "/J", str(link), str(target)],
                                capture_output=True, timeout=15)
        if result.returncode:
            self.skipTest("Directory symlinks/junctions unavailable")

    def test_note_symlink_or_junction_cannot_escape_root(self):
        outside = self.base / "outside"
        outside.mkdir()
        self.make_directory_link(self.root / "linked", outside)
        self.call(note="linked/note.md", ok=False)
        self.assertEqual(list(outside.iterdir()), [])
        self.assertFalse((self.root / "_assets").exists())

    def test_asset_symlink_or_junction_cannot_escape_root(self):
        outside = self.base / "outside assets"
        outside.mkdir()
        self.make_directory_link(self.root / "_assets", outside)
        self.call(ok=False)
        self.assertEqual(list(outside.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
