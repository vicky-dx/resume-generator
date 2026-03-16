"""AI Library tab — focused completely on aggregating and intelligently merging projects via LLM."""

import asyncio
import os

from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QPushButton,
    QSplitter,
    QScrollArea,
    QFrame,
    QTabWidget,
    QMessageBox,
)
from PySide6.QtCore import Qt, QSettings, QFileSystemWatcher
from PySide6.QtGui import QFont
from qasync import asyncSlot

from gui.config import UIConfig
from gui.protocols import ILibraryReader
from gui.ui_helpers import get_icon, make_icon_button
from gui.widgets.provider_dialog import ProviderKeyDialog


def _bold_label(text: str, size: int = UIConfig.FONT_NORMAL_SIZE) -> QLabel:
    lbl = QLabel(text)
    f = QFont()
    f.setBold(True)
    f.setPointSize(size)
    lbl.setFont(f)
    return lbl


class ProjectDetailPanel(QScrollArea):
    """Right panel – renders full detail of the selected project."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWidgetResizable(True)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.setFrameShape(QFrame.Shape.NoFrame)
        self.show_placeholder("← Select a project from the list")

    def show_placeholder(self, text: str) -> None:
        w = QWidget()
        lyt = QVBoxLayout(w)
        lyt.setContentsMargins(20, 60, 20, 20)
        lbl = QLabel(text)
        lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lbl.setStyleSheet("color: #ADB5BD; font-style: italic;")
        lyt.addWidget(lbl)
        lyt.addStretch()
        self.setWidget(w)

    def show_project(self, project) -> None:
        w = QWidget()
        lyt = QVBoxLayout(w)
        lyt.setContentsMargins(20, 16, 20, 20)
        lyt.setSpacing(10)

        # Name
        name_lbl = _bold_label(project.name, UIConfig.FONT_SECTION_SIZE + 1)
        name_lbl.setWordWrap(True)
        name_lbl.setStyleSheet(f"color: {UIConfig.COLOR_PRIMARY};")
        lyt.addWidget(name_lbl)

        # Meta
        meta_lyt = QHBoxLayout()
        if project.date:
            yr = QLabel(f"📅  {project.date}")
            yr.setStyleSheet("color: #6C757D; font-size: 10pt;")
            meta_lyt.addWidget(yr)
        meta_lyt.addStretch()
        src = QLabel(f"  {project.source}  ")
        src.setStyleSheet(
            "background:#F1F3F5; color:#6C757D; border:1px solid #DEE2E6; border-radius:4px;"
        )
        meta_lyt.addWidget(src)
        lyt.addLayout(meta_lyt)

        sep = QFrame()
        sep.setFrameShape(QFrame.Shape.HLine)
        sep.setStyleSheet("background:#E9ECEF; max-height:1px; border:none;")
        lyt.addWidget(sep)

        # Tech
        if project.tech_stack:
            tech_hdr = _bold_label("Technologies")
            lyt.addWidget(tech_hdr)
            techs = [t.strip() for t in project.tech_stack.split(",") if t.strip()]
            tag_html = "  ".join(
                f'<span style="background:#EEF4FF;color:#0078d4;border:1px solid #B6D4F7;border-radius:4px;padding:2px 8px;font-size:9pt;">{t}</span>'
                for t in techs
            )
            lbl_tech = QLabel(tag_html)
            lbl_tech.setWordWrap(True)
            lbl_tech.setTextFormat(Qt.TextFormat.RichText)
            lyt.addWidget(lbl_tech)

        # Description
        desc_hdr = _bold_label("Description")
        lyt.addWidget(desc_hdr)

        desc_text = (
            "\n\n".join(f"• {point}" for point in project.description)
            if project.description
            else "No description available."
        )
        desc_lbl = QLabel(desc_text)
        desc_lbl.setWordWrap(True)
        # Add some line height/spacing using CSS equivalent for Qt or just by using \n\n
        desc_lbl.setStyleSheet("line-height: 1.4;")
        lyt.addWidget(desc_lbl)
        lyt.addStretch()
        self.setWidget(w)


class ProjectsView(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.projects = []

        lyt = QVBoxLayout(self)
        lyt.setContentsMargins(0, 0, 0, 0)

        self.splitter = QSplitter(Qt.Orientation.Horizontal)

        left_widget = QWidget()
        left_lyt = QVBoxLayout(left_widget)
        left_lyt.setContentsMargins(8, 8, 8, 8)

        self.list_widget = QListWidget()
        self.list_widget.setObjectName("innerNav")
        self.list_widget.setWordWrap(True)  # Fix: prevents long titles from clipping
        self.list_widget.setSpacing(2)  # Fix: adds spacing between list items
        self.list_widget.currentRowChanged.connect(self._on_row_changed)
        left_lyt.addWidget(self.list_widget)

        self.detail_panel = ProjectDetailPanel()

        self.splitter.addWidget(left_widget)
        self.splitter.addWidget(self.detail_panel)
        self.splitter.setSizes([260, 600])
        lyt.addWidget(self.splitter)

    def populate(self, projects: list):
        self.projects = projects
        self.list_widget.clear()
        for p in projects:
            self.list_widget.addItem(p.name)
        if projects:
            self.list_widget.setCurrentRow(0)
        else:
            self.detail_panel.show_placeholder("No projects found.")

    def _on_row_changed(self, row: int):
        if 0 <= row < len(self.projects):
            self.detail_panel.show_project(self.projects[row])


class SkillsView(QScrollArea):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWidgetResizable(True)
        w = QWidget()
        self.lyt = QVBoxLayout(w)
        self.lyt.addStretch()
        self.setWidget(w)

    def populate(self, skills: list):
        w = QWidget()
        lyt = QVBoxLayout(w)
        if not skills:
            lyt.addWidget(QLabel("No skills found."))
        else:
            for cat in skills:
                lyt.addWidget(_bold_label(cat.category))
                items = cat.items or []
                tag_html = "  ".join(
                    f'<span style="background:#EEF4FF;color:#0078d4;border:1px solid #B6D4F7;border-radius:4px;padding:3px 8px;font-size:9pt;">{item}</span>'
                    for item in items
                )
                lbl = QLabel(tag_html)
                lbl.setWordWrap(True)
                lbl.setTextFormat(Qt.TextFormat.RichText)
                lyt.addWidget(lbl)
        lyt.addStretch()
        self.setWidget(w)


class LibraryTab(QWidget):
    """A heavily simplified AI-only implementation of the Library."""

    show_action_panel = False

    def __init__(self, library_reader: ILibraryReader, parent=None):
        super().__init__(parent)
        self._reader = library_reader
        self._setup_ui()
        self._setup_file_watcher()

    def _setup_file_watcher(self):
        self.watcher = QFileSystemWatcher(self)
        if hasattr(self._reader, "_json_folder"):
            folder_path = str(self._reader._json_folder)
            self.watcher.addPath(folder_path)
            self.watcher.directoryChanged.connect(self._on_directory_changed)

    def _on_directory_changed(self, path):
        self.load_ai_btn.setText(" ⚠️ Updates Available - Refresh AI Library")
        self.load_ai_btn.setStyleSheet(
            f"background-color: {UIConfig.COLOR_WARNING}; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-weight: bold;"
        )
        self.load_ai_btn.setIcon(get_icon(UIConfig.ICON_REFRESH, color="white"))

    def _setup_ui(self) -> None:
        lyt = QVBoxLayout(self)

        # Top toolbar
        toolbar = QHBoxLayout()
        title = _bold_label("AI Project Merger", 14)
        title.setStyleSheet(f"color: {UIConfig.COLOR_PRIMARY};")
        toolbar.addWidget(title)
        toolbar.addStretch()

        self.load_ai_btn = QPushButton(" Load AI Master Library")
        self.load_ai_btn.setIcon(get_icon(UIConfig.ICON_AI, color="white"))
        self.load_ai_btn.setProperty("cssClass", "primary")
        self.load_ai_btn.clicked.connect(self._on_load_clicked)
        toolbar.addWidget(self.load_ai_btn)

        self.settings_btn = make_icon_button(
            UIConfig.ICON_EDIT,
            size=UIConfig.ICON_BTN_SIZE,
            tooltip="Change Provider or API Key",
        )
        self.settings_btn.clicked.connect(self._change_api_key)
        toolbar.addWidget(self.settings_btn)

        lyt.addLayout(toolbar)

        # Tabs for Projects / Skills
        self.tabs = QTabWidget()
        self.projects_view = ProjectsView()
        self.skills_view = SkillsView()

        self.tabs.addTab(
            self.projects_view, get_icon(UIConfig.ICON_PROJECT), "Merged Projects"
        )
        self.tabs.addTab(
            self.skills_view, get_icon(UIConfig.ICON_SKILLS), "Aggregated Skills"
        )

        lyt.addWidget(self.tabs, 1)

    def _change_api_key(self):
        """Force open the API Key dialog to update settings."""
        settings = QSettings("ResumeAutomation", "ResumeGenerator")
        dialog = ProviderKeyDialog(self)
        if dialog.exec():
            settings.setValue("ai_provider", dialog.provider)
            settings.setValue("ai_api_key", dialog.api_key)
            if dialog.provider == "DeepSeek":
                os.environ["DEEPSEEK_API_KEY"] = dialog.api_key
            QMessageBox.information(self, "Success", "API Key updated successfully!")

    @asyncSlot()
    async def _on_load_clicked(self):
        # 1. Grab API Credentials transparently from native OS QtSettings
        settings = QSettings("ResumeAutomation", "ResumeGenerator")
        provider = settings.value("ai_provider", "DeepSeek")
        api_key = settings.value("ai_api_key", "")

        # Only prompt dialog if we truly don't have a backend key saved
        if not api_key:
            dialog = ProviderKeyDialog(self)
            if not dialog.exec():
                return

            provider = dialog.provider
            api_key = dialog.api_key

            if not api_key:
                QMessageBox.warning(
                    self, "Error", "API Key is required to use the AI Merger."
                )
                return

            # Save it so we never have to ask again
            settings.setValue("ai_provider", provider)
            settings.setValue("ai_api_key", api_key)

        # Let the exact backend implementation know the token
        if provider == "DeepSeek":
            os.environ["DEEPSEEK_API_KEY"] = api_key

        self.load_ai_btn.setText(" Analyzing and Merging...")
        self.load_ai_btn.setEnabled(False)
        self.projects_view.detail_panel.show_placeholder(
            "AI is analyzing and merging duplicates... Please wait."
        )
        self.projects_view.list_widget.clear()

        # 2. Run the heavy I/O off the main thread to prevent freezing
        loop = asyncio.get_running_loop()

        try:
            # Tell LibraryService to always use AI
            projects, skills = await loop.run_in_executor(
                None, lambda: self._reader.load_all(use_ai=True)
            )

            # 3. Bring data back to main thread and populate exactly
            self.projects_view.populate(projects)
            self.skills_view.populate(skills)
        except Exception as e:
            QMessageBox.critical(self, "AI Merge Failed", str(e))
            self.projects_view.detail_panel.show_placeholder("Error during AI merge.")
        finally:
            self.load_ai_btn.setText(" Refresh with AI")
            self.load_ai_btn.setStyleSheet("")
            self.load_ai_btn.setIcon(get_icon(UIConfig.ICON_AI, color="white"))
            self.load_ai_btn.setEnabled(True)
