from PySide6.QtWidgets import QLineEdit, QTextEdit, QLabel

from gui.widgets.form_editor.base import ListBasedSectionWidget
from gui.models import Project


class ProjectsWidget(ListBasedSectionWidget):
    """Widget for editing projects."""

    def __init__(self, parent=None):
        super().__init__(list_title="Projects:", item_name="Project", parent=parent)

    def _setup_form(self, form_layout):
        self.proj_name = QLineEdit()
        self.proj_name.setPlaceholderText("Project Title")
        self.proj_year = QLineEdit()
        self.proj_year.setPlaceholderText("2025")
        self.proj_tech = QLineEdit()
        self.proj_tech.setPlaceholderText("Python, Kafka, AWS S3, Docker")

        self.proj_desc = QTextEdit()
        self.proj_desc.setPlaceholderText(
            "Developed an internal dashboard...\n\nAutomated reporting pipeline..."
        )
        self.proj_desc.setMinimumHeight(200)

        self._add_field(form_layout, "Name", self.proj_name)
        self._add_field(form_layout, "Year", self.proj_year)
        self._add_field(form_layout, "Technologies", self.proj_tech)
        self._add_field(form_layout, "Description", self.proj_desc)

    def _get_current_item_data(self) -> dict:
        return Project(
            name=self.proj_name.text().strip(),
            date=self.proj_year.text().strip(),
            tech_stack=self.proj_tech.text().strip(),
            description=[line.strip() for line in self.proj_desc.toPlainText().split("\n") if line.strip()],
        ).model_dump(by_alias=True)

    def _set_current_item_data(self, data: dict):
        proj = Project.model_validate(data)
        self.proj_name.setText(proj.name)
        self.proj_year.setText(proj.date)
        self.proj_tech.setText(proj.tech_stack)
        
        # Handle backward compatibility
        if not proj.date and "year" in data:
            self.proj_year.setText(data["year"])
        if not proj.tech_stack and "technologies" in data:
            self.proj_tech.setText(data["technologies"])
            
        # Previously projects stored description as str. Dataclass standardizes to list.
        if isinstance(data.get("description"), str):
             self.proj_desc.setPlainText(data.get("description", ""))
        else:
             self.proj_desc.setPlainText("\n\n".join(proj.description))

    def _clear_form(self):
        self.proj_name.clear()
        self.proj_year.clear()
        self.proj_tech.clear()
        self.proj_desc.clear()

    def _get_item_title(self, data: dict) -> str:
        return data.get("name", "")

    def _get_empty_item(self) -> dict:
        return Project().model_dump(by_alias=True)

    def collect(self) -> dict:
        return {"projects": self._collect_list()}

    def populate(self, data: dict):
        self._populate_list(data.get("projects", []))
