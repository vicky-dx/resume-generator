# Resume Generator (Electron + React)

This branch (`feat/electron-react-ui`) uses an Electron desktop app with a React + TypeScript + Vite frontend in `electron-app/`.

The app edits resume JSON, renders LaTeX from templates, and compiles PDF output through `latexmk`/`xelatex`.

## Prerequisites

- Node.js 20+ (recommended)
- npm
- A LaTeX distribution that provides `latexmk` and `xelatex`:
  - Windows: MiKTeX or TeX Live
  - Linux: `texlive-xetex` + `latexmk`
  - macOS: MacTeX

## Setup

```bash
cd electron-app
npm ci
```

## Development Commands

Run these from `electron-app/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite + Electron development runtime |
| `npm run lint` | Run ESLint |
| `npm run build` | Type-check and build renderer + Electron bundles |
| `npm run build:exe` | Clean, build, and package Windows installer with Electron Builder |
| `npm run preview` | Preview built Vite output |
| `npm run clean` | Remove `dist`, `dist-electron`, and `release` artifacts |

## Repository Layout

```text
resume-generator/
├── electron-app/            # Main desktop app (Electron main/preload + React renderer)
│   ├── electron/            # Electron main process and preload bridge
│   ├── src/                 # React UI, hooks, models, builder/escaper logic
│   ├── public/              # Static assets (includes Windows app icon .ico)
│   └── package.json         # Scripts and Electron Builder config
├── templates/               # LaTeX templates copied into packaged app resources
├── assets/                  # Shared project assets
├── desing.md                # UI design notes
├── LICENSE
└── README.md
```

## Build & Packaging Notes

- `npm run build` creates:
  - `electron-app/dist` (renderer build)
  - `electron-app/dist-electron` (Electron main/preload build)
- `npm run build:exe` packages with Electron Builder into `electron-app/release`.
- Windows packaging is configured for `nsis` and uses `electron-app/public/resume-icon.ico`.
- Root `templates/` are bundled into app resources via Electron Builder `extraResources` so runtime template loading works in packaged builds.
