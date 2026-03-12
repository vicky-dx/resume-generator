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
    item_spacing: float = 2.0,
    section_spacing: int = 10,
    entry_spacing: int = 8,
    bullet_indent: float = 1.2,
    bullet: str = "•",
    use_icons: bool = False,
    extra_protected_terms: list = None,
) -> str:
    """
    Public API — wire dependencies and delegate to ResumeGeneratorService.
    This is the only function worker.py (and __main__) need to know about.
    """
    if getattr(sys, "frozen", False):
        # Running as compiled exe — use a templates/ folder next to the exe
        # so users can add/edit their own templates.
        import shutil as _shutil
        exe_dir = Path(sys.executable).parent
        template_dir = exe_dir / "templates"
        template_dir.mkdir(exist_ok=True)
        # Seed bundled templates into the folder if not already there
        bundled = Path(sys._MEIPASS) / "script" / "templates"
        if bundled.exists():
            for _tmpl in bundled.glob("*.tex"):
                if not (template_dir / _tmpl.name).exists():
                    _shutil.copy2(_tmpl, template_dir / _tmpl.name)
    else:
        script_dir = Path(__file__).resolve().parent
        template_dir = script_dir / "templates"

    import json

    if not extra_protected_terms:
        extra_protected_terms = []
        
    try:
        # Auto-protect all skills dynamically
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if 'skills' in data:
                for skill_cat in data['skills']:
                    if 'items' in skill_cat:
                        for skill in skill_cat['items']:
                            extra_protected_terms.append(skill)
    except Exception as e:
        print(f"Warning: Could not auto-protect skills from data file: {e}")

    style = StyleConfig(
        font=font,
        font_size=font_size,
        section_color=section_color,
        margin_tb=margin_tb,
        margin_lr=margin_lr,
        item_spacing=item_spacing,
        section_spacing=section_spacing,
        entry_spacing=entry_spacing,
        bullet_indent=bullet_indent,
        bullet=bullet,
        use_icons=use_icons,
        extra_protected_terms=extra_protected_terms or [],
    )
    escaper = build_default_escaper(
        track_protected=True, extra_terms=extra_protected_terms or []
    )
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
