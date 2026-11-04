#!/usr/bin/env python3
"""Validate the small, portable contract needed for a Learning Agent diagram.

This does not validate every Excalidraw element property. It checks that a
scene is a parseable native Excalidraw document and that its element records
have the fields required for opening/editing a normal scene. It never rewrites
the input file.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys


def _load_payload(path: Path) -> tuple[dict[str, object], str]:
    """Load a legacy JSON scene or a modern Obsidian markdown scene."""
    text = path.read_text(encoding="utf-8")
    suffix = path.suffix.lower()
    if suffix == ".excalidraw":
        try:
            payload = json.loads(text)
        except json.JSONDecodeError as error:
            raise ValueError(f"invalid JSON: {error.msg}") from error
        format_name = "excalidraw"
    elif suffix == ".md" and path.name.lower().endswith(".excalidraw.md"):
        payload = None
        # Obsidian Excalidraw markdown normally stores the scene in a fenced
        # JSON block after frontmatter.  Ignore other code fences and select
        # the first object whose type is the Excalidraw scene marker.
        for match in re.finditer(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE):
            try:
                candidate = json.loads(match.group(1))
            except json.JSONDecodeError:
                continue
            if isinstance(candidate, dict) and candidate.get("type") == "excalidraw":
                payload = candidate
                break
        if payload is None:
            raise ValueError(".excalidraw.md does not contain a fenced Excalidraw JSON scene")
        format_name = "excalidraw.md"
    else:
        raise ValueError("diagram must use .excalidraw or .excalidraw.md")
    if not isinstance(payload, dict):
        raise ValueError("scene root must be an object")
    return payload, format_name


def _has_bound_entry(element: dict[str, object], target_id: str, target_type: str) -> bool:
    entries = element.get("boundElements") or []
    return any(
        isinstance(entry, dict)
        and entry.get("id") == target_id
        and entry.get("type") == target_type
        for entry in entries
    )


def _bound_entries(element: dict[str, object]) -> list[object]:
    entries = element.get("boundElements")
    if entries is None:
        return []
    if not isinstance(entries, list):
        raise ValueError(f"elements[{element.get('id', '?')}].boundElements must be an array or null")
    return entries


def _has_endpoint_binding(element: dict[str, object], target_id: str) -> bool:
    return any(
        isinstance(element.get(key), dict)
        and element[key].get("elementId") == target_id
        for key in ("startBinding", "endBinding")
    )


def validate(path: Path) -> dict[str, object]:
    payload, format_name = _load_payload(path)
    if not isinstance(payload, dict):
        raise ValueError("scene root must be an object")
    if payload.get("type") != "excalidraw":
        raise ValueError('scene.type must be "excalidraw"')
    if not isinstance(payload.get("version"), int):
        raise ValueError("scene.version must be an integer")
    elements = payload.get("elements")
    if not isinstance(elements, list):
        raise ValueError("scene.elements must be an array")
    seen: set[str] = set()
    by_id: dict[str, dict[str, object]] = {}
    for index, element in enumerate(elements):
        if not isinstance(element, dict):
            raise ValueError(f"elements[{index}] must be an object")
        for key in ("id", "type", "x", "y", "width", "height"):
            if key not in element:
                raise ValueError(f"elements[{index}] missing {key}")
        element_id = element["id"]
        if not isinstance(element_id, str) or not element_id:
            raise ValueError(f"elements[{index}].id must be a non-empty string")
        if element_id in seen:
            raise ValueError(f"duplicate element id: {element_id}")
        seen.add(element_id)
        if not isinstance(element["type"], str) or not element["type"]:
            raise ValueError(f"elements[{index}].type must be a non-empty string")
        for key in ("x", "y", "width", "height"):
            if not isinstance(element[key], (int, float)):
                raise ValueError(f"elements[{index}].{key} must be numeric")
        if "boundElements" in element and element["boundElements"] is not None and not isinstance(element["boundElements"], list):
            raise ValueError(f"elements[{index}].boundElements must be an array or null when present")
        by_id[element_id] = element

    bound_text_count = 0
    bound_arrow_endpoint_count = 0
    for index, element in enumerate(elements):
        element_id = element["id"]
        element_type = element["type"]

        container_id = element.get("containerId")
        if container_id is not None:
            if not isinstance(container_id, str) or not container_id:
                raise ValueError(f"elements[{index}].containerId must be a non-empty string")
            container = by_id.get(container_id)
            if container is None:
                raise ValueError(f"text container does not exist: {element_id} -> {container_id}")
            if element_type != "text":
                raise ValueError(f"only text elements may use containerId: {element_id}")
            if container.get("type") in {"text", "arrow", "line"}:
                raise ValueError(f"text container must be a shape: {element_id} -> {container_id}")
            if not _has_bound_entry(container, element_id, "text"):
                raise ValueError(f"text binding is not mirrored by container: {element_id} -> {container_id}")
            bound_text_count += 1

        for bound_index, entry in enumerate(_bound_entries(element)):
            if not isinstance(entry, dict):
                raise ValueError(f"elements[{index}].boundElements[{bound_index}] must be an object")
            target_id = entry.get("id")
            target_type = entry.get("type")
            if not isinstance(target_id, str) or not target_id:
                raise ValueError(f"elements[{index}].boundElements[{bound_index}].id must be a string")
            if not isinstance(target_type, str) or not target_type:
                raise ValueError(f"elements[{index}].boundElements[{bound_index}].type must be a string")
            if target_type not in {"text", "arrow"}:
                raise ValueError(f"unsupported bound element type: {target_type}")
            target = by_id.get(target_id)
            if target is None:
                raise ValueError(f"bound element does not exist: {element_id} -> {target_id}")
            if target_type == "text":
                if target.get("type") != "text" or target.get("containerId") != element_id:
                    raise ValueError(f"text reverse binding mismatch: {element_id} -> {target_id}")
            elif target_type == "arrow":
                if target.get("type") not in {"arrow", "line"} or not _has_endpoint_binding(target, element_id):
                    raise ValueError(f"arrow reverse binding mismatch: {element_id} -> {target_id}")

        if element_type in {"arrow", "line"}:
            for binding_name in ("startBinding", "endBinding"):
                binding = element.get(binding_name)
                if binding is None:
                    continue
                if not isinstance(binding, dict):
                    raise ValueError(f"elements[{index}].{binding_name} must be an object or null")
                target_id = binding.get("elementId")
                if not isinstance(target_id, str) or not target_id:
                    raise ValueError(f"elements[{index}].{binding_name}.elementId must be a string")
                target = by_id.get(target_id)
                if target is None:
                    raise ValueError(f"arrow target does not exist: {element_id} -> {target_id}")
                if not _has_bound_entry(target, element_id, "arrow"):
                    raise ValueError(f"arrow binding is not mirrored by target: {element_id} -> {target_id}")
                bound_arrow_endpoint_count += 1
    files = payload.get("files", {})
    if not isinstance(files, dict):
        raise ValueError("scene.files must be an object when present")
    return {
        "path": str(path),
        "type": payload["type"],
        "version": payload["version"],
        "format": format_name,
        "elementCount": len(elements),
        "fileCount": len(files),
        "boundTextCount": bound_text_count,
        "boundArrowEndpointCount": bound_arrow_endpoint_count,
        "status": "PASS",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scene", type=Path)
    args = parser.parse_args()
    try:
        result = validate(args.scene.resolve(strict=True))
    except (OSError, ValueError) as error:
        print(json.dumps({"status": "FAIL", "error": str(error)}, ensure_ascii=False))
        return 1
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
