#!/usr/bin/env python3
"""Entry point for the Resume Generator GUI."""

import sys
import asyncio
import traceback
import qasync
from PySide6.QtWidgets import QApplication
from gui.main_window import ResumeGeneratorMainWindow
from gui.utils import get_base_path, get_resource_path
from gui.services.file_manager import FileManager
from gui.logger import setup_logging, app_logger


def _install_excepthook():
    """Log any uncaught exception to file before the process dies."""

    def _handle_exception(exc_type, exc_value, exc_tb):
        if issubclass(exc_type, KeyboardInterrupt):
            sys.__excepthook__(exc_type, exc_value, exc_tb)
            return
        app_logger.critical(
            "Uncaught exception:\n%s",
            "".join(traceback.format_exception(exc_type, exc_value, exc_tb)),
        )

    sys.excepthook = _handle_exception


def main():
    setup_logging()
    _install_excepthook()

    # Tell Windows to use our AppUserModelID so the taskbar shows our icon
    # instead of the generic Python/Qt default.
    if sys.platform == "win32":
        import ctypes
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(
            "ResumeAutomation.ResumeGenerator.1"
        )

    app_logger.info("Launching QApplication")
    app = QApplication(sys.argv)
    app.setApplicationName("Resume Generator")

    loop = qasync.QEventLoop(app)
    asyncio.set_event_loop(loop)

    # Force Fusion style with an explicit light palette so the app is immune
    # to the OS dark-mode setting.  Without this, Windows dark mode bleeds
    # into any Qt widget not explicitly covered by the QSS.
    from PySide6.QtGui import QFont, QPalette, QColor

    app.setStyle("Fusion")
    _pal = QPalette()
    _pal.setColor(QPalette.ColorRole.Window,          QColor("#ffffff"))
    _pal.setColor(QPalette.ColorRole.WindowText,      QColor("#212529"))
    _pal.setColor(QPalette.ColorRole.Base,            QColor("#ffffff"))
    _pal.setColor(QPalette.ColorRole.AlternateBase,   QColor("#F8F9FA"))
    _pal.setColor(QPalette.ColorRole.ToolTipBase,     QColor("#ffffff"))
    _pal.setColor(QPalette.ColorRole.ToolTipText,     QColor("#212529"))
    _pal.setColor(QPalette.ColorRole.Text,            QColor("#212529"))
    _pal.setColor(QPalette.ColorRole.Button,          QColor("#F8F9FA"))
    _pal.setColor(QPalette.ColorRole.ButtonText,      QColor("#495057"))
    _pal.setColor(QPalette.ColorRole.BrightText,      QColor("#e81123"))
    _pal.setColor(QPalette.ColorRole.Highlight,       QColor("#0078d4"))
    _pal.setColor(QPalette.ColorRole.HighlightedText, QColor("#ffffff"))
    _pal.setColor(QPalette.ColorRole.Link,            QColor("#0078d4"))
    _pal.setColor(QPalette.ColorRole.PlaceholderText, QColor("#ADB5BD"))
    app.setPalette(_pal)

    # Set modern global font
    font = QFont("Segoe UI", 10)
    font.setStyleHint(QFont.StyleHint.SansSerif)
    app.setFont(font)

    # Load global style sheet
    from pathlib import Path

    style_path = Path(__file__).parent / "assets" / "style.qss"
    if style_path.exists():
        assets_path = str(get_resource_path("assets")).replace("\\", "/")
        with open(style_path, "r", encoding="utf-8") as f:
            qss = f.read().replace("{{ASSETS}}", assets_path)
        app.setStyleSheet(qss)

    # DIP: construct concrete dependencies here and inject into the window.
    project_dir = get_base_path()
    json_folder = project_dir / "job-role-json"
    json_folder.mkdir(exist_ok=True)
    (project_dir / "xelatex-resume").mkdir(exist_ok=True)

    # Create a user-accessible templates folder next to the exe and seed
    # any bundled templates into it so users can add custom .tex templates.
    templates_dir = project_dir / "templates"
    templates_dir.mkdir(exist_ok=True)
    if getattr(sys, "frozen", False):
        import shutil
        from pathlib import Path as _Path
        bundled_templates = _Path(sys._MEIPASS) / "script" / "templates"
        if bundled_templates.exists():
            for _tmpl in bundled_templates.glob("*.tex"):
                dest = templates_dir / _tmpl.name
                if not dest.exists():
                    shutil.copy2(_tmpl, dest)

    file_manager = FileManager(json_folder)
    window = ResumeGeneratorMainWindow(file_manager=file_manager)

    # Set app-level icon so Windows taskbar picks it up
    from PySide6.QtGui import QIcon
    _icon_path = get_resource_path("assets") / "cv.ico"
    if not _icon_path.exists():
        _icon_path = get_resource_path("assets") / "cv.png"
    if _icon_path.exists():
        app.setWindowIcon(QIcon(str(_icon_path)))

    window.show()

    with loop:
        loop.run_forever()


if __name__ == "__main__":
    main()
