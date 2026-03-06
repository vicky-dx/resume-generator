import pytest
from pathlib import Path

from script.builder import (
    JinjaLatexDocumentBuilder,
    build_jinja_env,
    JinjaEnvConfigurator,
    StyleConfig,
)
from script.escaper import LatexEscaper
from script.config import build_default_escaper


# Create a temporary template for testing the Builder's injection engine
@pytest.fixture
def temp_template_dir(tmp_path):
    template_dir = tmp_path / "templates" / "test_theme"
    template_dir.mkdir(parents=True)

    # Write dummy template
    template_file = template_dir / "resume.tex"
    template_file.write_text(
        r"Name is << personal_info.name >>. Job is << experience[0].position >>."
    )

    return template_dir


@pytest.fixture
def dummy_builder(latex_escaper, temp_template_dir):
    env = build_jinja_env(temp_template_dir)
    JinjaEnvConfigurator().configure(env, StyleConfig(), latex_escaper)
    return JinjaLatexDocumentBuilder(env, latex_escaper, "resume.tex")


def test_builder_jinja_rendering(dummy_builder):
    resume_data = {
        "personal_info": {"name": "Alice & Bob"},  # Test auto-escaping logic
        "experience": [{"position": "Dev**Ops**"}],  # Test auto-markup logic
    }

    built_tex = dummy_builder.build(resume_data)

    # Verify the jinja template mapped the variables, and ALSO correctly
    # piped those variable values into the LatexEscaper implicitly
    assert r"Name is Alice \& Bob." in built_tex
    assert r"Job is Dev\textbf{Ops}." in built_tex


# ── Integration test: render classic.tex with real resume data ────────────────
# This catches regressions in the actual template (skills format, field names, etc.)
# without requiring xelatex to be installed.


@pytest.fixture
def classic_builder():
    template_dir = Path(__file__).resolve().parent.parent / "script" / "templates"
    escaper = build_default_escaper(track_protected=False)
    env = build_jinja_env(template_dir)
    JinjaEnvConfigurator().configure(env, StyleConfig(), escaper)
    return JinjaLatexDocumentBuilder(env, escaper, "classic.tex")


MINIMAL_RESUME = {
    "personal_info": {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "location": "London",
    },
    "summary": "Experienced engineer.",
    "skills": [
        {"category": "Languages", "items": ["Python", "SQL"]},
        {"category": "Cloud & DevOps", "items": ["AWS", "Docker"]},
    ],
    "experience": [
        {
            "company": "Acme Corp, London",
            "position": "Data Engineer (On-Site)",
            "duration": "Jan 2022 - Present",
            "achievements": ["Built pipelines.", "Reduced costs by 30%."],
        }
    ],
    "education": [
        {
            "institution": "University of London",
            "degree": "BSc Computer Science",
            "duration": "Sep 2018 - Jun 2022",
            "Relevant coursework": ["Algorithms", "Databases"],
        }
    ],
    "projects": [],
    "awards": [],
}


def test_classic_template_renders_without_error(classic_builder):
    """Rendering classic.tex must not raise — catches template/data contract breaks."""
    result = classic_builder.build(MINIMAL_RESUME)
    assert isinstance(result, str)
    assert len(result) > 0


def test_classic_template_skills_list_format(classic_builder):
    """Skills must render as a list of {category, items} objects, not a dict."""
    result = classic_builder.build(MINIMAL_RESUME)
    assert "Languages" in result
    assert "Python" in result
    assert "Cloud" in result
    assert "Docker" in result


def test_classic_template_skills_last_row_no_trailing_newline(classic_builder):
    """Last skills row must NOT end with \\\\ — causes tabularx LaTeX error."""
    result = classic_builder.build(MINIMAL_RESUME)
    # Find the tabularx block
    start = result.index(r"\begin{tabularx}")
    end = result.index(r"\end{tabularx}", start)
    skills_block = result[start:end]
    # The line immediately before \end{tabularx} must not end with \\
    last_row = [l for l in skills_block.splitlines() if l.strip()][-1]
    assert not last_row.rstrip().endswith(
        "\\\\"
    ), f"Last skills row ends with \\\\\\\\ which breaks tabularx: {last_row!r}"


def test_classic_template_no_double_escaping_of_ampersand(classic_builder):
    """build() pre-escapes all data, so template must NOT also apply | escape_latex.
    A category like 'Cloud & DevOps' must appear as '\\&', not '\\\\&'.
    Double-escaping breaks tabularx column separators.
    """
    result = classic_builder.build(MINIMAL_RESUME)
    # \\& in the raw string = the four characters: backslash backslash ampersand
    assert "\\\\&" not in result, (
        "Double-escaped & found ('\\\\\\\\&'). "
        "Remove | escape_latex from template — build() pre-escapes already."
    )
    # The correctly-escaped form must be present
    assert r"\&" in result

    result = classic_builder.build(MINIMAL_RESUME)
    assert "Acme Corp" in result
    assert "Built pipelines" in result


def test_classic_template_empty_sections_dont_crash(classic_builder):
    """Sections with empty lists must not raise UndefinedError or similar."""
    sparse = {
        "personal_info": {"name": "Test"},
        "summary": "",
        "skills": [],
        "experience": [],
        "education": [],
        "projects": [],
        "awards": [],
    }
    result = classic_builder.build(sparse)
    assert isinstance(result, str)


# ── Regression tests for experience / projects / awards trailing \\ fix ───────

RESUME_WITH_PROJECTS_AND_AWARDS = {
    **MINIMAL_RESUME,
    "projects": [
        {
            "name": "Vertex-ADK",
            "year": "2024",
            "technologies": "Python, GCP",
            "description": [
                "Deployed an **intelligent agent** using the Google ADK framework."
            ],
        }
    ],
    "awards": [
        {
            "title": "AWS Certified Solutions Architect",
            "description": "Professional level",
        },
        {"title": "Dean's List", "description": ""},
    ],
}


def test_classic_template_project_description_no_list_repr(classic_builder):
    """proj.description is a list; template must join it, not render Python repr.
    Output must NOT contain '[\"' or '\"]' (Python list repr brackets).
    """
    result = classic_builder.build(RESUME_WITH_PROJECTS_AND_AWARDS)
    assert (
        '["' not in result
    ), "Python list repr '[\"' found in rendered project description"
    assert (
        '"]' not in result
    ), "Python list repr '\"]' found in rendered project description"
    assert "Vertex-ADK" in result
    assert "intelligent agent" in result


def test_classic_template_project_description_no_double_backslash_commands(
    classic_builder,
):
    """List repr of escaped strings yields '\\\\textbf' in output.
    The correct output is '\\textbf' (single backslash in the .tex file).
    """
    result = classic_builder.build(RESUME_WITH_PROJECTS_AND_AWARDS)
    assert (
        "\\\\textbf" not in result
    ), "Double-backslash '\\\\textbf' found — description renders as Python list repr"
    assert r"\textbf" in result  # bold markup must be present


def test_classic_template_project_last_row_no_trailing_slash(classic_builder):
    """Last line before \\end{tabular} in projects section must not end with \\\\."""
    result = classic_builder.build(RESUME_WITH_PROJECTS_AND_AWARDS)
    # Locate the projects tabular block
    marker = r"\section*{PROJECT WORK}"
    assert marker in result
    proj_start = result.index(marker)
    proj_end = result.index(r"\end{tabular}", proj_start)
    proj_block = result[proj_start:proj_end]
    last_row = [l for l in proj_block.splitlines() if l.strip()][-1]
    assert not last_row.rstrip().endswith(
        "\\\\"
    ), f"Last project row has trailing \\\\ before \\end{{tabular}}: {last_row!r}"


def test_classic_template_awards_last_row_no_trailing_slash(classic_builder):
    """Last line before \\end{tabular} in awards section must not end with \\\\."""
    result = classic_builder.build(RESUME_WITH_PROJECTS_AND_AWARDS)
    marker = r"\section*{AWARDS AND CERTIFICATES}"
    assert marker in result
    awards_start = result.index(marker)
    awards_end = result.index(r"\end{tabular}", awards_start)
    awards_block = result[awards_start:awards_end]
    last_row = [l for l in awards_block.splitlines() if l.strip()][-1]
    assert not last_row.rstrip().endswith(
        "\\\\"
    ), f"Last award row has trailing \\\\ before \\end{{tabular}}: {last_row!r}"


def test_classic_template_experience_last_achievement_no_trailing_slash(
    classic_builder,
):
    """Last achievement bullet must not end with \\\\ before \\end{tabular}."""
    result = classic_builder.build(MINIMAL_RESUME)
    marker = r"\section*{WORK EXPERIENCE}"
    assert marker in result
    exp_start = result.index(marker)
    exp_end = result.index(r"\end{tabular}", exp_start)
    exp_block = result[exp_start:exp_end]
    last_row = [l for l in exp_block.splitlines() if l.strip()][-1]
    assert not last_row.rstrip().endswith(
        "\\\\"
    ), f"Last experience achievement has trailing \\\\ before \\end{{tabular}}: {last_row!r}"
