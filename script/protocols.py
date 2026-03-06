"""
Protocols (interfaces) for the resume generator.
All concrete implementations must satisfy these contracts.
"""

from typing import Protocol, Tuple, runtime_checkable


@runtime_checkable
class IEscaper(Protocol):
    """Converts raw user text into LaTeX-safe output."""

    def escape(self, text: str) -> str: ...


@runtime_checkable
class IDocumentBuilder(Protocol):
    """Renders a data dict into a LaTeX document string."""

    def build(self, data: dict) -> str: ...


@runtime_checkable
class IResumeGenerator(Protocol):
    """
    Generates a LaTeX file from JSON data and returns the output file path.
    worker.py depends on this abstraction — not on generate_resume() directly.
    """

    def __call__(
        self,
        data_file: str,
        output_file: str,
        template_name: str = ...,
        font: str = ...,
        font_size: float = ...,
        section_color: Tuple[int, int, int] = ...,
        margin_tb: float = ...,
        margin_lr: float = ...,
    ) -> str: ...
