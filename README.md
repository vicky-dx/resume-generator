# Resume Generator & AI Assistant

A production-ready desktop application and AI assistant backend for managing, styling, and compiling professional LaTeX resumes. 

Built on a clean-architecture model, this project features an **Electron + React** desktop application and a built-in **Model Context Protocol (MCP) Server**—allowing AI agents (like Gemini, Claude, or Cursor) to validate, edit, and compile resumes directly on your local system.

> [!NOTE]
> The legacy Python/PySide6 version of this project has been archived and can be found in the [legacy-pyside](https://github.com/vicky-dx/resume-generator/tree/legacy-pyside) branch.

---

## 🚀 Key Features

* **Orchestrated React UI**: A single-responsibility modular pane interface with dedicated form editors (Zod inline validations), syntax-highlighted raw JSON editor, live PDF preview panel, and dependency setup wizards.
* **Shared `compileResume` Pipeline**: A unified high-level compiler pipeline (`normalize` $\rightarrow$ `validate` $\rightarrow$ `build` $\rightarrow$ `compile` $\rightarrow$ `error-parse` $\rightarrow$ `cleanup`) shared natively by both the Electron desktop shell and the MCP server.
* **Built-in MCP Server**: Exposes resume-generator tools (`list_templates`, `validate_resume`, `generate_resume_pdf`) to LLMs for automated resume tailoring.
* **Background Auto-Updater**: A silent background updater utilizing `electron-updater` and GitHub Releases, complete with a VS Code-style "What's New" release notes modal on startup.
* **Advanced LaTeX Log Parsing**: Precision compilation warning filters and error parser that extracts exact line numbers and LaTeX error details to aid debugging.

---

## 🛠️ Tech Stack

* **Shell**: Electron, Vite, Context-Bridge Preload Script.
* **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide icons.
* **Compiler Engine**: Nunjucks templates, Zod validation schemas, `latexmk`/`xelatex` command spawning.
* **AI Bridge**: Model Context Protocol (MCP) SDK.

---

## 📦 Requirements

* **Node.js**: v18+
* **LaTeX Distribution**: A LaTeX installation with `xelatex` and `latexmk`:
  * **Windows**: [MiKTeX](https://miktex.org/) or [TeX Live](https://www.tug.org/texlive/)
  * **macOS**: [MacTeX](https://www.tug.org/mactex/)
  * **Linux**: `sudo apt install texlive-xetex latexmk`

---

## 🚀 Getting Started

### 1. Installation

Clone the repository and install npm packages:

```bash
git clone https://github.com/vicky-dx/resume-generator.git
cd resume-generator/electron-app
npm install
```

### 2. Run in Development Mode

Launches the Vite dev server and spawns the Electron shell with mock update providers preloaded:

```bash
npm run dev
```

### 3. Build Production Bundle

Compiles the typescript code and bundles the production assets:

```bash
npm run build
```

---

## 🤖 Using the MCP Server

The project includes an MCP server configured in `electron-app/src/mcp-server.ts`. This allows AI agents to inspect templates, validate resumes, and compile PDFs directly on your machine.

### Integration Configuration

Add the following to your AI IDE configurations (e.g. Cursor, Claude Desktop, or Gemini config):

```json
{
  "mcpServers": {
    "resume-generator": {
      "command": "npx",
      "args": ["tsx", "src/mcp-server.ts"],
      "cwd": "C:/Users/vicky/Desktop/PROJECTS/resume/resume-generator/electron-app"
    }
  }
}
```

### Tools Exposed:
1. `list_templates`: Scans `./templates/` and returns available layouts.
2. `validate_resume`: Normalizes input JSON and checks against Zod schema rules (e.g. valid emails, social link domains).
3. `generate_resume_pdf`: Normalizes, validates, compiles LaTeX using the shared engine, and copies the final PDF to `outputPath`.

---

## 📂 Project Directory Structure

```text
resume-generator/
├── .agents/                    # Project-scoped AI configurations (MCP config)
├── templates/                  # XeLaTeX resume templates (.tex layout grids)
│   └── classic.tex             # Default single-column template
│
└── electron-app/               # Electron desktop & React core application
    ├── electron/               # Main Process files
    │   ├── main.ts             # Electron main loop & IPC router
    │   ├── preload.ts          # contextBridge preload scripts
    │   └── UpdateManager.ts    # Auto-updater singleton manager (electron-updater)
    │
    ├── src/                    # Renderer Process (React app)
    │   ├── components/         # Modular layout widgets (UpdateBanner, SetupWizard, editors)
    │   ├── hooks/              # Custom hooks (useStyle, useCompiler, useUpdater)
    │   ├── layout/             # Flex/Grid panels (AppLayout, EditorPane, PreviewPane)
    │   ├── lib/                # Shared utilities (builder.ts, latexRunner.ts, error parser)
    │   ├── models/             # Resume schemas (Zod data validation)
    │   ├── providers/          # Update services (MockUpdateProvider & ElectronUpdateProvider)
    │   ├── services/           # Shared core services (compileResume, normalizer)
    │   ├── types/              # TS Types declarations (compiler.ts, update.ts)
    │   │
    │   ├── App.tsx             # Root orchestrator layout component
    │   ├── main.tsx            # React bootstrap entry point
    │   └── mcp-server.ts       # Model Context Protocol stdio server
    │
    ├── vite.config.ts          # Vite build configurations (Rollup external rules)
    ├── package.json            # Node project configuration
    └── tsconfig.json           # TypeScript configuration
```
