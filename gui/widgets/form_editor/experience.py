import re
from PySide6.QtWidgets import QLineEdit, QTextEdit, QLabel

from gui.widgets.form_editor.base import ListBasedSectionWidget
from gui.models import Experience

# e.g. "Jan 2023 – Present", "Feb 2022 - Mar 2024", "2021 - 2022"
_DURATION_RE = re.compile(
    r"^[A-Za-z]{3}\s+\d{4}\s*[–\-]\s*([A-Za-z]{3}\s+\d{4}|Present|present|Current|current)"
    r"|^\d{4}\s*[–\-]\s*(\d{4}|Present|present)$",
    re.IGNORECASE,
)


def _set_valid(widget, valid: bool) -> None:
    """Toggle the 'invalid' CSS class and repaint."""
    widget.setProperty("cssClass", "" if valid else "invalid")
    widget.style().unpolish(widget)
    widget.style().polish(widget)


class ExperienceWidget(ListBasedSectionWidget):
    """Widget for editing work experience."""

    def __init__(self, parent=None):
        super().__init__(list_title="Entries:", item_name="Entry", parent=parent)

    def _setup_form(self, form_layout):
        self.exp_company = QLineEdit()
        self.exp_company.setPlaceholderText("Company Name, City")
        self.exp_position = QLineEdit()
        self.exp_position.setPlaceholderText("Job Title")
        self.exp_duration = QLineEdit()
        self.exp_duration.setPlaceholderText("Jan 2023 – Present")

        self.exp_achievements = QTextEdit()
        self.exp_achievements.setPlaceholderText(
            "Reduced latency by 60% by...\n\nBuilt auto-scaling pipeline..."
        )
        self.exp_achievements.setMinimumHeight(380)

        self._add_field(form_layout, "Company", self.exp_company)
        self._add_field(form_layout, "Position", self.exp_position)
        self._add_field(form_layout, "Duration", self.exp_duration)
        self._add_rich_text_field(
            form_layout, "Achievements (one bullet per line)", self.exp_achievements
        )

        # Real-time validation
        self.exp_company.textChanged.connect(
            lambda t: _set_valid(self.exp_company, bool(t.strip()))
        )
        self.exp_position.textChanged.connect(
            lambda t: _set_valid(self.exp_position, bool(t.strip()))
        )
        self.exp_duration.textChanged.connect(self._validate_duration)
        self.exp_achievements.textChanged.connect(
            lambda: _set_valid(
                self.exp_achievements,
                bool(self.exp_achievements.toPlainText().strip()),
            )
        )

    def _validate_duration(self, text: str) -> None:
        """Red border if text is non-empty but doesn't match expected date format."""
        stripped = text.strip()
        # Empty is allowed (will be caught at save time); only flag bad format
        valid = not stripped or bool(_DURATION_RE.match(stripped))
        _set_valid(self.exp_duration, valid)

    def _get_current_item_data(self) -> dict:
        return Experience(
            company=self.exp_company.text().strip(),
            title=self.exp_position.text().strip(),
            date=self.exp_duration.text().strip(),
            achievements=[
                line.strip()
                for line in self.exp_achievements.toPlainText().split("\n")
                if line.strip()
            ],
        ).model_dump(by_alias=True)

    def _set_current_item_data(self, data: dict):
        exp = Experience.model_validate(data)
        self.exp_company.setText(exp.company)
        self.exp_position.setText(exp.title)
        self.exp_duration.setText(exp.date)
        # Handle backward compatibility since our old code used data.get("position") vs data.get("title")
        if not exp.title and "position" in data:
            self.exp_position.setText(data["position"])
        if not exp.date and "duration" in data:
            self.exp_duration.setText(data["duration"])

        self.exp_achievements.setPlainText("\n\n".join(exp.achievements))
        # Reset validation state after loading clean data
        for w in (
            self.exp_company,
            self.exp_position,
            self.exp_duration,
            self.exp_achievements,
        ):
            _set_valid(w, True)

    def _clear_form(self):
        self.exp_company.clear()
        self.exp_position.clear()
        self.exp_duration.clear()
        self.exp_achievements.clear()
        # Reset validation state
        for w in (
            self.exp_company,
            self.exp_position,
            self.exp_duration,
            self.exp_achievements,
        ):
            _set_valid(w, True)

    def _get_item_title(self, data: dict) -> str:
        return data.get("company", "")

    def _get_empty_item(self) -> dict:
        return Experience().model_dump(by_alias=True)

    def collect(self) -> dict:
        return {"experience": self._collect_list()}

    def populate(self, data: dict):
        self._populate_list(data.get("experience", []))
