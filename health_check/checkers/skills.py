"""Validates .claude/commands/ skill definition files."""

from __future__ import annotations

from pathlib import Path

from health_check.checkers.base import CheckResult, Status


def _validate_one(path: Path) -> list[str]:
    errors: list[str] = []
    content = path.read_text(encoding="utf-8-sig").strip()  # utf-8-sig strips BOM

    if not content:
        return [f"{path.name}: file is empty"]

    lines = content.splitlines()
    uses_frontmatter = lines[0].strip() == "---"

    if not uses_frontmatter:
        if not [l for l in lines if l.startswith("# ")]:
            errors.append(f"{path.name}: missing top-level H1 heading")
        if not [l for l in lines if l.startswith("## ")]:
            errors.append(f"{path.name}: no H2 sections — skill has no steps")

    if "$ARGUMENTS" not in content and "argument" in content.lower():
        errors.append(f"{path.name}: mentions 'argument' but $ARGUMENTS placeholder is missing")

    return errors


def check(root: Path) -> CheckResult:
    commands_dir = root / ".claude" / "commands"

    if not commands_dir.exists():
        return CheckResult("skills", Status.WARN, ".claude/commands/ not found — run install.py first")

    skill_files = sorted(commands_dir.glob("*.md"))
    if not skill_files:
        return CheckResult("skills", Status.WARN, "No skill files in .claude/commands/")

    all_errors: list[str] = []
    for sf in skill_files:
        all_errors.extend(_validate_one(sf))

    names = ", ".join(f.stem for f in skill_files)
    if all_errors:
        return CheckResult("skills", Status.FAIL, f"{len(skill_files)} skill(s) — {len(all_errors)} error(s)", all_errors)
    return CheckResult("skills", Status.PASS, f"{len(skill_files)} skill(s) valid ({names})")
