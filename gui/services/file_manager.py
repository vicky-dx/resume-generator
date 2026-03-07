import json
from pathlib import Path


class FileManager:
    """Service handling reading and writing JSON templates."""

    def __init__(self, json_folder: Path):
        self.json_folder = json_folder
        self.json_folder.mkdir(exist_ok=True)

    def _safe_path(self, filename: str) -> Path:
        """Resolve path and verify it stays inside json_folder (prevents traversal)."""
        resolved = (self.json_folder / filename).resolve()
        if not resolved.is_relative_to(self.json_folder.resolve()):
            raise ValueError(
                "Invalid filename: access outside the template folder is not permitted."
            )
        return resolved

    def list_templates(self) -> list[str]:
        """Return a list of JSON template filenames, sorted by modification time."""
        json_file_objects = list(self.json_folder.glob("*.json"))
        json_file_objects.sort(key=lambda f: f.stat().st_mtime, reverse=True)
        return [f.name for f in json_file_objects]

    def load_template(self, filename: str) -> dict:
        """Load and return JSON data from a template file."""
        json_path = self._safe_path(filename)
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def save_template(self, filename: str, data: dict) -> Path:
        """Save JSON data to a template file."""
        json_path = self._safe_path(filename)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return json_path

    def template_exists(self, filename: str) -> bool:
        """Check if a template exists."""
        return self._safe_path(filename).exists()
