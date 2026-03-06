# Resume Template Guide

Drop any `.tex` file into this folder (`script/templates/`) and it becomes
instantly selectable in the GUI — no Python changes needed.

The generator **pre-processes your `.tex` file with Jinja2** before passing it
to XeLaTeX. This means you write ordinary LaTeX, but can embed placeholders
that get filled in from the JSON resume data.

---

## Syntax Quick-Reference

| Purpose | Syntax | Example |
|---|---|---|
| Print a value | `<< variable >>` | `<< personal_info.name >>` |
| For loop | `<% for x in list %>` … `<% endfor %>` | `<% for exp in experience %>` |
| If block | `<% if condition %>` … `<% endif %>` | `<% if personal_info.github %>` |
| Apply a filter | `<< value \| filter >>` | `<< text \| escape_latex >>` |
| Default fallback | `<< value \| default("N/A") >>` | `<< edu.gpa \| default("") >>` |

> **Why these delimiters?**  
> Standard Jinja2 uses `{{ }}` which conflicts with LaTeX braces.  
> This engine uses `<< >>` and `<% %>` instead — LaTeX ignores them completely.

---

## Available Variables

All data comes from a single JSON file. The top-level keys map directly to
template variables.

### `personal_info` — Object

```
personal_info.name        → "NIKESH CHAVHAN"
personal_info.email       → "vicky0x07@gmail.com"
personal_info.phone       → "+91 7448223125"
personal_info.location    → "Nagpur, India"
personal_info.github      → "https://github.com/vicky-dx"
personal_info.linkedin    → "https://linkedin.com/in/nikesh-chavhan"
personal_info.tagline     → "Data Engineer | Real-Time Pipelines | ..."
```

**Usage:**
```latex
\textbf{<< personal_info.name >>}
\href{<< personal_info.linkedin >>}{LinkedIn}
```

---

### `summary` — String

A single paragraph of text.

```latex
<% if summary %>
\section*{PROFESSIONAL SUMMARY}
<< summary >>
<% endif %>
```

---

### `skills` — List of objects

```json
"skills": [
    {"category": "Big Data & Streaming", "items": ["Kafka", "Spark", "Flink"]},
    {"category": "Languages",            "items": ["Python", "SQL", "Java"]}
]
```

**Usage** (iterate list of objects, use `skill['items']` for the items list):
```latex
<% for skill in skills %>
\textbf{<< skill.category >>:} << skill['items'] | join(", ") >>
<% endfor %>
```

> ⚠️ **Do NOT use `| escape_latex` in templates.** The builder pre-escapes all
> data before rendering, so applying the filter again causes double-escaping
> (e.g. `&` → `\&` → `\\&`, which breaks tabular column separators).

> ⚠️ **Do NOT emit `\\` on the last row of a `tabular`/`tabularx` block.**  
> LaTeX treats `\\` as "start a new row" — if there is no next row, it raises  
> `Forbidden control sequence` or a misaligned-columns error.  
> Use `<% if not loop.last %> \\[2pt] <% endif %>` to suppress it on the last iteration.

---

### `experience` — List of objects

Each item has:

```
exp.company      → "Tars Technologies, Nagpur"
exp.position     → "Data Engineer (On-site)"
exp.duration     → "Feb 2023 - Present"
exp.achievements → [ "Built a pipeline...", "Designed a system..." ]
```

The `position` and `company` fields support two special split filters
(see Filters section below) to separate title from type, and company from city.

**Usage:**
```latex
<% for exp in experience %>
\textbf{<< exp.company >>} \hfill \textbf{<< exp.duration >>} \\
\textit{<< exp.position >>}

<% for ach in exp.achievements %>
$\bullet$ << ach >> \\
<% endfor %>
<% endfor %>
```

**Loop helper — `loop.first` / `loop.last`:**
```latex
<% if not loop.last %> \\[6pt] <% endif %>
```

---

### `education` — List of objects

```
edu.institution  → "Shivaji Science College Nagpur"
edu.degree       → "Bachelor of Computer Science"
edu.duration     → "Aug 2017 - Jun 2021"
edu.gpa          → "CGPA: 8/10"
edu.get("Relevant coursework")  → "Algorithms, ML, ..."
```

**Usage:**
```latex
<% for edu in education %>
\textbf{<< edu.institution >>} \hfill \textbf{<< edu.duration >>} \\
<< edu.degree >> \hfill << edu.gpa | default("") >>
<% if edu.get("Relevant coursework") %>
\textit{Coursework:} << edu.get("Relevant coursework") >>
<% endif %>
<% endfor %>
```

---

### `projects` — List of objects

```
proj.name          → "Intelligent Knowledge Retrieval Pipeline"
proj.year          → "2025"  (may be empty string "")
proj.description   → ["Designed and built...", "Also did..."]  ← list of strings
proj.technologies  → "AWS S3, Lambda, PostgreSQL, Python"
```

> `proj.description` is a **list of strings** (one string per bullet point).  
> Use `| join(" ")` to render them inline, or loop to render each as a separate bullet.

**Usage (inline join):**
```latex
<% for proj in projects %>
$\bullet$ \textbf{<< proj.name >><% if proj.year %> (<< proj.year >>)<% endif %>:}
<< proj.description | join(" ") >> \\
\textit{Tech:} << proj.technologies >><% if not loop.last %> \\[2pt] <% endif %>
<% endfor %>
```

**Usage (one bullet per description line):**
```latex
<% for proj in projects %>
<% for bullet in proj.description %>
$\bullet$ \textbf{<< proj.name >>:} << bullet >><% if not loop.last %> \\ <% endif %>
<% endfor %>
<% endfor %>
```

---

### `awards` — List of objects

```
award.title        → "AWS Data Engineering Associate"
award.description  → ""   (often empty)
```

**Usage:**
```latex
<% for award in awards %>
<% if award.description %>
    $\bullet$ \textbf{<< award.title >>:} << award.description >>
<% else %>
    $\bullet$ << award.title >>
<% endif %>
<% endfor %>
```

---

## Style Parameters

These are injected by the GUI at generation time — always available in any
template:

| Variable | Type | Example | What it controls |
|---|---|---|---|
| `font` | string | `Calibri` | `\setmainfont{<< font >>}` |
| `font_size` | number | `11` | `\documentclass[<< font_size >>pt]{article}` |
| `margin_tb` | number | `0.6` | top/bottom margin in inches |
| `margin_lr` | number | `0.7` | left/right margin in inches |
| `section_color` | list `[R,G,B]` | `[96,36,191]` | colour of section headings |

**Usage:**
```latex
\documentclass[<< font_size >>pt,a4paper]{article}
\usepackage[top=<< margin_tb >>in, bottom=<< margin_tb >>in,
            left=<< margin_lr >>in, right=<< margin_lr >>in]{geometry}
\setmainfont{<< font >>}
\definecolor{sectionblue}{RGB}{<< section_color[0] >>, << section_color[1] >>, << section_color[2] >>}
```

---

## Built-in Filters

Apply filters with the `|` pipe character.

| Filter | What it does | Example |
|---|---|---|
| `escape_latex` | Escapes `&`, `%`, `$`, `#`, `_`, `{`, `}`, `~`, `^`, `\` | `<< category \| escape_latex >>` |
| `join(", ")` | Joins a list into a string | `<< skill_list \| join(", ") >>` |
| `default("fallback")` | Uses fallback if value is empty/None | `<< edu.gpa \| default("") >>` |
| `replace("a","b")` | String replacement | `<< url \| replace("https://","") >>` |
| `split_position_title` | Gets title part before `(` in position string | `<< exp.position \| split_position_title >>` |
| `split_position_type` | Gets part inside `(...)` | `<< exp.position \| split_position_type >>` |
| `split_company_name` | Gets company name before the comma | `<< exp.company \| split_company_name >>` |
| `split_company_city` | Gets city after the comma | `<< exp.company \| split_company_city >>` |

**Split filter examples:**

```
Input:  "Data Engineer (On-site)"
  split_position_title  →  "Data Engineer"
  split_position_type   →  "On-site"

Input:  "Tars Technologies, Nagpur"
  split_company_name    →  "Tars Technologies"
  split_company_city    →  "Nagpur"
```

---

## Conditional Blocks

Always guard optional sections with `<% if ... %>` so the section is skipped
when the JSON field is missing or empty:

```latex
<% if awards %>
\section*{AWARDS}
...
<% endif %>
```

Works for any field: `personal_info`, `summary`, `skills`, `experience`,
`education`, `projects`, `awards`.

---

## Minimal Template Skeleton

Copy this as a starting point for `my-template.tex`:

```latex
\documentclass[<< font_size >>pt,a4paper]{article}
\usepackage[top=<< margin_tb >>in, bottom=<< margin_tb >>in,
            left=<< margin_lr >>in, right=<< margin_lr >>in]{geometry}
\usepackage{fontspec}
\usepackage{xcolor}
\usepackage{titlesec}
\usepackage[hidelinks]{hyperref}
\setmainfont{<< font >>}

\definecolor{accent}{RGB}{<< section_color[0] >>, << section_color[1] >>, << section_color[2] >>}

\titleformat{\section}{\large\bfseries\color{accent}}{}{0em}{}[\titlerule]
\pagestyle{empty}
\setlength{\parindent}{0pt}

\begin{document}

%% ── HEADER ──────────────────────────────────────────────────────────────
<% if personal_info %>
{\Huge \textbf{<< personal_info.name >>}} \hfill
<< personal_info.email >> $\cdot$ << personal_info.phone >>
<% endif %>

%% ── SUMMARY ─────────────────────────────────────────────────────────────
<% if summary %>
\section*{SUMMARY}
<< summary >>
<% endif %>

%% ── SKILLS ──────────────────────────────────────────────────────────────
<% if skills %>
\section*{SKILLS}
<% for skill in skills %>
\textbf{<< skill.category | escape_latex >>:} << skill.items | join(", ") >> \\
<% endfor %>
<% endif %>

%% ── EXPERIENCE ──────────────────────────────────────────────────────────
<% if experience %>
\section*{EXPERIENCE}
<% for exp in experience %>
\textbf{<< exp.company | split_company_name >>} \hfill \textbf{<< exp.duration >>} \\
\textit{<< exp.position | split_position_title >>}

<% for ach in exp.achievements %>
$\bullet$ << ach >> \\
<% endfor %>
<% if not loop.last %>\vspace{10pt}<% endif %>
<% endfor %>
<% endif %>

%% ── EDUCATION ───────────────────────────────────────────────────────────
<% if education %>
\section*{EDUCATION}
<% for edu in education %>
\textbf{<< edu.institution >>} \hfill \textbf{<< edu.duration >>} \\
<< edu.degree >> \hfill << edu.gpa | default("") >>
<% endfor %>
<% endif %>

%% ── PROJECTS ────────────────────────────────────────────────────────────
<% if projects %>
\section*{PROJECTS}
<% for proj in projects %>
$\bullet$ \textbf{<< proj.name >>:} << proj.description >> \\
\textit{Tech: << proj.technologies >>}
<% if not loop.last %> \\[4pt] <% endif %>
<% endfor %>
<% endif %>

%% ── AWARDS ──────────────────────────────────────────────────────────────
<% if awards %>
\section*{CERTIFICATIONS}
<% for award in awards %>
$\bullet$ << award.title >><% if not loop.last %> \\<% endif %>
<% endfor %>
<% endif %>

\end{document}
```

---

## Step-by-Step: Add a New Template

1. Create `my-template.tex` in `script/templates/`
2. Add the Jinja2 placeholders where you want data (use the skeleton above)
3. Open the GUI → select **my-template** from the template dropdown
4. Click **Generate PDF**

That's it. No Python files need to be touched.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| `Undefined variable` error | Typo in placeholder name | Check spelling against this guide |
| `&` causes LaTeX error | Skill category name has `&` | Use `\| escape_latex` filter on the value |
| Section is blank or missing | JSON field is `null` or `[]` | Add `<% if field %>` guard |
| Template not appearing in GUI | Wrong folder | File must be in `script/templates/` |
| XeLaTeX font error | Font not installed on system | Change font in GUI or use `Latin Modern` |
