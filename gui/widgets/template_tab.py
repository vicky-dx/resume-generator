from pathlib import Path
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QListWidget,
    QLabel,
    QPushButton,
)
from PySide6.QtCore import Signal
from PySide6.QtGui import QFont

from gui.config import UIConfig
from gui.ui_helpers import get_icon
from gui.protocols import ITemplateLoader  # ISP: narrow interface, not full FileManager


class TemplateTab(QWidget):
    """Tab for selecting and loading existing JSON templates."""

    # Signals for communicating with main window
    edit_requested = Signal(str)  # filename
    refresh_requested = Signal()

    def __init__(self, file_manager: ITemplateLoader, parent=None):
        super().__init__(parent)
        self.file_manager = file_manager
        self._setup_ui()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(8)
        layout.setContentsMargins(12, 12, 12, 12)

        # Header section with label and buttons
        header_layout = QHBoxLayout()
        header_layout.setSpacing(5)

        header_label = QLabel("Available Templates:")
        header_label.setProperty("cssClass", "header_primary")

        header_layout.addWidget(header_label)

        self.edit_btn = QPushButton(" Edit")
        self.edit_btn.setIcon(get_icon(UIConfig.ICON_EDIT))
        self.edit_btn.clicked.connect(self._on_edit_clicked)
        header_layout.addWidget(self.edit_btn)

        self.refresh_btn = QPushButton(" Refresh")
        self.refresh_btn.setIcon(get_icon(UIConfig.ICON_REFRESH))
        self.refresh_btn.clicked.connect(self.refresh_requested.emit)
        header_layout.addWidget(self.refresh_btn)
        header_layout.addStretch()

        layout.addLayout(header_layout)

        # Template list widget
        self.template_list = QListWidget()
        self.template_list.setMinimumHeight(140)
        self.template_list.setSpacing(2)
        # Double click to edit
        self.template_list.itemDoubleClicked.connect(self._on_edit_clicked)
        layout.addWidget(self.template_list, 1)

        self.setMinimumHeight(200)

    def update_templates(self, templates: list[str]):
        """Update the list of templates."""
        self.template_list.clear()
        self.template_list.addItems(templates)
        if templates:
            self.template_list.setCurrentRow(0)

    def _on_edit_clicked(self):
        """Emit signal when edit is clicked."""
        selected_item = self.template_list.currentItem()
        if selected_item:
            self.edit_requested.emit(selected_item.text())

    def get_resume_data(self) -> tuple[str, dict]:
        """Provides the resume name and data payload uniformly."""
        selected = self.template_list.currentItem()
        if not selected:
            raise ValueError("Please select a template to generate")
        filename = selected.text()
        resume_name = Path(filename).stem
        json_data = self.file_manager.load_template(filename)
        return resume_name, json_data
