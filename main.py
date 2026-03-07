#!/usr/bin/env python3
"""Entry point for the Resume Generator GUI."""

import sys
import asyncio
import traceback
import qasync
from PySide6.QtWidgets import QApplication
from gui.main_window import ResumeGeneratorMainWindow
from gui.utils import get_base_path
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

    app_logger.info("Launching QApplication")
    app = QApplication(sys.argv)
    app.setApplicationName("Resume Generator")

    loop = qasync.QEventLoop(app)
    asyncio.set_event_loop(loop)

    # Set modern global font
    from PySide6.QtGui import QFont

    font = QFont("Segoe UI", 10)
    font.setStyleHint(QFont.StyleHint.SansSerif)
    app.setFont(font)

    # Load global style sheet
    from pathlib import Path

    style_path = Path(__file__).parent / "assets" / "style.qss"
    if style_path.exists():
        with open(style_path, "r", encoding="utf-8") as f:
            app.setStyleSheet(f.read())

    # DIP: construct concrete dependencies here and inject into the window.
    project_dir = get_base_path()
    json_folder = project_dir / "job-role-json"
    json_folder.mkdir(exist_ok=True)
    (project_dir / "xelatex-resume").mkdir(exist_ok=True)

    file_manager = FileManager(json_folder)
    window = ResumeGeneratorMainWindow(file_manager=file_manager)
    window.show()

    with loop:
        loop.run_forever()


if __name__ == "__main__":
    main()
