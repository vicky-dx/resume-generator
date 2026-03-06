#!/usr/bin/env python3
"""
Resume Generator — public facade.
Wires up all SOLID-compliant components and exposes generate_resume().
worker.py calls this function with the same signature as before.
"""

import sys
from pathlib import Path
from typing import Tuple

from script.config import build_default_escaper
from script.builder import (
    StyleConfig,
    JinjaEnvConfigurator,
    JinjaLatexDocumentBuilder,
    build_jinja_env,
)
from script.service import ResumeGeneratorService


def generate_resume(
    data_file: str = "resume_data.json",
    output_file: str = "python-generated.tex",
    template_name: str = "classic.tex",
    font: str = "Calibri",
    font_size: float = 11.5,
    section_color: Tuple[int, int, int] = (96, 36, 191),
    margin_tb: float = 0.5,
    margin_lr: float = 0.5,
) -> str:
    """
    Public API — wire dependencies and delegate to ResumeGeneratorService.
    This is the only function worker.py (and __main__) need to know about.
    """
    script_dir = Path(__file__).resolve().parent
    template_dir = script_dir / "templates"

    style = StyleConfig(
        font=font,
        font_size=font_size,
        section_color=section_color,
        margin_tb=margin_tb,
        margin_lr=margin_lr,
    )
    escaper = build_default_escaper(track_protected=True)
    env = build_jinja_env(template_dir)
    JinjaEnvConfigurator().configure(env, style, escaper)
    builder = JinjaLatexDocumentBuilder(env, escaper, template_name)
    service = ResumeGeneratorService(builder, escaper)

    result = service.generate(data_file, output_file)

    print(f"[SUCCESS] Resume generated via template '{template_name}': {output_file}")
    terms = escaper.protected_found
    if terms:
        print(f"[PROTECTED] {len(terms)} terms protected from hyphenation")
        print(f"  {', '.join(sorted(terms))}")

    return result


if __name__ == "__main__":
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        input_file = "resume_data.json"

    if len(sys.argv) > 2:
        out_file = sys.argv[2]
    else:
        stem = Path(input_file).stem
        out_stem = stem.replace("_data", "") if "_data" in stem else stem
        out_file = f"{out_stem}.tex"

    generate_resume(input_file, out_file)
