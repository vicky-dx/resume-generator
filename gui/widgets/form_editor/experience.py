from PySide6.QtWidgets import (
    QLineEdit,
    QTextEdit,
    QLabel,
    QHBoxLayout,
    QVBoxLayout,
    QComboBox,
)

from gui.widgets.form_editor.base import ListBasedSectionWidget
from gui.widgets.form_editor.duration_picker import DurationPickerWidget
from gui.models import Experience


def _set_valid(widget, valid: bool) -> None:
    """Toggle the 'invalid' CSS class and repaint."""
    widget.setProperty("cssClass", "" if valid else "invalid")
    widget.style().unpolish(widget)
    widget.style().polish(widget)


class ExperienceWidget(ListBasedSectionWidget):
    """Widget for editing work experience."""

    def __init__(self, parent=None):
        super().__init__(list_title="Experience:", item_name="Entry", parent=parent)

    def _setup_form(self, form_layout):
        self.exp_company = QLineEdit()
        self.exp_company.setPlaceholderText("Company Name")
        self.exp_location = QLineEdit()
        self.exp_location.setPlaceholderText("City, Country")
        self.exp_work_type = QComboBox()
        self.exp_work_type.addItems(["", "On-Site", "Hybrid", "Remote", "Freelance"])
        self.exp_position = QLineEdit()
        self.exp_position.setPlaceholderText("Job Title")
        self.exp_duration = DurationPickerWidget()

        self.exp_achievements = QTextEdit()
        self.exp_achievements.setPlaceholderText(
            "Reduced latency by 60% by...\n\nBuilt auto-scaling pipeline..."
        )
        self.exp_achievements.setMinimumHeight(380)

        # Three-column row: Company Name | Location | Work Type
        company_row = QHBoxLayout()
        company_row.setSpacing(8)

        company_col = QVBoxLayout()
        company_col.setSpacing(4)
        company_lbl = QLabel("Company")
        company_lbl.setProperty("cssClass", "field_label")
        company_col.addWidget(company_lbl)
        company_col.addWidget(self.exp_company)

        location_col = QVBoxLayout()
        location_col.setSpacing(4)
        location_lbl = QLabel("Location")
        location_lbl.setProperty("cssClass", "field_label")
        location_col.addWidget(location_lbl)
        location_col.addWidget(self.exp_location)

        work_type_col = QVBoxLayout()
        work_type_col.setSpacing(4)
        work_type_lbl = QLabel("Work Type")
        work_type_lbl.setProperty("cssClass", "field_label")
        work_type_col.addWidget(work_type_lbl)
        work_type_col.addWidget(self.exp_work_type)

        company_row.addLayout(company_col, 3)
        company_row.addLayout(location_col, 2)
        company_row.addLayout(work_type_col, 1)
        form_layout.addLayout(company_row)

        self._add_field(form_layout, "Position", self.exp_position)
        self._add_field(form_layout, "Duration", self.exp_duration)
        self._add_rich_text_field(
            form_layout, "Achievements (one bullet per line)", self.exp_achievements
        )
        self._setup_live_title_update(self.exp_company)

        # Real-time validation
        self.exp_company.textChanged.connect(
            lambda t: _set_valid(self.exp_company, bool(t.strip()))
        )
        self.exp_position.textChanged.connect(
            lambda t: _set_valid(self.exp_position, bool(t.strip()))
        )
        self.exp_duration.textChanged.connect(
            lambda t: _set_valid(self.exp_duration, bool(t.strip()))
        )
        self.exp_achievements.textChanged.connect(
            lambda: _set_valid(
                self.exp_achievements,
                bool(self.exp_achievements.toPlainText().strip()),
            )
        )

    def _get_current_item_data(self) -> dict:
        return Experience(
            company=self.exp_company.text().strip(),
            location=self.exp_location.text().strip(),
            work_type=self.exp_work_type.currentText(),
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
        self.exp_location.setText(exp.location)
        idx = self.exp_work_type.findText(exp.work_type)
        self.exp_work_type.setCurrentIndex(idx if idx >= 0 else 0)
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
            self.exp_location,
            self.exp_position,
            self.exp_duration,
            self.exp_achievements,
        ):
            _set_valid(w, True)

    def _clear_form(self):
        self.exp_company.clear()
        self.exp_location.clear()
        self.exp_work_type.setCurrentIndex(0)
        self.exp_position.clear()
        self.exp_duration.clear()
        self.exp_achievements.clear()
        # Reset validation state
        for w in (
            self.exp_company,
            self.exp_location,
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
