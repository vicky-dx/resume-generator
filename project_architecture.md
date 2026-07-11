# Project Architecture & Structure Graph

This document details the system design, file structure, and data flows of the **Resume Generator** application.

---

## 1. System Overview

The **Resume Generator** is an Electron desktop application built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**. It is designed to take structured resume data in JSON format (edited via raw code or a form UI), apply styles, compile it into LaTeX via a **Nunjucks** templating environment, and finally call the system's LaTeX distribution (specifically `latexmk` with the `xelatex` engine) to produce a high-quality PDF resume.

### Technology Stack
- **Desktop Runtime**: Electron 41.x
- **Frontend Framework**: React 19.x & TypeScript, styled with Tailwind CSS
- **Code/JSON Editor**: Monaco Editor (`@monaco-editor/react`)
- **Drag-and-Drop Reordering**: `@dnd-kit/core` & `@dnd-kit/sortable`
- **Schema Validation**: Zod (`zod`)
- **Template Engine**: Nunjucks (adapted with custom delimiters for LaTeX compatibility)
- **PDF Compilation Backend**: Local LaTeX distribution (requires `xelatex` and `latexmk`)

---

## 2. Core Architecture & Data Flow

The architecture is divided into the **Renderer Process** (React Frontend) and the **Main Process** (Electron Backend). They communicate asynchronously over an IPC (Inter-Process Communication) bridge.

```mermaid
graph TD
    %% Styling
    classDef frontend fill:#c3faf5,stroke:#187574,stroke-width:2px,color:#1c1c1e;
    classDef ipc fill:#ffe6cd,stroke:#746019,stroke-width:2px,color:#1c1c1e;
    classDef backend fill:#fde0f0,stroke:#600000,stroke-width:2px,color:#1c1c1e;
    classDef external fill:#e9eaef,stroke:#c7cad5,stroke-width:2px,color:#1c1c1e;

    subgraph Renderer ["Renderer Process (React Frontend)"]
        A["App.tsx (Main View & Settings State)"]:::frontend
        B["FormEditor.tsx (Form UI Sections)"]:::frontend
        C["Monaco Editor (Raw JSON Edit)"]:::frontend
        D["Zod Schemas (resume.ts)"]:::frontend
        E["PDF Preview (Iframe & PDF URL)"]:::frontend
    end

    subgraph Bridge ["IPC Bridge"]
        F["preload.ts (contextBridge)"]:::ipc
    end

    subgraph Main ["Main Process (Electron Backend)"]
        G["main.ts (App Lifecycle & IPC Handlers)"]:::backend
        H["builder.ts (Nunjucks & Polyfills)"]:::backend
        I["escaper.ts (LaTeX Special Chars & Markup)"]:::backend
    end

    subgraph LocalOS ["System OS & Binaries"]
        J["LaTeX Templates (.tex files)"]:::external
        K["latexmk / xelatex (CLI Process)"]:::external
        L["System Temp Directory"]:::external
    end

    %% Data Flow Connections
    A <-->|Active Text State| C
    A <-->|State Synchronizer| B
    B -.->|Normalizes & Coerces| D
    A -->|IPC Request: generate-pdf| F
    F -->|invoke('generate-pdf')| G
    
    G -->|Reads Templates| J
    G -->|Prepares context| H
    H -->|LaTeX escapes inputs| I
    H -->|Renders output.tex| L
    G -->|Spawns compilation| K
    K -->|Compiles output.pdf| L
    
    G -->|Returns pdfPath| F
    F -->|Update pdfUrl| E
    
    A -->|IPC: open-json / save-json| F
    F -->|File Dialogs & fs| G
```

---

## 3. Directory Structure Details

Here is the directory structure of the repository, highlighting major files and their roles:

```
resume-generator/
├── templates/                      # LaTeX templates with Nunjucks tags
│   ├── classic.tex                 # Classic layout template
│   ├── experiment.tex              # Experimental layout
│   ├── german.tex                  # German language / format layout
│   └── TEMPLATE_GUIDE.md           # Instructions on how to write custom templates
│
└── electron-app/                   # Electron Desktop codebase
    ├── electron/                   # Electron Main & Preload scripts
    │   ├── main.ts                 # Main process: registers IPC handlers, launches compiler
    │   └── preload.ts              # Preload bridge: exposes context-isolated electronAPI
    │
    ├── src/                        # Renderer process (React Frontend)
    │   ├── main.tsx                # Frontend entry point
    │   ├── App.tsx                 # Main application view (handles layout, tweaks, PDF iframe)
    │   ├── index.css               # App styles and font configs
    │   │
    │   ├── components/             # React UI components
    │   │   ├── FormEditor.tsx      # Orchestrates form UI; parses JSON, handles list sorting
    │   │   └── FormSections/       # Individual resume form sections
    │   │       ├── PersonalInfo.tsx
    │   │       ├── Summary.tsx
    │   │       ├── Experience.tsx
    │   │       ├── Projects.tsx
    │   │       ├── Education.tsx
    │   │       ├── Skills.tsx
    │   │       ├── Languages.tsx
    │   │       ├── Awards.tsx
    │   │       ├── SortableSectionItem.tsx  # Wrapper for drag-and-drop support
    │   │       └── SharedComponents.tsx      # Reusable fields, lists, inputs
    │   │
    │   ├── hooks/
    │   │   └── useCompileStatus.ts # Manages LaTeX compilation status/error state
    │   │
    │   ├── lib/                    # Core LaTeX logic (Shared with Electron Main)
    │   │   ├── builder.ts          # Nunjucks environment creation, Jinja compatibility polyfills
    │   │   └── escaper.ts          # LaTeX escaping, Markdown converting, term protection
    │   │
    │   ├── models/
    │   │   └── resume.ts           # Zod schema verification & data normalization
    │   │
    │   └── types/
    │       └── electron.d.ts       # TypeScript window declarations
    │
    ├── vite.config.ts              # Vite configuration (includes Electron plugins)
    ├── tsconfig.json               # TypeScript config
    └── package.json                # Project dependencies and build/run scripts
```

---

## 4. Key Components Explained

### 4.1 LaTeX Rendering Pipeline (`builder.ts` & `escaper.ts`)
*   **LaTeX Safe Tags**: Nunjucks is configured with delimiters `<% ... %>` (blocks), `<< ... >>` (variables), and `<# ... #>` (comments) to prevent collision with LaTeX's curly braces (`{ }`).
*   **Jinja Compatibility Polyfills**: Since original templates were authored for Python's Jinja2 engine, `builder.ts` polyfills Python string and array methods (e.g. `rstrip`, `lstrip`, `startswith`, `endswith`, `.get()`, and negative array indices like `[-1]`) on the Javascript prototype levels.
*   **Escaping and Term Protection**: `escaper.ts` performs a three-stage conversion on text:
    1.  Escaping LaTeX reserved characters: `&`, `%`, `$`, `#`, `_`, `{`, `}`, `~`, `^`.
    2.  Translating Markdown tags into LaTeX command equivalents (`**bold**` -> `\textbf{bold}`).
    3.  Term Protection: Enclosing critical tech terms (e.g. `Kubernetes`, `React`, `AWS`) in `\mbox{...}` to prevent them from breaking across line-wraps.

### 4.2 Electron compilation Lifecycle (`main.ts`)
*   When React invokes `generate-pdf`, a unique timestamped job folder is prepared in the operating system's temporary directory.
*   The raw data is deep-escaped, polyfilled, merged with user-defined style tweaks (fonts, margins, colors, item spacing), and rendered through Nunjucks.
*   The system executes `latexmk -xelatex -interaction=nonstopmode -output-directory=<temp_dir> <temp_dir>/output-<jobId>.tex`.
*   After successful output, the temporary PDF file path is returned to React as a local URL (`file://.../output-<jobId>.pdf`), which is loaded inside an `iframe`.
*   Old compilation jobs in the temp folder are cleaned up automatically after 1 hour.
