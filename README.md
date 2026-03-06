# Resume Automation

A PySide6 desktop application for generating professional PDF resumes from JSON
data files. Resume content is stored as structured JSON, rendered into LaTeX via
Jinja2 templates, and compiled to PDF with xelatex.

---

## Requirements

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (package manager)
- A LaTeX distribution with xelatex:
  - Windows: [MiKTeX](https://miktex.org/) or [TeX Live](https://www.tug.org/texlive/)
  - Linux: `sudo apt install texlive-xetex`
  - macOS: [MacTeX](https://www.tug.org/mactex/)

---

## Setup

```powershell
uv sync
```

This creates `.venv` and installs all dependencies from `pyproject.toml`.

---

## Running the App

```powershell
uv run main.py
```

---

## Project Structure

```
resume-automation/
├── main.py                      # Entry point — wires dependencies and launches GUI
├── pyproject.toml               # Project metadata and dependencies (uv)
│
├── gui/                         # PySide6 GUI layer
│   ├── main_window.py           # Root window
│   ├── models.py                # Pydantic data models (ResumeData, Experience, etc.)
│   ├── protocols.py             # Interfaces: IFileManager, ITemplateLoader
│   ├── config.py                # UI constants (colours, sizes)
│   ├── worker.py                # Async generation worker (non-blocking)
│   ├── services/
│   │   └── file_manager.py      # Reads/writes JSON template files
│   └── widgets/
│       ├── form_editor/         # Per-section form widgets (experience, education, etc.)
│       ├── template_tab.py      # Template selector tab
│       ├── json_editor.py       # Raw JSON editor with syntax highlighting
│       ├── action_panel.py      # Generate / save buttons
│       └── log_panel.py         # Output log viewer
│
├── script/                      # PDF generation backend
│   ├── generate_resume.py       # Public facade — entry point for generation
│   ├── builder.py               # Jinja2 → LaTeX renderer
│   ├── escaper.py               # LaTeX special-character escaper
│   ├── service.py               # Orchestrates build + file I/O
│   ├── config.py                # Backend constants and escaper setup
│   ├── protocols.py             # Interfaces: IEscaper, IDocumentBuilder, IResumeGenerator
│   └── templates/
│       ├── classic.tex          # Default resume template
│       └── TEMPLATE_GUIDE.md    # Guide for writing custom templates
│
├── job-role-json/               # Resume data files (one JSON per role/variant)
├── xelatex-resume/              # Compiled .tex and .pdf output
├── assets/
│   └── style.qss                # Qt stylesheet
└── tests/
    ├── conftest.py
    ├── test_builder.py          # Integration tests for Jinja2 rendering
    ├── test_escaper.py
    └── test_models.py
```

---

## JSON Resume Format

Each file in `job-role-json/` follows this structure:

```json
{
  "personal_info": {
    "name": "Your Name",
    "tagline": "Data Engineer | Python | AWS",
    "email": "you@example.com",
    "phone": "+91 9999999999",
    "location": "City, Country",
    "github": "https://github.com/username",
    "linkedin": "https://linkedin.com/in/username"
  },
  "summary": "One or two sentence professional summary.",
  "skills": [
    { "category": "Languages", "items": ["Python", "SQL", "Java"] },
    { "category": "Cloud", "items": ["AWS", "GCP", "Docker"] }
  ],
  "experience": [
    {
      "company": "Company Name, City",
      "position": "Job Title (Work Type)",
      "duration": "Jan 2022 - Present",
      "achievements": [
        "Built a real-time pipeline processing 1M events/day.",
        "Reduced query latency by 40%."
      ]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Bachelor of Computer Science",
      "duration": "Aug 2017 - Jun 2021",
      "Relevant coursework": ["Algorithms", "Databases", "ML"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "year": "2024",
      "technologies": "Python, FastAPI, PostgreSQL",
      "description": ["Built an API serving 10k requests/day."]
    }
  ],
  "awards": [
    { "title": "AWS Certified Solutions Architect", "description": "Professional level" }
  ]
}
```

### Field notes

- `skills` — list of `{ category, items[] }` objects, not a flat dict
- `experience.achievements` — list of strings, one per bullet point
- `project.description` — list of strings joined inline during rendering
- `education.duration` and `experience.duration` — free-form string, e.g. `"Jan 2022 - Present"`

---

## Custom Templates

Drop any `.tex` file into `script/templates/` and it appears automatically in
the GUI template selector. Templates use Jinja2 with LaTeX-safe delimiters:

| Purpose | Syntax |
|---------|--------|
| Variable | `<< variable >>` |
| For loop | `<% for x in list %> ... <% endfor %>` |
| Conditional | `<% if condition %> ... <% endif %>` |

See [script/templates/TEMPLATE_GUIDE.md](script/templates/TEMPLATE_GUIDE.md) for the full variable
reference, available filters, and worked examples.

---

## Running Tests

```powershell
uv run pytest tests/ -v
```

Tests cover Jinja2 rendering correctness, LaTeX escaping, and Pydantic model
validation — no xelatex installation required.

---

## Creating a New Resume Variant

1. Copy an existing file from `job-role-json/`, e.g. `cp base-resume_data.json ml-engineer.json`
2. Open the file and tailor: summary, skills order, achievements, projects
3. In the GUI, select the file from the template list and click Generate
4. The compiled PDF lands in `xelatex-resume/`

