import sys
import os
from pathlib import Path


def get_base_path():
    """Get base path for user data (always relative to executable location)"""
    if getattr(sys, "frozen", False):
        # Running as compiled executable - use exe directory
        return Path(sys.executable).parent
    else:
        # Running as script
        return Path(__file__).parent.parent


def get_resource_path(relative_path):
    """Get path to bundled resource that works both in dev and PyInstaller"""
    if getattr(sys, "frozen", False):
        # Running as compiled - resources are in _MEIPASS temp directory
        base_path = Path(sys._MEIPASS)
    else:
        # Running as script
        base_path = Path(__file__).parent.parent
    return base_path / relative_path


def get_python_executable():
    """Get Python executable path that works in bundled exe"""
    if getattr(sys, "frozen", False):
        # Running as compiled - use python from PATH or system
        import shutil

        python_exe = shutil.which("python")
        if not python_exe:
            python_exe = shutil.which("python3")
        if python_exe:
            return python_exe
        # Fallback to common locations
        common_paths = [
            r"C:\Python311\python.exe",
            r"C:\Python310\python.exe",
            r"C:\Python39\python.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python311\python.exe"),
        ]
        for path in common_paths:
            if Path(path).exists():
                return path
        return "python"  # Last resort
    else:
        # Running as script - use current Python
        return sys.executable
