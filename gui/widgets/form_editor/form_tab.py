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
from PySide6.QtCore import Signal, Qt, QSize
from PySide6.QtGui import QFont

from gui.config import UIConfig
from gui.ui_helpers import (
    apply_style,
    get_icon,
    set_custom_tooltip,
    install_list_tooltip_filter,
)
from pydantic import ValidationError
from gui.widgets.form_editor.personal_info import PersonalInfoWidget
from gui.widgets.form_editor.skills import SkillsWidget
from gui.widgets.form_editor.experience import ExperienceWidget
from gui.widgets.form_editor.education import EducationWidget
from gui.widgets.form_editor.projects import ProjectsWidget
from gui.widgets.form_editor.awards import AwardsWidget
from gui.widgets.vertical_action_panel import VerticalActionPanelWidget
from gui.models import ResumeData
from gui.utils import get_resource_path


class FormEditorTab(QWidget):
    """Main Form Editor tab comprising the sidebar nav, toolbar, and stacked widgets."""

    save_requested = Signal(str, dict)  # resume_name, data_dict
    save_and_generate_requested = Signal(
        str, dict, dict
    )  # resume_name, data_dict, style_config
    load_requested = Signal()
    open_folder_requested = Signal()

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
        toolbar_layout.setContentsMargins(16, 12, 16, 12)
        toolbar_layout.setSpacing(16)

        name_lbl = QLabel("Resume Name:")
        name_lbl.setProperty("cssClass", "header_secondary")
        toolbar_layout.addWidget(name_lbl)

        self.form_resume_name = QLineEdit()
        self.form_resume_name.setPlaceholderText("e.g., john-doe-swe")
        self.form_resume_name.setMaximumWidth(320)
        toolbar_layout.addWidget(self.form_resume_name)

        div1 = QFrame()
        div1.setFrameShape(QFrame.VLine)
        div1.setFrameShadow(QFrame.Plain)
        div1.setStyleSheet("border-left: 1px solid #CED4DA;")
        toolbar_layout.addWidget(div1)

        load_btn = QPushButton(" Load")
        load_btn.setIcon(get_icon(UIConfig.ICON_FOLDER))
        set_custom_tooltip(load_btn, "Open a saved JSON file into this form")
        apply_style(load_btn, "default")
        load_btn.clicked.connect(self.load_requested.emit)
        toolbar_layout.addWidget(load_btn)

        save_btn = QPushButton(" Save JSON")
        save_btn.setIcon(get_icon(UIConfig.ICON_SAVE))
        set_custom_tooltip(save_btn, "Save form data as a JSON template")
        apply_style(save_btn, "default")
        save_btn.clicked.connect(self._on_save_clicked)
        toolbar_layout.addWidget(save_btn)

        clear_btn = QPushButton(" Clear")
        clear_btn.setIcon(get_icon(UIConfig.ICON_TRASH, color="white"))
        set_custom_tooltip(clear_btn, "Reset all form fields")
        apply_style(clear_btn, "danger")
        clear_btn.clicked.connect(self._on_clear_clicked)
        toolbar_layout.addWidget(clear_btn)

        toolbar_layout.addStretch()
        layout.addWidget(toolbar)

        # ── Body: 3-column Left Nav + Stacked Panel + Right Settings ───────
        body = QHBoxLayout()
        body.setContentsMargins(0, 0, 0, 0)
        body.setSpacing(0)

        self.form_nav = QListWidget()
        self.form_nav.setObjectName("formNav")
        self.form_nav.setFixedWidth(64)
        self.form_nav.setSpacing(0)
        self.form_nav.setIconSize(QSize(32, 32))

        section_configs = [
            ("personal.png", "Personal Info", PersonalInfoWidget),
            ("skills.png", "Skills", SkillsWidget),
            ("experience.png", "Experience", ExperienceWidget),
            ("education.png", "Education", EducationWidget),
            ("project.png", "Projects", ProjectsWidget),
            ("certification.png", "Certifications", AwardsWidget),
        ]

        self.form_stack = QStackedWidget()

        from PySide6.QtWidgets import QListWidgetItem
        from PySide6.QtGui import QIcon

        assets_dir = get_resource_path("assets")

        for icon_file, tooltip, widget_class in section_configs:
            item = QListWidgetItem()
            item.setToolTip(tooltip)
            icon_path = assets_dir / icon_file
            if icon_path.exists():
                item.setIcon(QIcon(str(icon_path)))

            # Align icon in the center natively
            item.setTextAlignment(Qt.AlignCenter)
            self.form_nav.addItem(item)

            widget_instance = widget_class()
            self.sections.append(widget_instance)
            self.form_stack.addWidget(widget_instance)

        self.form_nav.setCurrentRow(0)
        self.form_nav.currentRowChanged.connect(self.form_stack.setCurrentIndex)
        install_list_tooltip_filter(self.form_nav)
        body.addWidget(self.form_nav)

        body.addWidget(self.form_stack, 1)

        div_v = QFrame()
        div_v.setFrameShape(QFrame.VLine)
        div_v.setFrameShadow(QFrame.Plain)
        div_v.setStyleSheet("border-left: 1px solid #CED4DA;")
        body.addWidget(div_v)

        self.action_panel = VerticalActionPanelWidget()
        self.action_panel.generate_requested.connect(
            self._on_action_panel_generate_requested
        )
        self.action_panel.open_folder_requested.connect(self.open_folder_requested.emit)
        body.addWidget(self.action_panel)

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

    def _on_action_panel_generate_requested(self, style_config: dict):
        name = self.form_resume_name.text().strip()
        data = self._collect_data()
        if data is None:
            return
        self.save_and_generate_requested.emit(name, data, style_config)

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
