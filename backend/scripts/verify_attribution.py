#!/usr/bin/env python3
"""Phase D verification gate — confirm every .insert( call in the backend
is paired with a stamp_created_by call in the same function scope.

Usage:
    python backend/scripts/verify_attribution.py

Exit codes:
    0 — all .insert( calls are attributed (prints summary)
    1 — one or more .insert( calls are missing stamp_created_by
"""
from __future__ import annotations

import ast
import os
import sys

BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..")

# Directories to skip when walking the backend tree
SKIP_DIRS = {".venv", ".venv-arm64", "__pycache__", "node_modules", ".git"}

# .insert( calls that are NOT database inserts (e.g. sys.path.insert)
IGNORE_PATTERNS = {"sys.path.insert", "path.insert"}


def _source_segment(source_lines: list[str], node: ast.AST) -> str:
    """Return the source text for a single AST node's line."""
    return source_lines[node.lineno - 1] if node.lineno <= len(source_lines) else ""


def _is_db_insert(node: ast.Call, source_lines: list[str]) -> bool:
    """Return True if the Call node looks like  sb.table(...).insert(...)."""
    line = _source_segment(source_lines, node)
    for pat in IGNORE_PATTERNS:
        if pat in line:
            return False
    # Match:  .insert(  where the receiver is a chained table() call
    if isinstance(node.func, ast.Attribute) and node.func.attr == "insert":
        return True
    return False


def _function_has_stamp(func_node: ast.AST) -> bool:
    """Return True if stamp_created_by appears anywhere in the function body."""
    for child in ast.walk(func_node):
        if isinstance(child, ast.Call):
            # stamp_created_by(...)
            if isinstance(child.func, ast.Name) and child.func.id == "stamp_created_by":
                return True
    return False


def _find_inserts_in_function(
    func_node: ast.AST,
    source_lines: list[str],
) -> list[int]:
    """Return line numbers of .insert( calls inside a function."""
    lines: list[int] = []
    for child in ast.walk(func_node):
        if isinstance(child, ast.Call) and _is_db_insert(child, source_lines):
            lines.append(child.lineno)
    return lines


def check_file(filepath: str) -> tuple[int, int, list[str]]:
    """Check a single Python file.

    Returns (total_inserts, attributed_inserts, list of failure messages).
    """
    with open(filepath, "r") as f:
        source = f.read()
    source_lines = source.splitlines()

    try:
        tree = ast.parse(source, filename=filepath)
    except SyntaxError:
        return 0, 0, [f"{filepath}: SyntaxError — skipped"]

    total = 0
    attributed = 0
    failures: list[str] = []

    # Collect all function/method definitions
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue

        insert_lines = _find_inserts_in_function(node, source_lines)
        if not insert_lines:
            continue

        has_stamp = _function_has_stamp(node)
        for line in insert_lines:
            total += 1
            if has_stamp:
                attributed += 1
            else:
                rel = os.path.relpath(filepath, os.path.join(BACKEND_DIR, ".."))
                failures.append(f"  {rel}:{line}  in {node.name}()")

    # Also check module-level .insert( calls (outside any function)
    # by collecting insert calls NOT inside any function
    func_ranges: list[tuple[int, int]] = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            func_ranges.append((node.lineno, node.end_lineno or node.lineno))

    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and _is_db_insert(node, source_lines):
            in_func = any(start <= node.lineno <= end for start, end in func_ranges)
            if not in_func:
                total += 1
                # Module-level insert — check if stamp_created_by is in the source at all
                if "stamp_created_by" in source:
                    attributed += 1
                else:
                    rel = os.path.relpath(filepath, os.path.join(BACKEND_DIR, ".."))
                    failures.append(f"  {rel}:{node.lineno}  at module level")

    return total, attributed, failures


def main() -> int:
    total_inserts = 0
    total_attributed = 0
    all_failures: list[str] = []
    files_checked = 0

    for dirpath, dirnames, filenames in os.walk(BACKEND_DIR):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in sorted(filenames):
            if not fname.endswith(".py"):
                continue
            filepath = os.path.join(dirpath, fname)
            t, a, failures = check_file(filepath)
            total_inserts += t
            total_attributed += a
            all_failures.extend(failures)
            files_checked += 1

    if all_failures:
        print(f"FAIL — {len(all_failures)} .insert() call(s) missing stamp_created_by:\n")
        for f in all_failures:
            print(f)
        print(f"\n{total_attributed}/{total_inserts} attributed across {files_checked} files")
        return 1

    print(f"PASS — {total_inserts} .insert() calls, all attributed across {files_checked} files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
