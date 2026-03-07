import re
from PySide6.QtWidgets import QLineEdit, QTextEdit, QLabel

from gui.widgets.form_editor.base import ListBasedSectionWidget
from gui.models import Education

_DURATION_RE = re.compile(
    r"^[A-Za-z]{3}\s+\d{4}\s*[–\-]\s*([A-Za-z]{3}\s+\d{4}|Present|present|Current|current)"
    r"|^\d{4}\s*[–\-]\s*(\d{4}|Present|present)$",
    re.IGNORECASE,
)


def _set_valid(widget, valid: bool) -> None:
    widget.setProperty("cssClass", "" if valid else "invalid")
    widget.style().unpolish(widget)
    widget.style().polish(widget)


class EducationWidget(ListBasedSectionWidget):
    """Widget for editing education."""

    def __init__(self, parent=None):
        super().__init__(list_title="Entries:", item_name="Entry", parent=parent)

    def _setup_form(self, form_layout):
        self.edu_institution = QLineEdit()
        self.edu_institution.setPlaceholderText("University / College Name")
        self.edu_degree = QLineEdit()
        self.edu_degree.setPlaceholderText("Bachelor of Science in Computer Science")
        self.edu_duration = QLineEdit()
        self.edu_duration.setPlaceholderText("Aug 2017 – Jun 2021")
        self.edu_gpa = QLineEdit()
        self.edu_gpa.setPlaceholderText("CGPA: 8/10")

        self.edu_coursework = QTextEdit()
        self.edu_coursework.setMaximumHeight(150)
        self.edu_coursework.setPlaceholderText(
            "Data Structures, Algorithms, Machine Learning, Databases..."
        )

        self._add_field(form_layout, "Institution", self.edu_institution)
        self._add_field(form_layout, "Degree", self.edu_degree)
        self._add_field(form_layout, "Duration", self.edu_duration)
        self._add_field(form_layout, "GPA", self.edu_gpa)
        self._add_rich_text_field(
            form_layout, "Relevant Coursework (comma-separated)", self.edu_coursework
        )

        # Real-time validation
        self.edu_institution.textChanged.connect(
            lambda t: _set_valid(self.edu_institution, bool(t.strip()))
        )
        self.edu_degree.textChanged.connect(
            lambda t: _set_valid(self.edu_degree, bool(t.strip()))
        )
        self.edu_duration.textChanged.connect(self._validate_duration)

    def _validate_duration(self, text: str) -> None:
        stripped = text.strip()
        valid = not stripped or bool(_DURATION_RE.match(stripped))
        _set_valid(self.edu_duration, valid)

    def _get_current_item_data(self) -> dict:
        # Returning dict here since ListBasedSectionWidget._collect_list aggregates dicts for the final JSON.
        # Alternatively we can collect objects, but the base widget works with dicts currently for the JSON dump.
        # To be fully typed, we map to Education then .to_dict()
        # To be fully typed, we map to Education then .model_dump(by_alias=True)
        from gui.models import Education

        coursework_list = [
            c.strip() for c in self.edu_coursework.toPlainText().split(",") if c.strip()
        ]
        return Education(
            institution=self.edu_institution.text().strip(),
            degree=self.edu_degree.text().strip(),
            date=self.edu_duration.text().strip(),
            gpa=self.edu_gpa.text().strip(),
            coursework=coursework_list,
        ).model_dump(by_alias=True)

    def _set_current_item_data(self, data: dict):
        edu = Education.model_validate(data)
        self.edu_institution.setText(edu.institution)
        self.edu_degree.setText(edu.degree)
        self.edu_duration.setText(edu.date)
        self.edu_gpa.setText(edu.gpa)
        self.edu_coursework.setPlainText(", ".join(edu.coursework))
        # Reset validation state after loading clean data
        for w in (self.edu_institution, self.edu_degree, self.edu_duration):
            _set_valid(w, True)

    def _clear_form(self):
        self.edu_institution.clear()
        self.edu_degree.clear()
        self.edu_duration.clear()
        self.edu_gpa.clear()
        self.edu_coursework.clear()
        # Reset validation state
        for w in (self.edu_institution, self.edu_degree, self.edu_duration):
            _set_valid(w, True)

    def _get_item_title(self, data: dict) -> str:
        return data.get("institution", "")

    def _get_empty_item(self) -> dict:
        return Education().model_dump(by_alias=True)

    def collect(self) -> dict:
        return {"education": self._collect_list()}

    def populate(self, data: dict):
        self._populate_list(data.get("education", []))
