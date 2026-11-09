#!/usr/bin/env node

/**
 * Small, targeted reference checks for Alignment existingNoteRefs.
 *
 * This module deliberately does not build a Vault index or scan a Vault. The
 * caller supplies a canonical root and this module reads only the referenced
 * files.
 */

import fs from 'node:fs';
import path from 'node:path';

const absoluteWindowsPath = /^[A-Za-z]:[\\/]/;

export function parseNoteReference(reference) {
  if (typeof reference !== 'string' || reference.trim().length === 0) {
    return {status: 'syntax_invalid', reason: 'path must be a non-empty string'};
  }

  const value = reference.trim();
  const anchorIndex = value.indexOf('#');
  const rawPath = anchorIndex === -1 ? value : value.slice(0, anchorIndex);
  const rawAnchor = anchorIndex === -1 ? undefined : value.slice(anchorIndex + 1);

  if (rawPath.length === 0 || rawPath.includes('\0')) {
    return {status: 'syntax_invalid', reason: 'path is empty or contains NUL'};
  }
  if (absoluteWindowsPath.test(rawPath) || path.posix.isAbsolute(rawPath) || path.win32.isAbsolute(rawPath) || rawPath.startsWith('~')) {
    return {status: 'syntax_invalid', reason: 'path must be relative'};
  }

  const normalizedPath = rawPath.replaceAll('\\', '/');
  const segments = normalizedPath.split('/');
  if (segments.some(segment => segment === '..' || segment === '.')) {
    return {status: 'syntax_invalid', reason: 'path traversal segments are forbidden'};
  }
  if (segments.some(segment => segment.length === 0)) {
    return {status: 'syntax_invalid', reason: 'empty path segment is not allowed'};
  }
  if (rawAnchor !== undefined && (rawAnchor.length === 0 || /[\r\n\0]/.test(rawAnchor))) {
    return {status: 'syntax_invalid', reason: 'anchor must be a non-empty single-line value'};
  }

  return {
    status: 'valid',
    path: normalizedPath,
    anchor: rawAnchor
  };
}

export function validateResolutionContext(context) {
  if (!context || typeof context !== 'object') {
    return {status: 'context_invalid', reason: 'resolution context is missing'};
  }
  if (typeof context.root !== 'string' || context.root.trim().length === 0) {
    return {status: 'context_invalid', reason: 'resolution context root is missing'};
  }
  if (context.pathRule !== undefined && context.pathRule !== 'relative-posix') {
    return {status: 'context_invalid', reason: 'unsupported pathRule'};
  }
  if (context.indexId !== undefined && (typeof context.indexId !== 'string' || context.indexId.trim().length === 0)) {
    return {status: 'context_invalid', reason: 'indexId must be a non-empty string when provided'};
  }

  const root = path.resolve(context.root);
  try {
    if (!fs.statSync(root).isDirectory()) {
      return {status: 'context_invalid', reason: 'resolution context root is not a directory'};
    }
  } catch {
    return {status: 'context_invalid', reason: 'resolution context root does not exist'};
  }

  return {status: 'valid', root, indexId: context.indexId};
}

function anchorExists(text, anchor) {
  if (anchor.startsWith('^')) {
    const blockId = anchor.slice(1);
    return new RegExp(`^\\s*\\^${escapeRegExp(blockId)}\\s*$`, 'm').test(text);
  }

  const heading = decodeURIComponentSafe(anchor);
  const headingPattern = /^#{1,6}\s+(.+?)\s*#?\s*$/gm;
  let match;
  while ((match = headingPattern.exec(text)) !== null) {
    if (match[1].trim() === heading.trim()) return true;
  }
  return false;
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function resolveNoteReference(reference, context) {
  const parsed = parseNoteReference(reference);
  if (parsed.status !== 'valid') return parsed;

  const resolvedContext = validateResolutionContext(context);
  if (resolvedContext.status !== 'valid') return resolvedContext;

  const target = path.resolve(resolvedContext.root, ...parsed.path.split('/'));
  const relativeTarget = path.relative(resolvedContext.root, target);
  if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
    return {status: 'context_invalid', reason: 'resolved target escaped canonical root'};
  }

  try {
    if (!fs.statSync(target).isFile()) return {status: 'target_missing', path: parsed.path, reason: 'target is not a file'};
  } catch {
    return {status: 'target_missing', path: parsed.path};
  }

  if (parsed.anchor !== undefined) {
    const text = fs.readFileSync(target, 'utf8');
    if (!anchorExists(text, parsed.anchor)) {
      return {status: 'anchor_missing', path: parsed.path, anchor: parsed.anchor};
    }
  }

  return {status: 'resolved', path: parsed.path, anchor: parsed.anchor};
}

export function preflightNoteReferences(references, context) {
  const uniqueReferences = [...new Set(references ?? [])];
  const results = uniqueReferences.map(reference => ({
    reference,
    ...resolveNoteReference(reference, context)
  }));
  return {
    status: results.every(result => result.status === 'resolved') ? 'PASS' : 'FAIL',
    results
  };
}
