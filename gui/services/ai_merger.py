"""Strategies for merging using an LLM.

Adheres to SOLID principles:
- Depends on the ILLMClient abstraction (Dependency Inversion).
- Depends on the IPayloadBuilder abstraction for prompt creation (SRP).
- Implements IProjectMerger so it can be swapped effortlessly in LibraryService (Liskov Substitution & Open-Closed).
"""

import json
import hashlib
from pathlib import Path
from typing import Protocol

from gui.models import LibraryProject
from gui.services.library_service import IProjectMerger


class ILLMClient(Protocol):
    """Abstraction for generating responses from an LLM."""

    def generate_json(self, prompt: str, system_prompt: str = "") -> dict:
        """Sends a prompt and returns the output parsed as a JSON dictionary."""
        ...


class IPayloadBuilder(Protocol):
    """Middle layer for creating a payload/prompt for the LLM service."""

    def build_system_prompt(self) -> str: ...
    def build_user_prompt(self, p1: LibraryProject, p2: LibraryProject) -> str: ...


class ProjectMergePayloadBuilder(IPayloadBuilder):
    """Concrete payload builder for merging two versions of a project."""

    def build_system_prompt(self) -> str:
        return (
            "You are a professional resume writer. Your job is to merge two versions "
            "of the same project into one comprehensive version. Output the result "
            "strictly as a JSON object."
        )

    def build_user_prompt(self, p1: LibraryProject, p2: LibraryProject) -> str:
        dict1 = {
            "tech_stack": p1.tech_stack,
            "date": p1.date,
            "description": p1.description,
        }
        dict2 = {
            "tech_stack": p2.tech_stack,
            "date": p2.date,
            "description": p2.description,
        }
        return f"""We have two versions of a project named "{p1.name}".
Version 1:
{json.dumps(dict1, indent=2)}

Version 2:
{json.dumps(dict2, indent=2)}

Please combine the tech stacks, find the most accurate date, and merge the bullet points in the descriptions into a single, strong list of bullet points without duplicating content. Keep the best formulations.
Target the following JSON format ONLY:
{{
    "name": "{p1.name}",
    "tech_stack": "string",
    "date": "string",
    "description": ["bullet point 1", "bullet point 2"]
}}
"""


class AIMerger(IProjectMerger):
    """Merges duplicate projects intelligently using an LLM, with local caching to save tokens."""

    def __init__(self, llm_client: ILLMClient, payload_builder: IPayloadBuilder):
        self._llm = llm_client
        self._payload_builder = payload_builder
        self._cache_file = Path("ai_merge_cache.json")
        self._cache = self._load_cache()
        self._log_cb = None

    def set_logger(self, cb):
        self._log_cb = cb

    def _log(self, msg: str, level: str = "info"):
        # print(msg)  # Disabled debug for LLM as requested
        if self._log_cb:
            self._log_cb(msg, level)

    def _load_cache(self) -> dict:
        try:
            if self._cache_file.exists():
                return json.loads(self._cache_file.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Warning: Could not load cache: {e}")
        return {}

    def _save_cache(self) -> None:
        try:
            self._cache_file.write_text(
                json.dumps(self._cache, indent=2), encoding="utf-8"
            )
        except Exception as e:
            print(f"Warning: Could not save cache: {e}")

    def merge(
        self, new_project: LibraryProject, existing_project: LibraryProject
    ) -> LibraryProject:
        prompt = self._payload_builder.build_user_prompt(new_project, existing_project)
        system_prompt = self._payload_builder.build_system_prompt()

        # ── Caching Logic ──
        # Create a unique, reproducible hash of the exact prompt content
        cache_key = hashlib.md5(prompt.encode("utf-8")).hexdigest()
        if cache_key in self._cache:
            self._log(
                f"[Cache] HIT for '{new_project.name}'. Skipping LLM call.", "success"
            )
            result = self._cache[cache_key]
            return LibraryProject(
                name=result.get("name", existing_project.name),
                tech_stack=result.get("tech_stack", existing_project.tech_stack),
                date=result.get("date", existing_project.date),
                description=result.get("description", existing_project.description),
                source=f"{existing_project.source} & {new_project.source} (AI Merged [Cached])",
            )

        # ── Logging for debugging and token estimation ──
        total_chars = len(prompt) + len(system_prompt)
        approx_tokens = total_chars // 4  # A common rough estimate (4 chars per token)
        self._log(f"Merging collision: '{new_project.name}' (Est. Tokens: {approx_tokens})", "info")

        try:
            # We enforce a JSON response structure from the LLM
            result = self._llm.generate_json(prompt, system_prompt)

            # Save the successful response to cache immediately
            self._cache[cache_key] = result
            self._save_cache()

            self._log(f"Successfully optimized '{new_project.name}' via AI", "success")
            
            # Reconstruct the project from the merged data
            return LibraryProject(
                name=result.get("name", existing_project.name),
                tech_stack=result.get("tech_stack", existing_project.tech_stack),
                date=result.get("date", existing_project.date),
                description=result.get("description", existing_project.description),
                source=f"{existing_project.source} & {new_project.source} (AI Merged)",
            )
        except Exception as e:
            self._log(
                f"AI merge failed for {new_project.name}: {e}. Falling back to longer description.", "error"
            )
            # Fallback inline length-based logic
            if self._desc_len(new_project) > self._desc_len(existing_project):
                return new_project
            return existing_project

    @staticmethod
    def _desc_len(p: LibraryProject) -> int:
        return sum(len(line) for line in p.description)
