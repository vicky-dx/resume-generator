@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo  Resume Generator -- EXE Builder
echo ============================================================
echo.

:: ── check uv is available ─────────────────────────────────────
where uv >nul 2>&1
if errorlevel 1 (
    echo [ERROR] uv not found. Install it from https://docs.astral.sh/uv/
    pause
    exit /b 1
)

:: ── ensure PyInstaller is available ───────────────────────────
echo [1/3] Checking PyInstaller...
uv run python -c "import PyInstaller" 2>nul
if errorlevel 1 (
    echo       Installing PyInstaller as dev dependency...
    uv add --dev pyinstaller
) else (
    echo       PyInstaller already installed.
)
echo.

:: ── ensure Pillow is available (for icon handling) ────────────
echo [2/3] Checking Pillow...
uv run python -c "import PIL" 2>nul
if errorlevel 1 (
    echo       Installing Pillow as dev dependency...
    uv add --dev Pillow
) else (
    echo       Pillow already installed.
)
echo.

:: ── run PyInstaller ───────────────────────────────────────────
echo [3/3] Running PyInstaller...
echo.
uv run python build_version_info.py
uv run pyinstaller --noconfirm ResumeGenerator.spec

if errorlevel 1 (
    echo.
    echo [FAILED] Build did not complete. Check errors above.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Done!  Find your exe at:
echo  %~dp0dist\ResumeGenerator.exe
echo ============================================================
pause

