"""Library service — aggregates projects and skills across all JSON template files."""

import json
from pathlib import Path

from gui.models import LibraryProject, ResumeData, SkillCategory


class LibraryService:
    """Reads every JSON file in the template folder and exposes aggregated library data.

    Implements the ILibraryReader protocol (duck-typed via Protocol).
    SRP: sole responsibility is aggregating content from JSON template files.
    """

    def __init__(self, json_folder: Path):
        self._json_folder = json_folder

    # ── ILibraryReader ────────────────────────────────────────────────────────

    def get_all_projects(self) -> list[LibraryProject]:
        projects, _ = self._load_all()
        return projects

    def get_all_skills(self) -> list[SkillCategory]:
        _, skills = self._load_all()
        return skills

    def load_all(self) -> tuple[list[LibraryProject], list[SkillCategory]]:
        """Public single-pass loader. Intended for use with run_in_executor."""
        return self._load_all()

    # ── Internal single-pass loader ───────────────────────────────────────────

    def _load_all(self) -> tuple[list[LibraryProject], list[SkillCategory]]:
        """Parse every JSON file exactly once and return both projects and skills.

        This avoids the double file-read that would occur if get_all_projects()
        and get_all_skills() each iterated the folder independently.
        """
        project_candidates: dict[str, LibraryProject] = {}
        skill_merged: dict[str, list[str]] = {}

        for path in sorted(self._json_folder.glob("*.json"), key=lambda f: f.name):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                resume = ResumeData.model_validate(data)
            except Exception:
                continue

            # ── projects ──────────────────────────────────────────────────────
            for p in resume.projects:
                entry = LibraryProject(
                    name=p.name,
                    tech_stack=p.tech_stack,
                    date=p.date,
                    description=p.description,
                    source=path.name,
                )
                key = p.name.strip().lower()
                existing = project_candidates.get(key)
                if existing is None or self._desc_len(entry) > self._desc_len(existing):
                    project_candidates[key] = entry

            # ── skills ────────────────────────────────────────────────────────
            for s in resume.skills:
                items = self._normalize_items(s.items)
                skill_merged.setdefault(s.category, []).extend(items)

        projects = sorted(project_candidates.values(), key=lambda p: p.name.lower())

        skills: list[SkillCategory] = []
        for category, items in skill_merged.items():
            seen_lower: set[str] = set()
            deduped: list[str] = []
            for item in items:
                if item and item.lower() not in seen_lower:
                    deduped.append(item)
                    seen_lower.add(item.lower())
            skills.append(SkillCategory(category=category, items=deduped))

        return projects, skills

    @staticmethod
    def _desc_len(project: LibraryProject) -> int:
        return sum(len(line) for line in project.description)

    @staticmethod
    def _normalize_items(items: list[str]) -> list[str]:
        """Split any comma-separated single-item list into individual skill entries."""
        if len(items) == 1 and "," in items[0]:
            return [x.strip() for x in items[0].split(",") if x.strip()]
        return [x.strip() for x in items if x.strip()]
