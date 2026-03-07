"""
Application-wide file logging.

A rotating log file is written next to the exe (or project root in dev mode)
under `logs/app.log`.  The same `app_logger` instance is imported by any
module that needs to write persistent records.

Usage:
    from gui.logger import app_logger
    app_logger.error("something went wrong")
"""

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path


def _resolve_log_dir() -> Path:
    """Return the log directory, always beside the exe / project root."""
    if getattr(sys, "frozen", False):
        base = Path(sys.executable).parent
    else:
        base = Path(__file__).parent.parent
    log_dir = base / "logs"
    log_dir.mkdir(exist_ok=True)
    return log_dir


def setup_logging() -> logging.Logger:
    """
    Configure the root 'resume_app' logger.

    - Writes to   logs/app.log  (≤ 1 MB, 3 backups kept)
    - Also writes WARNING+ to stderr so dev-mode users still see critical issues
    - Returns the logger so main.py can install the excepthook immediately after.
    """
    log_dir = _resolve_log_dir()
    log_file = log_dir / "app.log"

    logger = logging.getLogger("resume_app")
    logger.setLevel(logging.DEBUG)

    if logger.handlers:
        # Already initialised (e.g. reloaded in interactive session) — skip
        return logger

    fmt = logging.Formatter(
        fmt="%(asctime)s [%(levelname)-8s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Rotating file handler — keeps last 3 × 1 MB
    fh = RotatingFileHandler(
        log_file, maxBytes=1_000_000, backupCount=3, encoding="utf-8"
    )
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    # Stderr handler for WARNING+ (visible in dev/terminal mode only)
    sh = logging.StreamHandler(sys.stderr)
    sh.setLevel(logging.WARNING)
    sh.setFormatter(fmt)
    logger.addHandler(sh)

    logger.info("=" * 60)
    logger.info("Resume Generator started")
    logger.info("Log file: %s", log_file)

    return logger


# Module-level singleton — import this anywhere you need to log
app_logger = logging.getLogger("resume_app")
