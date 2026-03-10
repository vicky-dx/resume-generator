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
│   │   ├── file_manager.py      # Reads/writes JSON template files
│   │   └── library_service.py   # Aggregates projects & skills from all JSON files
│   └── widgets/
│       ├── form_editor/         # Per-section form widgets (experience, education, etc.)
│       ├── template_tab.py      # Template selector tab
│       ├── quick_create_tab.py  # Raw JSON editor / quick-create tab
│       ├── library_tab.py       # Library tab — unified projects & skills viewer
│       ├── json_editor.py       # Syntax-highlighted JSON editor component
│       ├── format_toolbar.py    # Bold / Italic toolbar for the JSON editor
│       ├── action_panel.py      # Style settings + Generate PDF / Open Folder
│       └── log_panel.py         # Build output log viewer
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

## Using the GUI

The application window is divided into a **top tab area** (for managing resume data) and a **bottom action panel** (for styling and generation).

---

### Top area — tabs

#### Tab 1 · Templates

Shows all JSON resume files found in `job-role-json/`.

| Control | What it does |
|---|---|
| **File list** | Click a row to select that JSON as the active resume |
| **Edit** button | Loads the selected JSON into the Quick Create editor for editing |
| **Refresh** button | Rescans `job-role-json/` and reloads the list |
| Double-click a row | Same as clicking Edit |

---

#### Tab 2 · Quick Create

A raw JSON editor for creating or editing resume files.

| Control | What it does |
|---|---|
| **Resume Name** input | File name for saving (without `.json`), e.g. `ml-engineer` |
| **JSON editor** | Full-width code editor with syntax highlighting |
| **B** (bold) button | Wraps the selected text in `**...**` (markdown bold) |
| **I** (italic) button | Wraps the selected text in `*...*` (markdown italic) |
| **Paste** button | Pastes clipboard content directly into the editor |
| **✓ Validate JSON** button | Checks whether the editor content is valid JSON and shows a pass/fail message |
| **Save Template** button | Saves the editor content as `<resume-name>.json` in `job-role-json/` |
| **Clear** button | Clears both the name field and the editor |

---

#### Tab 3 · Library  *(read-only)*

Aggregates projects and skills from **all** JSON files at once. Loaded asynchronously so the UI never freezes.

**Projects sub-tab** — master-detail layout

| Control | What it does |
|---|---|
| **Project list** (left panel) | All unique projects across every JSON, sorted A→Z. Click a row to view its detail. |
| **Refresh** icon button (beside "All Projects" label) | Reloads all JSON files and repopulates both Projects and Skills in one pass |
| **Detail panel** (right panel) | Shows the selected project's name, year, source file badge, tech-stack tags, and description |

**Skills sub-tab** — tag grid

| Control | What it does |
|---|---|
| **Category headers** | Skill categories (e.g. Languages, Cloud) merged and deduplicated across all JSONs |
| **Skill tags** | Individual skills displayed as styled tag chips under each category |

---

### Bottom area — Action Panel

The horizontal panel below the tabs is always visible when you are on Tab 1 or Tab 2. It has three rows of settings on the left and action buttons on the right.

---

#### 🎨 Style row

##### Template
Selects the `.tex` layout template from `script/templates/`. Any `.tex` file you drop in that folder appears here automatically.

| Value | Meaning |
|---|---|
| `classic.tex` | The default single-column resume layout shipped with the project |
| *(your file)* | Any custom `.tex` template you add to `script/templates/` |

##### Font
Base font family applied across the entire document.

| Value | Character |
|---|---|
| `Calibri` | Clean, modern sans-serif — good for tech roles *(default)* |
| `Arial` | Neutral, widely recognised sans-serif |
| `Georgia` | Serif typeface, more traditional/academic feel |
| `Times New Roman` | Classic serif, formal and dense |
| `Verdana` | Wide sans-serif, very readable at small sizes |

> Note: the font must be installed on your system — xelatex loads it directly via fontspec.

##### Size
Base font size in typographic points. All other sizes in the document (headings, labels) scale relative to this value.

| Value | When to use |
|---|---|
| `9.0 pt` | Very compact — fits maximum content, but can feel cramped |
| `9.5 pt` | Compact — good for dense, experience-heavy resumes |
| `10.0 pt` | Standard small size |
| `10.5 pt` | Comfortable small size |
| `11.0 pt` | Standard readable size |
| `11.5 pt` | **Default** — best balance of readability and content density |
| `12.0 pt` | Larger — use when the resume is short and you want to fill the page |
| `12.5 pt` | Generous — noticeable white space |
| `13.0 pt` | Maximum — very open, suited for 1–2 page short resumes |

##### Colour (swatch button)
Opens a colour picker dialog. The chosen colour is applied to all section headings (e.g. *Experience*, *Education*, *Skills*). The button itself shows the currently selected colour. Default is purple `rgb(96, 36, 191)`.

---

#### 📏 Layout row

##### Margins TB  — Top & Bottom
Controls how much blank space appears at the very top and bottom edges of each PDF page. Measured in inches.

| Value | What it looks like |
|---|---|
| `0.3 in` | Nearly no top/bottom border — maximises content area, can look very tight |
| `0.4 in` | Compact — slightly cramped at extremes |
| `0.5 in` | **Default** — standard breathing room at top and bottom |
| `0.6 in` | Comfortable — visually relaxed |
| `0.7 in` | Generous — noticeably more white space |
| `0.8 in` | Very spacious — significantly reduces usable page height |

> Practical rule: if your resume overflows to a second page, decrease TB margin first (e.g. `0.4 in`). If it looks crammed, increase it.

##### LR — Left & Right
Controls the blank space on the left and right sides of each page. Measured in inches.

| Value | What it looks like |
|---|---|
| `0.4 in` | Very narrow side gutters — wide text column, dense appearance |
| `0.5 in` | Compact sides |
| `0.6 in` | **Default** — standard professional margin |
| `0.7 in` | Comfortable — slightly narrower text column |
| `0.8 in` | Generous white space on sides |
| `0.9 in` | Wide margins — significantly narrows the text column |

> Practical rule: recruiters often print resumes; generous LR margins (`0.6–0.7 in`) look better on paper.

##### Section gap
The vertical space inserted **between major sections** of the resume (e.g. the gap between the *Skills* block and the *Experience* block). Measured in typographic points (pt). 1 pt ≈ 0.35 mm.

| Value | What it looks like |
|---|---|
| `4 pt` | Tightly packed sections — barely any visible gap |
| `6 pt` | Compact — subtle visual separation |
| `8 pt` | **Default** — clear, clean separation between sections |
| `10 pt` | Comfortable — sections feel well spaced |
| `12 pt` | Spacious — prominent visual breaks |
| `14 pt` | Very spacious — use only on short resumes to fill the page |

##### Entry gap
The vertical space inserted **between individual entries within a section** (e.g. between two job positions inside *Work Experience*, or between two degrees inside *Education*). Measured in points.

| Value | What it looks like |
|---|---|
| `4 pt` | Entries run close together — compact, dense |
| `6 pt` | Slight breathing room between entries |
| `8 pt` | **Default** — standard separation between items |
| `10 pt` | Comfortable — clear distinction between entries |
| `12 pt` | Spacious — each entry stands out noticeably |
| `14 pt` | Very spacious — primarily useful to pad a short resume |

> Section gap > Entry gap is the typical pattern: sections should be more visually separated than entries within them.

##### Line Spacing
Extra spacing added **between lines of text inside bullet points**. This is in *addition* to the font's natural line height. Measured in points.

| Value | What it looks like |
|---|---|
| `0` | Natural line height only — tightest possible, matches plain LaTeX default |
| `0.3 pt` | Very subtle extra air — almost imperceptible |
| `0.5 pt` | **Default** — slight openness that improves readability |
| `0.8 pt` | Noticeably more open lines |
| `1.0 pt` | One full extra point — visibly airy bullets |
| `1.5 pt` | Comfortable reading rhythm, similar to 1.15 line spacing in Word |
| `2.0 pt` | Very open — best suited for short resumes that need to fill a page |

---

#### 📋 Details row

##### Bullet
The symbol placed at the start of each achievement bullet point.

| Value | Symbol | Character | When to use |
|---|---|---|---|
| `• bullet` | `•` | U+2022 | Classic bullet — universally recognised *(default)* |
| `– dash` | `–` | U+2013 en dash | Clean, minimal — popular in modern resumes |
| `› arrow` | `›` | U+203A single angle | Subtle directional, slightly more stylised |
| `→ right arrow` | `→` | U+2192 | Bold directional — strong visual emphasis |

##### Indent
The left indent applied before each bullet point. Measured in **em units**, where `1 em` equals the width of the current font's letter "M" — it scales automatically with the font size you chose in the Style row.

| Value | What it looks like |
|---|---|
| `0.2 em` | Barely any indent — bullets sit almost at the left margin |
| `0.4 em` | Minimal indent |
| `0.6 em` | Subtle indent |
| `0.8 em` | Moderate indent |
| `1.0 em` | Standard indent — one character width |
| `1.2 em` | **Default** — clean visual separation from the left margin |
| `1.5 em` | Wide indent — significant whitespace before each bullet |

> Because em is relative, `1.2 em` at `11.5 pt` and at `10 pt` will produce different absolute distances — the bullet always looks proportionate to the text.

##### Icons (fa5) checkbox
When **checked** (default), the LaTeX build loads the `fontawesome5` package. This allows templates to use `\faIcon{icon-name}` commands for small inline icons next to contact info, section titles, etc. Uncheck this only if your LaTeX installation does not have fontawesome5 installed, which can cause build errors.

##### Protect
A comma-separated list of terms that the LaTeX escaper must **not** alter. By default, special characters like `#`, `&`, `_`, `%` are escaped for LaTeX safety. Any term you enter here is passed through verbatim — preserving its exact casing and symbols.

Example: `React, AWS, C++, .NET, CI/CD`

Without protection, `C++` would become `C{+}{+}` in the LaTeX source (harmless but ugly); with protection it stays `C++`. Use this for technology names, acronyms, or any term where the exact string matters.

---

#### Action buttons (right side)

| Button | What it does |
|---|---|
| **Generate PDF** | Applies all current style settings, renders the selected JSON → LaTeX via the chosen template, then compiles with xelatex. The button shows "Generating…" and is disabled while the build is running to prevent double-firing. |
| **Open Folder** | Opens the `xelatex-resume/` output directory in Windows Explorer so you can access the compiled PDF immediately |

---

### Log Panel

A collapsible panel below the action area shows the real-time build log — xelatex compiler output, warnings, and errors — so you can diagnose rendering issues without leaving the app.

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

