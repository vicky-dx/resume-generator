"""
GUI-layer protocols (interfaces).
High-level widgets depend on these abstractions — not on concrete service classes.
"""

from pathlib import Path
from typing import Protocol, runtime_checkable


@runtime_checkable
class ITemplateLoader(Protocol):
    """
    Narrow read-only interface consumed by TemplateTab.
    ISP: the tab only needs to load a template, not save or list.
    """

    def load_template(self, filename: str) -> dict: ...


@runtime_checkable
class IFileManager(Protocol):
    """
    Full file-management interface for main_window.py.

    TODO (DIP): ResumeGeneratorMainWindow should receive IFileManager via its
    constructor rather than constructing FileManager itself in _setup_services().
    Wire the concrete FileManager in main.py and inject it here so the window
    depends only on this abstraction.
    """

    def list_templates(self) -> list[str]: ...
    def load_template(self, filename: str) -> dict: ...
    def save_template(self, filename: str, data: dict) -> Path: ...
    def template_exists(self, filename: str) -> bool: ...
