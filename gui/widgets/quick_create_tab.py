from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QApplication,
)
from PySide6.QtCore import Signal
from PySide6.QtGui import QFont

from gui.config import UIConfig
from gui.ui_helpers import get_icon
from gui.widgets.json_editor import JSONEditor


class QuickCreateTab(QWidget):
    """Tab for raw JSON creation and editing."""

    save_requested = Signal(str, str)  # filename, json_text
    validate_requested = Signal(str)  # json_text

    def __init__(self, parent=None):
        super().__init__(parent)
        self._setup_ui()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(UIConfig.PAD_SMALL)
        layout.setContentsMargins(
            UIConfig.PAD_SMALL,
            UIConfig.PAD_SMALL,
            UIConfig.PAD_SMALL,
            UIConfig.PAD_SMALL,
        )

        # Resume name input section
        name_layout = QHBoxLayout()
        name_label = QLabel("Resume Name:")
        name_label.setProperty("cssClass", "header_secondary")
        name_layout.addWidget(name_label)

        self.resume_name_input = QLineEdit()
        self.resume_name_input.setPlaceholderText("e.g., my-resume, backend-swe")
        name_layout.addWidget(self.resume_name_input, 1)

        self.editing_indicator = QLabel()
        self.editing_indicator.setProperty("cssClass", "header_primary")
        self.editing_indicator.setVisible(False)
        name_layout.addWidget(self.editing_indicator)

        layout.addLayout(name_layout)

        # JSON editor section
        from PySide6.QtWidgets import QHBoxLayout as _HBox
        from gui.widgets.format_toolbar import FormatToolbar

        json_editor_header = _HBox()
        json_label = QLabel("JSON Resume Data:")
        json_label.setProperty("cssClass", "header_primary")
        self.json_editor = JSONEditor()
        json_editor_header.addWidget(json_label)
        json_editor_header.addWidget(FormatToolbar(self.json_editor))
        layout.addLayout(json_editor_header)

        layout.addWidget(self.json_editor, 1)

        # Buttons section
        json_buttons = QHBoxLayout()
        json_buttons.setSpacing(UIConfig.PAD_SMALL)

        paste_btn = QPushButton(" Paste")
        paste_btn.setIcon(get_icon(UIConfig.ICON_PASTE))
        paste_btn.clicked.connect(self.paste_from_clipboard)
        json_buttons.addWidget(paste_btn)

        validate_btn = QPushButton(" ✓ Validate JSON")
        validate_btn.clicked.connect(self._on_validate_clicked)
        json_buttons.addWidget(validate_btn)

        save_btn = QPushButton(" Save Template")
        save_btn.setIcon(get_icon(UIConfig.ICON_SAVE))
        save_btn.clicked.connect(self._on_save_clicked)
        json_buttons.addWidget(save_btn)

        clear_btn = QPushButton(" Clear")
        clear_btn.setIcon(get_icon(UIConfig.ICON_TRASH, color="white"))
        clear_btn.clicked.connect(self.clear_editor)
        json_buttons.addWidget(clear_btn)

        json_buttons.addStretch()
        layout.addLayout(json_buttons)

        self.setMinimumHeight(400)
        self.current_editing_file = None

    def paste_from_clipboard(self):
        clipboard = QApplication.clipboard()
        text = clipboard.text()
        self.json_editor.setPlainText(text)

    def _on_validate_clicked(self):
        self.validate_requested.emit(self.json_editor.toPlainText())

    def _on_save_clicked(self):
        name = self.resume_name_input.text().strip()
        text = self.json_editor.toPlainText().strip()
        self.save_requested.emit(name, text)

    def clear_editor(self):
        self.resume_name_input.clear()
        self.json_editor.clear()
        self.editing_indicator.setVisible(False)
        self.current_editing_file = None

    def load_data(self, name: str, json_text: str, filename: str = None):
        """Load data into the editor for editing."""
        self.resume_name_input.setText(name)
        self.json_editor.setPlainText(json_text)

        if filename:
            self.current_editing_file = filename
            self.editing_indicator.setText(f"Editing: {filename}")
            self.editing_indicator.setVisible(True)

    def get_resume_data(self) -> tuple[str, dict]:
        """Provides the resume name and data payload uniformly."""
        import json

        json_text = self.json_editor.toPlainText().strip()
        resume_name = self.resume_name_input.text().strip()
        if not json_text or not resume_name:
            raise ValueError("Please provide both a resume name and JSON data")
        try:
            json_data = json.loads(json_text)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON data: {str(e)}")
        return resume_name, json_data
