"""Library service — aggregates projects and skills across all JSON template files."""

import json
import time
import re
import difflib
from pathlib import Path
from typing import Protocol

from gui.models import LibraryProject, ResumeData, SkillCategory


class IProjectMerger(Protocol):
    """
    Strategy for merging duplicate projects.
    """

    def merge(
        self, new_project: LibraryProject, existing_project: LibraryProject
    ) -> LibraryProject: ...


class LengthBasedMerger:
    """
    Current logic: keeps the project with the longest description.
    """

    def merge(
        self, new_project: LibraryProject, existing_project: LibraryProject
    ) -> LibraryProject:
        def _desc_len(p: LibraryProject) -> int:
            return sum(len(line) for line in p.description)

        if _desc_len(new_project) > _desc_len(existing_project):
            return new_project
        return existing_project


class LibraryService:
    """Reads every JSON file in the template folder and exposes aggregated library data.

    Implements the ILibraryReader protocol (duck-typed via Protocol).
    SRP: sole responsibility is aggregating content from JSON template files.
    """

    def __init__(
        self,
        json_folder: Path,
        merger: IProjectMerger | None = None,
        ai_merger: IProjectMerger | None = None,
    ):
        self._json_folder = json_folder
        self._merger = merger or LengthBasedMerger()
        self._ai_merger = ai_merger

    # ── ILibraryReader ────────────────────────────────────────────────────────

    def get_all_projects(self) -> list[LibraryProject]:
        projects, _ = self._load_all()
        return projects

    def get_all_skills(self) -> list[SkillCategory]:
        _, skills = self._load_all()
        return skills

    def load_all(
        self, use_ai: bool = False, progress_cb=None, log_cb=None
    ) -> tuple[list[LibraryProject], list[SkillCategory]]:
        """Public single-pass loader. Intended for use with run_in_executor."""
        return self._load_all(use_ai=use_ai, progress_cb=progress_cb, log_cb=log_cb)

    # ── Internal single-pass loader ───────────────────────────────────────────

    def _load_all(
        self, use_ai: bool = False, progress_cb=None, log_cb=None
    ) -> tuple[list[LibraryProject], list[SkillCategory]]:
        """Parse every JSON file exactly once and return both projects and skills.

        This avoids the double file-read that would occur if get_all_projects()
        and get_all_skills() each iterated the folder independently.
        """
        project_candidates: dict[str, LibraryProject] = {}
        skill_merged: dict[str, list[str]] = {}

        active_merger = (
            self._ai_merger if (use_ai and self._ai_merger) else self._merger
        )
        
        if hasattr(active_merger, "set_logger") and log_cb:
            active_merger.set_logger(log_cb)

        files = list(sorted(self._json_folder.glob("*.json"), key=lambda f: f.name))
        total_files = len(files)
        
        if log_cb:
            log_cb(f"Found {total_files} JSON templates to analyze.", "info")

        for index, path in enumerate(files):
            if progress_cb:
                # 90% space given to reading and processing 
                progress_cb(index, max(1, total_files))
            
            # Artificial micro-delay allows PySide UI to animate smoothly across loop iterations
            time.sleep(0.04)

            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                resume = ResumeData.model_validate(data)
            except Exception as e:
                if log_cb:
                    log_cb(f"Failed parsing {path.name}: {e}", "warning")
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
                # Normalize name: remove anything in parentheses and strip
                normalized_name = re.sub(r"\s*\(.*?\)", "", p.name).strip().lower()

                # First, check exact match on normalized name
                best_match_key = None
                if normalized_name in project_candidates:
                    best_match_key = normalized_name
                else:
                    # Second, fuzzy match against existing keys
                    matches = difflib.get_close_matches(
                        normalized_name, project_candidates.keys(), n=1, cutoff=0.75
                    )
                    if matches:
                        best_match_key = matches[0]

                if best_match_key is None:
                    # Completely new project
                    project_candidates[normalized_name] = entry
                else:
                    # Merge with existing
                    existing = project_candidates[best_match_key]
                    project_candidates[best_match_key] = active_merger.merge(
                        entry, existing
                    )

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

        if progress_cb:
            progress_cb(total_files, total_files)

        return projects, skills

    @staticmethod
    def _normalize_items(items: list[str]) -> list[str]:
        """Split any comma-separated single-item list into individual skill entries."""
        if len(items) == 1 and "," in items[0]:
            return [x.strip() for x in items[0].split(",") if x.strip()]
        return [x.strip() for x in items if x.strip()]
