"""Generate version_info.txt for PyInstaller from pyproject.toml.

Run this before PyInstaller to embed proper Windows file metadata
(visible in Properties → Details on right-click).
"""
import re
import sys
from pathlib import Path

def _read_version() -> str:
    toml = Path(__file__).parent / "pyproject.toml"
    m = re.search(r'^version\s*=\s*"([^"]+)"', toml.read_text("utf-8"), re.M)
    return m.group(1) if m else "1.0.0"

def _parse_tuple(version: str):
    parts = [int(x) for x in version.split(".")]
    while len(parts) < 4:
        parts.append(0)
    return tuple(parts[:4])

def generate(version: str | None = None):
    v = version or _read_version()
    t = _parse_tuple(v)
    content = f"""VSVersionInfo(
  ffi=FixedFileInfo(
    filevers={t},
    prodvers={t},
    mask=0x3f,
    flags=0x0,
    OS=0x40004,
    fileType=0x1,
    subtype=0x0,
    date=(0, 0)
  ),
  kids=[
    StringFileInfo([
      StringTable(
        u'040904B0',
        [StringStruct(u'CompanyName', u''),
         StringStruct(u'FileDescription', u'Resume Generator'),
         StringStruct(u'FileVersion', u'{v}.0'),
         StringStruct(u'InternalName', u'ResumeGenerator'),
         StringStruct(u'LegalCopyright', u'Copyright \\u00a9 2026'),
         StringStruct(u'OriginalFilename', u'ResumeGenerator.exe'),
         StringStruct(u'ProductName', u'Resume Generator'),
         StringStruct(u'ProductVersion', u'{v}.0')])
      ]),
    VarFileInfo([VarStruct(u'Translation', [1033, 1200])])
  ]
)
"""
    out = Path(__file__).parent / "version_info.txt"
    out.write_text(content, encoding="utf-8")
    print(f"Generated version_info.txt  →  {v}")

if __name__ == "__main__":
    ver = sys.argv[1] if len(sys.argv) > 1 else None
    generate(ver)
