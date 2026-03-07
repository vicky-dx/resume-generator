from PySide6.QtWidgets import QLineEdit, QLabel

from gui.widgets.form_editor.base import ListBasedSectionWidget
from gui.models import Award


class AwardsWidget(ListBasedSectionWidget):
    """Widget for editing awards and certifications."""

    def __init__(self, parent=None):
        super().__init__(list_title="Certifications:", item_name="Entry", parent=parent)

    def _setup_form(self, form_layout):
        self.award_title = QLineEdit()
        self.award_title.setPlaceholderText("AWS Certified Data Engineer Associate")
        self.award_desc = QLineEdit()
        self.award_desc.setPlaceholderText("Optional short note (e.g. In progress)")

        self._add_field(form_layout, "Title", self.award_title)
        self._add_field(form_layout, "Description", self.award_desc)
        self._setup_live_title_update(self.award_title)

    def _get_current_item_data(self) -> dict:
        return Award(
            title=self.award_title.text().strip(),
            date=self.award_desc.text().strip(),  # Note: mapping description to date here since UI uses desc
        ).model_dump(by_alias=True)

    def _set_current_item_data(self, data: dict):
        award = Award.model_validate(data)
        self.award_title.setText(award.title)

        # Handle backward compability logic
        if award.date:
            self.award_desc.setText(award.date)
        elif "description" in data:
            self.award_desc.setText(data["description"])

    def _clear_form(self):
        self.award_title.clear()
        self.award_desc.clear()

    def _get_item_title(self, data: dict) -> str:
        return data.get("title", "")

    def _get_empty_item(self) -> dict:
        return Award().model_dump(by_alias=True)

    def collect(self) -> dict:
        return {"awards": self._collect_list()}

    def populate(self, data: dict):
        self._populate_list(data.get("awards", []))
