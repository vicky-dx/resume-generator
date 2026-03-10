from PySide6.QtWidgets import QLineEdit, QTextEdit, QLabel

from gui.widgets.form_editor.base import ListBasedSectionWidget
from gui.models import SkillCategory


class SkillsWidget(ListBasedSectionWidget):
    """Widget for editing skills categories."""

    def __init__(self, parent=None):
        super().__init__(list_title="Categories:", item_name="Category", parent=parent)

    def _setup_form(self, form_layout):
        self.cat_edit = QLineEdit()
        self.cat_edit.setPlaceholderText("e.g. Programming Languages")

        self.items_edit = QTextEdit()
        self.items_edit.setPlaceholderText("Python\nSQL\nAWS S3\nDocker")

        hint = QLabel(
            "Tip: Select a category on the left, then edit its name and skills here."
        )
        hint.setWordWrap(True)
        hint.setProperty("cssClass", "hint")

        self._add_field(form_layout, "Category Name", self.cat_edit)
        self._add_rich_text_field(form_layout, "Skills (one per line)", self.items_edit)
        form_layout.addWidget(hint)
        self._setup_live_title_update(self.cat_edit)

    def _get_current_item_data(self) -> dict:
        cat = self.cat_edit.text().strip()
        skills = [
            s.strip() for s in self.items_edit.toPlainText().split("\n") if s.strip()
        ]
        return SkillCategory(category=cat, items=skills).model_dump(by_alias=True)

    def _set_current_item_data(self, data: dict):
        skill_cat = SkillCategory.model_validate(data)
        self.cat_edit.setText(skill_cat.category)

        # Handle backwards compatibility (older JSON stored them as 'skills' list vs 'items' in dataclass)
        if skill_cat.items:
            self.items_edit.setPlainText("\n".join(skill_cat.items))
        elif "skills" in data:
            self.items_edit.setPlainText("\n".join(data["skills"]))
        else:
            self.items_edit.clear()

    def _clear_form(self):
        self.cat_edit.clear()
        self.items_edit.clear()

    def _get_item_title(self, data: dict) -> str:
        return data.get("category", "")

    def _get_empty_item(self) -> dict:
        return SkillCategory().model_dump(by_alias=True)

    # Override for dict structure rather than list
    def collect(self) -> dict:
        self._save_current()
        skills = {}
        for entry in self.data_list:
            skill_cat = SkillCategory.model_validate(entry)

            # Backwards compat extraction if not matching strict dataclass schema yet
            cat = (
                skill_cat.category
                if skill_cat.category
                else entry.get("category", "").strip()
            )
            items = skill_cat.items if skill_cat.items else entry.get("skills", [])

            if cat:
                skills[cat] = items
        return {"skills": skills}

    def populate(self, data: dict):
        # Determine if data arrived as a raw dictionary (legacy format) or a pre-validated list of dicts.
        skills_data = data.get("skills", [])

        list_data = []
        if isinstance(skills_data, dict):
            # Legacy format {"Category": ["A", "B"]}
            list_data = [
                SkillCategory(category=cat, items=skills).model_dump(by_alias=True)
                for cat, skills in skills_data.items()
            ]
        elif isinstance(skills_data, list):
            # Already mapped by Pydantic ResumeData before validator -> [{"category": "Cat", "items": ["A"]}]
            list_data = skills_data

        self._populate_list(list_data)
