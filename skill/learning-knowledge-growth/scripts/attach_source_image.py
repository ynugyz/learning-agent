#!/usr/bin/env python3
"""Publish an inspected source figure, unchanged, beside Human notes.

This does not render documents, inspect their page count, verify a crop's meaning,
or edit notes/indexes. The caller must inspect the figure and original locator.
Only Python's standard library is required.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import struct
import sys
from urllib.parse import quote
import zlib


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def file_hash(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def image_extension(data):
    """Check container signatures/lengths, not full image decoding or appearance."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        offset, kinds, image_bytes = 8, [], 0
        while offset + 12 <= len(data):
            size = struct.unpack_from(">I", data, offset)[0]
            end = offset + 12 + size
            if end > len(data):
                raise ValueError("Truncated PNG chunk")
            kind = data[offset + 4:offset + 8]
            payload = data[offset + 8:end - 4]
            crc = struct.unpack_from(">I", data, end - 4)[0]
            if zlib.crc32(kind + payload) & 0xffffffff != crc:
                raise ValueError("Invalid PNG chunk checksum")
            if not kinds and (kind != b"IHDR" or size != 13):
                raise ValueError("Missing PNG header")
            if kind == b"IHDR":
                if kinds or size != 13 or not all(struct.unpack_from(">II", payload)):
                    raise ValueError("Invalid PNG dimensions/header")
            kinds.append(kind)
            if kind == b"IDAT":
                image_bytes += size
            offset = end
            if kind == b"IEND":
                if size or offset != len(data) or not image_bytes:
                    raise ValueError("Invalid PNG ending/image data")
                return ".png"
        raise ValueError("Truncated PNG or missing image data")

    if data.startswith(b"\xff\xd8\xff"):
        offset, frame, scan, image_bytes = 2, False, False, 0
        while offset < len(data):
            if data[offset] != 0xff:
                raise ValueError("Invalid JPEG marker")
            while offset < len(data) and data[offset] == 0xff:
                offset += 1
            if offset == len(data):
                break
            marker = data[offset]
            offset += 1
            if marker == 0xd9:
                if frame and scan and image_bytes and offset == len(data):
                    return ".jpg"
                raise ValueError("Invalid JPEG ending or missing image data")
            if marker in (0x00, 0xd8) or 0xd0 <= marker <= 0xd7:
                raise ValueError("Unexpected JPEG marker")
            if marker == 0x01:
                continue
            if offset + 2 > len(data):
                break
            size = struct.unpack_from(">H", data, offset)[0]
            if size < 2 or offset + size > len(data):
                raise ValueError("Truncated JPEG segment")
            if marker in (0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
                          0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf):
                if size < 8 or not all(struct.unpack_from(">HH", data, offset + 3)):
                    raise ValueError("Invalid JPEG dimensions/header")
                frame = True
            offset += size
            if marker == 0xda:
                if size < 6 or not frame:
                    raise ValueError("Invalid JPEG scan header")
                scan = True
                start = offset
                while offset < len(data):
                    if data[offset] == 0xff:
                        if offset + 1 == len(data):
                            break
                        if data[offset + 1] == 0 or 0xd0 <= data[offset + 1] <= 0xd7:
                            offset += 2
                            continue
                        break
                    offset += 1
                image_bytes += offset - start
        raise ValueError("Truncated JPEG")

    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        if struct.unpack_from("<I", data, 4)[0] + 8 != len(data):
            raise ValueError("Truncated or malformed WebP container")
        offset, image_data = 12, False
        while offset + 8 <= len(data):
            kind = data[offset:offset + 4]
            size = struct.unpack_from("<I", data, offset + 4)[0]
            end = offset + 8 + size
            if end + size % 2 > len(data):
                raise ValueError("Truncated WebP chunk")
            payload = data[offset + 8:end]
            if kind == b"VP8 ":
                if size <= 10 or payload[3:6] != b"\x9d\x01\x2a":
                    raise ValueError("Invalid WebP VP8 frame")
                if not all(n & 0x3fff for n in struct.unpack_from("<HH", payload, 6)):
                    raise ValueError("Invalid WebP dimensions")
                image_data = True
            elif kind == b"VP8L":
                if size <= 5 or payload[0] != 0x2f:
                    raise ValueError("Invalid WebP lossless frame")
                image_data = True
            elif kind == b"ANMF":
                raise ValueError("Use a static rendered frame, not animated WebP")
            offset = end + size % 2
        if offset == len(data) and image_data:
            return ".webp"
        raise ValueError("Missing WebP image data")
    raise ValueError("Expected a complete PNG, JPEG, or static WebP image")


def portable_path(path):
    # Reject Windows device names, alternate data streams and ambiguous suffixes
    # on every OS so a published link also remains usable after moving machines.
    for part in path.parts:
        if part == path.anchor or part in (".", ".."):
            continue
        if (part.endswith((" ", ".")) or re.search(r'[<>:"|?*\x00-\x1f]', part)
                or re.match(r"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)", part, re.I)):
            raise ValueError("Unsafe or non-portable path component: " + part)


def inside(path, root):
    resolved = path.resolve()
    try:
        resolved.relative_to(root)
    except ValueError as error:
        raise ValueError("Path escapes Human output root: " + str(path)) from error
    return resolved


def attach(args):
    root = Path(args.human_root)
    portable_path(root)
    root = root.resolve(strict=True)
    if not root.is_dir():
        raise ValueError("Human output root must be an existing directory")
    note = Path(args.note)
    portable_path(note)
    if note.drive and not note.is_absolute():
        raise ValueError("Drive-relative note paths are ambiguous")
    note = inside(note if note.is_absolute() else root / note, root)
    if note.suffix.lower() != ".md" or (note.exists() and not note.is_file()):
        raise ValueError("Note must be an .md file within Human output root")
    # Existing note parents may be absent, but must never be files or escape via
    # symlinks/junctions. The script does not create or modify the note itself.
    for parent in note.parents:
        if parent == root:
            break
        if parent.exists() and not parent.is_dir():
            raise ValueError("Note parent is not a directory")

    source = Path(args.source).resolve(strict=True)
    image = Path(args.image).resolve(strict=True)
    if not source.is_file() or not image.is_file():
        raise ValueError("Source and image must be existing files")
    source_kind = source.suffix.lower()
    if not ((args.page is not None and source_kind == ".pdf") or
            (args.slide is not None and source_kind in (".ppt", ".pptx"))):
        raise ValueError("Use --page for PDF, or --slide for PPT/PPTX")
    number = args.page if args.page is not None else args.slide
    if number < 1:
        raise ValueError("Physical page/slide number must start at 1")
    if not args.alt.strip() or (args.region is not None and not args.region.strip()):
        raise ValueError("Alt text and supplied region must not be blank")

    data = image.read_bytes()
    extension = image_extension(data)
    if image.suffix.lower() not in ({".jpg", ".jpeg"} if extension == ".jpg" else {extension}):
        raise ValueError("Image extension does not match its contents")
    image_hash, source_hash = sha256(data), file_hash(source)
    folder = inside(root / "_assets" / "learning", root)
    if folder != root / "_assets" / "learning":
        raise ValueError("Asset folder must not be redirected through a symlink/junction")
    folder.mkdir(parents=True, exist_ok=True)
    folder = inside(root / "_assets" / "learning", root)
    expected_asset = folder / ("figure-" + image_hash + extension)
    asset = inside(expected_asset, root)
    if asset != expected_asset:
        raise ValueError("Asset file must not be redirected through a symlink")
    if asset in (source, note):
        raise ValueError("Asset destination conflicts with the source or note")
    try:
        stream = asset.open("xb")
    except FileExistsError:
        if not asset.is_file() or file_hash(asset) != image_hash:
            raise ValueError("Existing asset has unexpected contents; nothing was overwritten")
        reused = True
    else:
        try:
            with stream:
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
        except BaseException:
            # Only this invocation's newly created incomplete file is removed.
            asset.unlink(missing_ok=True)
            raise
        reused = False

    relative_link = Path(os.path.relpath(asset, note.parent)).as_posix()
    alt = " ".join(args.alt.split()).replace("\\", "\\\\").replace("[", "\\[").replace("]", "\\]")
    locator = {"page" if args.page is not None else "slide": number}
    if args.region is not None:
        locator["region"] = args.region.strip()
    return {
        "markdown": "![" + alt + "](" + quote(relative_link, safe="/-._~") + ")",
        "assetPath": asset.relative_to(root).as_posix(),
        "notePath": note.relative_to(root).as_posix(),
        "imageHash": image_hash,
        "source": {"name": source.name, "hash": source_hash, "locator": locator},
        "reused": reused,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("human-root", "note", "image", "source", "alt"):
        parser.add_argument("--" + name, required=True)
    locator = parser.add_mutually_exclusive_group(required=True)
    locator.add_argument("--page", type=int, help="1-based physical PDF page")
    locator.add_argument("--slide", type=int, help="1-based PPT/PPTX slide")
    parser.add_argument("--region", help="Human-readable description of the inspected crop")
    args = parser.parse_args()
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    try:
        print(json.dumps(attach(args), ensure_ascii=False))
        return 0
    except (OSError, ValueError) as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
