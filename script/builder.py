"""
Document builder layer.

StyleConfig             — dataclass holding all LaTeX style parameters
JinjaEnvConfigurator    — registers filters and globals on a Jinja2 Environment (OCP)
JinjaLatexDocumentBuilder — IDocumentBuilder implementation (DIP: deps injected)
build_jinja_env         — factory that constructs the raw jinja2.Environment
"""

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Tuple

import jinja2

from script.protocols import IEscaper


# ── Helper filters (pure functions, no class state needed) ────────────────


def _split_company_name(raw: str) -> str:
    if ", " in raw:
        return raw.rsplit(", ", 1)[0].strip()
    return raw.strip()


def _split_company_city(raw: str) -> str:
    if ", " in raw:
        return raw.rsplit(", ", 1)[1].strip()
    return ""


def _split_position_title(raw: str) -> str:
    m = re.search(r"\(([^)]+)\)$", raw.strip())
    return raw[: m.start()].strip() if m else raw.strip()


def _split_position_type(raw: str) -> str:
    m = re.search(r"\(([^)]+)\)$", raw.strip())
    return m.group(1) if m else ""


# ── StyleConfig ───────────────────────────────────────────────────────────


@dataclass
class StyleConfig:
    """All LaTeX style parameters in one cohesive unit."""

    font: str = "Calibri"
    font_size: float = 11.5
    section_color: Tuple[int, int, int] = field(default_factory=lambda: (96, 36, 191))
    margin_tb: float = 0.5
    margin_lr: float = 0.6
    item_spacing: float = 2.0
    section_spacing: int = 10
    entry_spacing: int = 8
    bullet_indent: float = 1.2
    bullet: str = "•"
    use_icons: bool = False
    extra_protected_terms: list = field(default_factory=list)


# ── JinjaEnvConfigurator — OCP: extend here, never touch the builder ──────


class JinjaEnvConfigurator:
    """
    Single responsibility: configure a Jinja2 Environment.
    Registers custom filters and injects style globals.
    Adding new filters/globals = edit only this class.
    """

    def configure(
        self,
        env: jinja2.Environment,
        style: StyleConfig,
        escaper: IEscaper,
    ) -> None:
        # ── filters ──────────────────────────────────────────────────────
        def recursive_escape(val):
            if isinstance(val, str):
                return escaper.escape(val)
            if isinstance(val, list):
                return [recursive_escape(item) for item in val]
            if isinstance(val, dict):
                return {k: recursive_escape(v) for k, v in val.items()}
            return val

        env.filters["escape_latex"] = recursive_escape
        env.filters["split_company_name"] = _split_company_name
        env.filters["split_company_city"] = _split_company_city
        env.filters["split_position_title"] = _split_position_title
        env.filters["split_position_type"] = _split_position_type

        # ── globals (style params available to every template) ────────────
        env.globals["font"] = style.font
        env.globals["font_size"] = style.font_size
        env.globals["section_color"] = style.section_color
        env.globals["margin_tb"] = style.margin_tb
        env.globals["margin_lr"] = style.margin_lr
        env.globals["item_spacing"] = style.item_spacing
        env.globals["section_spacing"] = style.section_spacing
        env.globals["entry_spacing"] = style.entry_spacing
        env.globals["bullet_indent"] = style.bullet_indent
        env.globals["bullet"] = style.bullet
        env.globals["use_icons"] = style.use_icons


# ── Factory ───────────────────────────────────────────────────────────────


def build_jinja_env(template_dir: Path) -> jinja2.Environment:
    """Factory: construct a raw Jinja2 Environment with LaTeX-safe delimiters."""
    return jinja2.Environment(
        loader=jinja2.FileSystemLoader(str(template_dir)),
        block_start_string="<%",
        block_end_string="%>",
        variable_start_string="<<",
        variable_end_string=">>",
        comment_start_string="<#",
        comment_end_string="#>",
        trim_blocks=True,
        lstrip_blocks=True,
    )


# ── JinjaLatexDocumentBuilder — IDocumentBuilder implementation ───────────


class JinjaLatexDocumentBuilder:
    """
    IDocumentBuilder implementation backed by Jinja2.
    All dependencies are injected — no filesystem or escaper construction here.
    """

    def __init__(
        self,
        env: jinja2.Environment,
        escaper: IEscaper,
        template_name: str,
    ):
        self._env = env
        self._escaper = escaper
        self._template_name = template_name

    def build(self, data: dict) -> str:
        escape_fn = self._env.filters["escape_latex"]
        escaped = escape_fn(data)
        template = self._env.get_template(self._template_name)
        return template.render(**escaped)
