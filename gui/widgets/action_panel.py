from PySide6.QtWidgets import (
    QWidget,
    QHBoxLayout,
    QLabel,
    QComboBox,
    QPushButton,
    QFrame,
    QColorDialog,
)
from PySide6.QtCore import Signal
from PySide6.QtGui import QColor

from gui.config import UIConfig
from gui.utils import get_resource_path
from gui.ui_helpers import apply_style


class ActionPanelWidget(QWidget):
    """Component handling styling parameters and the Generate PDF action."""

    # Emits dict with style parameters (template, font, size, color)
    generate_requested = Signal(dict)
    open_folder_requested = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("actionCard")
        self._picked_color = (96, 36, 191)  # Default purple
        self._setup_ui()

    def _setup_ui(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 10, 16, 10)
        layout.setSpacing(10)

        # Style Icon
        style_lbl = QLabel("🎨")
        style_lbl.setStyleSheet("font-size: 14pt;")
        style_lbl.setProperty("cssClass", "transparent_bg")
        layout.addWidget(style_lbl)

        # Template Selection
        layout.addWidget(QLabel("Template:"))
        self.style_template = QComboBox()
        self.style_template.setFixedWidth(130)
        self._populate_templates()
        layout.addWidget(self.style_template)

        self._add_divider(layout)

        # Font Selection
        layout.addWidget(QLabel("Font:"))
        self.style_font = QComboBox()
        self.style_font.addItems(
            ["Calibri", "Arial", "Georgia", "Times New Roman", "Verdana"]
        )
        self.style_font.setFixedWidth(145)
        layout.addWidget(self.style_font)

        # Size Selection
        layout.addWidget(QLabel("Size:"))
        self.style_size = QComboBox()
        self.style_size.addItems(
            [str(s) for s in [9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0]]
        )
        self.style_size.setCurrentIndex(5)  # default 11.5
        self.style_size.setFixedWidth(65)
        layout.addWidget(self.style_size)

        # Color Selection
        layout.addWidget(QLabel("Colour:"))
        self.color_btn = QPushButton()
        self.color_btn.setFixedSize(36, 28)
        self.color_btn.setToolTip("Pick section heading colour")
        self._refresh_color_btn()
        self.color_btn.clicked.connect(self._pick_color)
        layout.addWidget(self.color_btn)

        self._add_divider(layout)

        # Action Buttons
        self.generate_btn = QPushButton(f"{UIConfig.ICON_ROCKET} Generate PDF")
        self.generate_btn.setMinimumHeight(42)
        self.generate_btn.setMinimumWidth(160)
        apply_style(self.generate_btn, "primary")
        self.generate_btn.clicked.connect(self._on_generate_clicked)
        layout.addWidget(self.generate_btn)

        self.open_folder_btn = QPushButton(f"{UIConfig.ICON_FOLDER} Open Folder")
        self.open_folder_btn.setMinimumHeight(42)
        self.open_folder_btn.setMinimumWidth(130)
        apply_style(self.open_folder_btn, "default")
        self.open_folder_btn.clicked.connect(self.open_folder_requested.emit)
        layout.addWidget(self.open_folder_btn)

        layout.addStretch()

    def _add_divider(self, layout):
        div = QFrame()
        div.setFrameShape(QFrame.VLine)
        div.setFrameShadow(QFrame.Sunken)
        div.setProperty("cssClass", "divider")
        layout.addWidget(div)

    def _populate_templates(self):
        """Scan and populate .tex templates."""
        templates_dir = get_resource_path("script") / "templates"
        templates = sorted(p.name for p in templates_dir.glob("*.tex"))
        for tmpl in templates:
            self.style_template.addItem(tmpl)

    def _refresh_color_btn(self):
        """Update the colour-swatch button background."""
        r, g, b = self._picked_color
        self.color_btn.setStyleSheet(
            f"QPushButton {{ background-color: rgb({r},{g},{b});"
            f" border: 1px solid #CED4DA; border-radius: 4px; }}"
            f"QPushButton:hover {{ border: 2px solid #0078d4; }}"
        )

    def _pick_color(self):
        """Open QColorDialog and update stored colour."""
        r, g, b = self._picked_color
        chosen = QColorDialog.getColor(QColor(r, g, b), self, "Section Heading Colour")
        if chosen.isValid():
            self._picked_color = (chosen.red(), chosen.green(), chosen.blue())
            self._refresh_color_btn()

    def set_generating_state(self, is_generating: bool):
        """Update button state during generation."""
        self.generate_btn.setEnabled(not is_generating)
        if is_generating:
            self.generate_btn.setText(f"{UIConfig.ICON_REFRESH} Generating...")
        else:
            self.generate_btn.setText(f"{UIConfig.ICON_ROCKET} Generate PDF")

    def _on_generate_clicked(self):
        """Emit style parameters for generation."""
        params = {
            "template_name": self.style_template.currentText(),
            "font": self.style_font.currentText(),
            "font_size": float(self.style_size.currentText()),
            "section_color": self._picked_color,
        }
        self.generate_requested.emit(params)
