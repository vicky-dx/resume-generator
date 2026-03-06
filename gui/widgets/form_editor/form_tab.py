from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QListWidget,
    QStackedWidget,
    QPushButton,
    QLabel,
    QLineEdit,
    QFrame,
)
from PySide6.QtCore import Signal
from PySide6.QtGui import QFont

from gui.config import UIConfig
from gui.ui_helpers import apply_style
from pydantic import ValidationError
from gui.widgets.form_editor.personal_info import PersonalInfoWidget
from gui.widgets.form_editor.skills import SkillsWidget
from gui.widgets.form_editor.experience import ExperienceWidget
from gui.widgets.form_editor.education import EducationWidget
from gui.widgets.form_editor.projects import ProjectsWidget
from gui.widgets.form_editor.awards import AwardsWidget
from gui.models import ResumeData


class FormEditorTab(QWidget):
    """Main Form Editor tab comprising the sidebar nav, toolbar, and stacked widgets."""

    save_requested = Signal(str, dict)  # resume_name, data_dict
    save_and_generate_requested = Signal(str, dict)  # resume_name, data_dict
    load_requested = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.sections = []
        self._setup_ui()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(0)
        layout.setContentsMargins(0, 0, 0, 0)

        # ── Toolbar ──────────────────────────────────────────────────────────
        toolbar = QWidget()
        toolbar.setObjectName("formToolbar")
        toolbar_layout = QHBoxLayout(toolbar)
        toolbar_layout.setContentsMargins(12, 8, 12, 8)
        toolbar_layout.setSpacing(10)

        # ── Group 1: Name + file buttons ─────────────────────────────────
        name_card = QWidget()
        name_card.setObjectName("nameCard")
        name_card_layout = QHBoxLayout(name_card)
        name_card_layout.setContentsMargins(10, 6, 10, 6)
        name_card_layout.setSpacing(8)

        name_lbl = QLabel("✏️  Resume Name:")
        name_lbl.setProperty("cssClass", "header_secondary")
        name_card_layout.addWidget(name_lbl)

        self.form_resume_name = QLineEdit()
        self.form_resume_name.setPlaceholderText("e.g., software-engineer-google")
        self.form_resume_name.setMinimumWidth(220)
        self.form_resume_name.setMaximumWidth(300)
        name_card_layout.addWidget(self.form_resume_name)

        div1 = QFrame()
        div1.setFrameShape(QFrame.VLine)
        div1.setFrameShadow(QFrame.Sunken)
        div1.setProperty("cssClass", "divider")
        name_card_layout.addWidget(div1)

        load_btn = QPushButton("📂 Load")
        load_btn.setToolTip("Open a saved JSON resume file into this form")
        load_btn.clicked.connect(self.load_requested.emit)
        name_card_layout.addWidget(load_btn)

        save_btn = QPushButton("💾 Save")
        save_btn.setToolTip("Save current form data as a JSON template")
        save_btn.clicked.connect(self._on_save_clicked)
        name_card_layout.addWidget(save_btn)

        toolbar_layout.addWidget(name_card)
        toolbar_layout.addSpacing(8)

        # ── Group 2: Generate + Clear ─────────────────────────────────────
        action_card = QWidget()
        action_card.setObjectName("formActionCard")
        action_card_layout = QHBoxLayout(action_card)
        action_card_layout.setContentsMargins(10, 6, 10, 6)
        action_card_layout.setSpacing(8)

        gen_btn = QPushButton("🚀 Save & Generate PDF")
        gen_btn.setToolTip("Save and compile the resume to PDF")
        gen_btn.setMinimumWidth(200)
        gen_btn.setMinimumHeight(36)
        apply_style(gen_btn, "primary")
        gen_btn.clicked.connect(self._on_save_and_generate_clicked)
        action_card_layout.addWidget(gen_btn)

        clear_form_btn = QPushButton("🗑️ Clear")
        clear_form_btn.setToolTip("Reset all form fields")
        apply_style(clear_form_btn, "danger")
        clear_form_btn.clicked.connect(self._on_clear_clicked)
        action_card_layout.addWidget(clear_form_btn)

        toolbar_layout.addWidget(action_card)
        toolbar_layout.addStretch()
        layout.addWidget(toolbar)

        # ── Body: left nav + right stacked panel ──────────────────────────
        body = QHBoxLayout()
        body.setContentsMargins(0, 0, 0, 0)
        body.setSpacing(0)

        self.form_nav = QListWidget()
        self.form_nav.setObjectName("formNav")
        self.form_nav.setFixedWidth(160)
        self.form_nav.setSpacing(0)

        section_configs = [
            ("👤  Personal", PersonalInfoWidget),
            ("🛠  Skills", SkillsWidget),
            ("💼  Experience", ExperienceWidget),
            ("🎓  Education", EducationWidget),
            ("📁  Projects", ProjectsWidget),
            ("🏆  Certifications", AwardsWidget),
        ]

        self.form_stack = QStackedWidget()

        for name, widget_class in section_configs:
            self.form_nav.addItem(name)
            widget_instance = widget_class()
            self.sections.append(widget_instance)
            self.form_stack.addWidget(widget_instance)

        self.form_nav.setCurrentRow(0)
        self.form_nav.currentRowChanged.connect(self.form_stack.setCurrentIndex)
        body.addWidget(self.form_nav)

        body.addWidget(self.form_stack, 1)
        layout.addLayout(body, 1)

        self.setMinimumHeight(400)

    def _collect_data(self) -> dict | None:
        """
        Collect data from all sections and validate via Pydantic.
        Returns the validated dict, or None if validation fails (caller must not proceed).
        """
        from PySide6.QtWidgets import QMessageBox

        raw: dict = {}
        for section in self.sections:
            if isinstance(section, PersonalInfoWidget):
                pi, summary = section.collect()
                raw["personal_info"] = pi.model_dump()
                raw["summary"] = summary
            else:
                # Each other section returns {"experience": [...]} etc.
                raw.update(section.collect())
        try:
            # model_validate runs all field validators (coerce_skills, coerce_achievements, …)
            # Direct attribute assignment (old approach) bypassed them in Pydantic v2.
            return ResumeData.model_validate(raw).model_dump(by_alias=True)
        except ValidationError as e:
            QMessageBox.critical(
                self,
                "Validation Error",
                f"Resume data is invalid — generation blocked.\n\n{e}",
            )
            return None

    def _on_save_clicked(self):
        name = self.form_resume_name.text().strip()
        data = self._collect_data()
        if data is None:
            return
        self.save_requested.emit(name, data)

    def _on_save_and_generate_clicked(self):
        name = self.form_resume_name.text().strip()
        data = self._collect_data()
        if data is None:
            return
        self.save_and_generate_requested.emit(name, data)

    def _on_clear_clicked(self):
        from PySide6.QtWidgets import QMessageBox

        reply = QMessageBox.question(
            self,
            "Clear Form",
            "Clear all form fields? This cannot be undone.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No,
        )
        if reply == QMessageBox.StandardButton.Yes:
            self.form_resume_name.clear()
            for section in self.sections:
                section.clear()

    def populate(self, name: str, data: dict):
        """Populate the entire form from dictionary data."""
        self.form_resume_name.setText(name)
        resume_data = ResumeData.model_validate(data)

        # Map mapped Pydantic objects back into the UI forms
        for section_widget in self.sections:
            if isinstance(section_widget, PersonalInfoWidget):
                section_widget.populate(resume_data.personal_info, resume_data.summary)
            elif isinstance(section_widget, SkillsWidget):
                section_widget.populate(
                    {
                        "skills": [
                            s.model_dump(by_alias=True) for s in resume_data.skills
                        ]
                    }
                )
            elif isinstance(section_widget, ExperienceWidget):
                section_widget.populate(
                    {
                        "experience": [
                            e.model_dump(by_alias=True) for e in resume_data.experience
                        ]
                    }
                )
            elif isinstance(section_widget, EducationWidget):
                section_widget.populate(
                    {
                        "education": [
                            e.model_dump(by_alias=True) for e in resume_data.education
                        ]
                    }
                )
            elif isinstance(section_widget, ProjectsWidget):
                section_widget.populate(
                    {
                        "projects": [
                            p.model_dump(by_alias=True) for p in resume_data.projects
                        ]
                    }
                )
            elif isinstance(section_widget, AwardsWidget):
                section_widget.populate(
                    {
                        "awards": [
                            a.model_dump(by_alias=True) for a in resume_data.awards
                        ]
                    }
                )

    def get_resume_data(self) -> tuple[str, dict]:
        """Provides the resume name and data payload uniformly."""
        resume_name = self.form_resume_name.text().strip()
        if not resume_name:
            raise ValueError("Please enter a resume name")
        json_data = self._collect_data()
        return resume_name, json_data
