import sys
import re
from pathlib import Path


def _read_version() -> str:
    """Read version from pyproject.toml — works in both dev and frozen EXE.
    Frozen EXE has pyproject.toml bundled via the spec file.
    Falls back to the hardcoded string only if the file is missing."""
    candidates = [
        Path(__file__).parent.parent / "pyproject.toml",  # dev
        Path(getattr(sys, "_MEIPASS", "")) / "pyproject.toml",  # frozen EXE
    ]
    for toml in candidates:
        try:
            m = re.search(r'^version\s*=\s*"([^"]+)"', toml.read_text("utf-8"), re.M)
            if m:
                return m.group(1)
        except Exception:
            continue
    return "1.0.0"  # last-resort fallback


APP_VERSION = _read_version()
GITHUB_REPO = "vicky-dx/resume-generator"


class UIConfig:
    """UI Configuration constants"""

    # Window dimensions
    WIDTH = 1200
    HEIGHT = 900

    # Fonts
    FONT_SECTION_SIZE = 12
    FONT_NORMAL_SIZE = 11
    FONT_SMALL_SIZE = 9
    FONT_CODE_SIZE = 10
    FONT_BUTTON_SIZE = 11

    # Spacing
    PAD_OUTER = 16
    PAD_FRAME = 12
    PAD_SMALL = 6
    PAD_MEDIUM = 10
    PAD_SECTION = 16

    # Layout sizing — single source of truth for row/widget heights
    ROW_HEIGHT = 28  # compact toolbar / header row height
    ICON_BTN_SIZE = 28  # square icon-only button (trash, etc.)
    ROW_SPACING = 8  # spacing between items within a row
    LOG_HEIGHT = 130  # collapsed log text area height

    # Progress steps
    PROGRESS_START = 10
    PROGRESS_LATEX_DONE = 40
    PROGRESS_COMPILE1_DONE = 70
    PROGRESS_COMPLETE = 100

    # Colors
    COLOR_PRIMARY = "#0078d4"
    COLOR_SUCCESS = "#107c10"
    COLOR_WARNING = "#ff8c00"
    COLOR_ERROR = "#e81123"
    COLOR_BG = "#ffffff"
    COLOR_LOG_BG = "#f5f5f5"

    # QtAwesome Icons
    ICON_FOLDER = "fa5s.folder-open"
    ICON_ROCKET = "fa5s.rocket"
    ICON_REFRESH = "fa5s.sync-alt"
    ICON_PASTE = "fa5s.clipboard"
    ICON_TRASH = "fa5s.trash"
    ICON_TEMPLATE = "fa5s.file-alt"
    ICON_QUICK = "fa5s.bolt"
    ICON_EDIT = "fa5s.pen"
    ICON_SAVE = "fa5s.save"
    ICON_LIBRARY = "fa5s.layer-group"
    ICON_PROJECT = "fa5s.project-diagram"
    ICON_SKILLS = "fa5s.tags"
    ICON_PLUS = "fa5s.plus"
    ICON_PROMPT = "fa5s.comment-alt"
    ICON_AI = "fa5s.magic"

    # ── SRP Note ──────────────────────────────────────────────────────────────
    # Widget creation helpers have been moved to gui.ui_helpers (apply_style,
    # make_icon_button).  UIConfig's sole responsibility is holding constants.
    # Call sites import directly from gui.ui_helpers instead of going through
    # this class.
