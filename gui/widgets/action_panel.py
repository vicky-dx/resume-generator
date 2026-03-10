from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QComboBox,
    QPushButton,
    QFrame,
    QColorDialog,
    QLineEdit,
    QCheckBox,
)
from PySide6.QtCore import Signal
from PySide6.QtGui import QColor

from gui.config import UIConfig
from gui.utils import get_resource_path
from gui.ui_helpers import apply_style, get_icon, set_custom_tooltip


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
        main_layout = QHBoxLayout(self)
        main_layout.setContentsMargins(16, 16, 16, 16)
        main_layout.setSpacing(24)

        # ── Settings Area (Left) ────────────────────────────
        settings_widget = QWidget()
        settings_layout = QVBoxLayout(settings_widget)
        settings_layout.setContentsMargins(0, 0, 0, 0)
        settings_layout.setSpacing(12)

        # Row 1: Document Style
        r1 = QHBoxLayout()
        r1.setSpacing(10)

        style_lbl = QLabel("🎨 Style:")
        style_lbl.setProperty("cssClass", "field_label")
        r1.addWidget(style_lbl)

        def _hint(text):
            lbl = QLabel(text)
            lbl.setProperty("cssClass", "field_label")
            return lbl

        r1.addWidget(_hint("Template:"))
        self.style_template = QComboBox()
        self._populate_templates()
        set_custom_tooltip(
            self.style_template, "Choose the visual layout template for the PDF."
        )
        r1.addWidget(self.style_template)
        _refresh_tmpl_btn = QPushButton("↺")
        _refresh_tmpl_btn.setFixedSize(24, 24)
        _refresh_tmpl_btn.setProperty("cssClass", "icon")
        set_custom_tooltip(_refresh_tmpl_btn, "Rescan templates folder")
        _refresh_tmpl_btn.clicked.connect(self._populate_templates)
        r1.addWidget(_refresh_tmpl_btn)

        r1.addWidget(_hint("Font:"))
        self.style_font = QComboBox()
        self.style_font.addItems(
            ["Calibri", "Arial", "Georgia", "Times New Roman", "Verdana"]
        )
        set_custom_tooltip(
            self.style_font, "Base font family used across the document."
        )
        r1.addWidget(self.style_font)

        r1.addWidget(_hint("Size:"))
        self.style_size = QComboBox()
        self.style_size.addItems(
            [str(s) for s in [9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0]]
        )
        self.style_size.setCurrentIndex(5)  # default 11.5
        set_custom_tooltip(self.style_size, "Base font size in points (e.g. 11.5pt).")
        r1.addWidget(self.style_size)

        r1.addWidget(_hint("Colour:"))
        self.color_btn = QPushButton()
        self.color_btn.setFixedSize(32, 28)
        set_custom_tooltip(self.color_btn, "Pick section heading colour")
        self._refresh_color_btn()
        self.color_btn.clicked.connect(self._pick_color)
        r1.addWidget(self.color_btn)

        r1.addStretch()
        settings_layout.addLayout(r1)

        # Row 2: Layout Options
        r2 = QHBoxLayout()
        r2.setSpacing(10)

        layout_lbl = QLabel("📏 Layout:")
        layout_lbl.setProperty("cssClass", "field_label")
        r2.addWidget(layout_lbl)

        r2.addWidget(_hint("Margins (in) - TB:"))
        self.margin_tb = QComboBox()
        self.margin_tb.addItems(["0.3", "0.4", "0.5", "0.6", "0.7", "0.8"])
        self.margin_tb.setCurrentIndex(2)  # default 0.5 in
        set_custom_tooltip(self.margin_tb, "Top and Bottom page margins in inches.")
        r2.addWidget(self.margin_tb)

        r2.addWidget(_hint("LR:"))
        self.margin_lr = QComboBox()
        self.margin_lr.addItems(["0.4", "0.5", "0.6", "0.7", "0.8", "0.9"])
        self.margin_lr.setCurrentIndex(1)  # default 0.6 in
        set_custom_tooltip(self.margin_lr, "Left and Right page margins in inches.")
        r2.addWidget(self.margin_lr)

        r2.addWidget(_hint("  Gaps (pt) - Section:"))
        self.section_spacing = QComboBox()
        self.section_spacing.addItems(["4", "6", "8", "10", "12", "14"])
        self.section_spacing.setCurrentIndex(2)  # default 10pt
        set_custom_tooltip(
            self.section_spacing,
            "Vertical space between major sections (e.g. Experience to Education).",
        )
        r2.addWidget(self.section_spacing)

        r2.addWidget(_hint("Entry:"))
        self.entry_spacing = QComboBox()
        self.entry_spacing.addItems(["4", "6", "8", "10", "12", "14"])
        self.entry_spacing.setCurrentIndex(2)  # default 8pt
        set_custom_tooltip(
            self.entry_spacing,
            "Vertical space between individual job entries in Work Experience.",
        )
        r2.addWidget(self.entry_spacing)

        r2.addWidget(_hint("Line Spacing:"))
        self.style_spacing = QComboBox()
        self.style_spacing.addItems(["0", "0.3", "0.5", "0.8", "1.0", "1.5", "2.0"])
        self.style_spacing.setCurrentIndex(2)  # default 0.5pt
        set_custom_tooltip(
            self.style_spacing, "Extra spacing between lines of text in bullet points."
        )
        r2.addWidget(self.style_spacing)

        r2.addStretch()
        settings_layout.addLayout(r2)

        # Row 3: Details & Lists
        r3 = QHBoxLayout()
        r3.setSpacing(10)

        list_lbl = QLabel("📋 Details:")
        list_lbl.setProperty("cssClass", "field_label")
        r3.addWidget(list_lbl)

        r3.addWidget(_hint("Bullet:"))
        self.style_bullet = QComboBox()
        self.style_bullet.addItems(
            ["•  bullet", "–  dash", "›  arrow", "→  right arrow"]
        )
        set_custom_tooltip(
            self.style_bullet, "The symbol used for bullet points in lists."
        )
        r3.addWidget(self.style_bullet)

        r3.addWidget(_hint("Indent:"))
        self.bullet_indent = QComboBox()
        self.bullet_indent.addItems(["0.2", "0.4", "0.6", "0.8", "1.0", "1.2", "1.5"])
        self.bullet_indent.setCurrentIndex(5)  # default 1.2em
        set_custom_tooltip(self.bullet_indent, "Left indent before each bullet (em)")
        r3.addWidget(self.bullet_indent)

        self.icons_chk = QCheckBox("Icons (fa5)")
        set_custom_tooltip(
            self.icons_chk, "Load fontawesome5 — enables \\faIcon{} in templates"
        )
        self.icons_chk.setChecked(True)  # Enable icons by default
        r3.addWidget(self.icons_chk)

        r3.addWidget(_hint("  Protect:"))
        self.extra_terms_input = QLineEdit()
        self.extra_terms_input.setPlaceholderText("e.g. React, AWS")
        self.extra_terms_input.setMinimumWidth(150)
        set_custom_tooltip(self.extra_terms_input, "Terms preserve casing/symbols")
        r3.addWidget(self.extra_terms_input, stretch=1)

        settings_layout.addLayout(r3)

        main_layout.addWidget(settings_widget, stretch=1)

        # Vertical divider between settings and actions
        div = QFrame()
        div.setFrameShape(QFrame.VLine)
        div.setFrameShadow(QFrame.Sunken)
        main_layout.addWidget(div)

        # ── Actions Area (Right) ────────────────────────────
        actions_widget = QWidget()
        actions_layout = QVBoxLayout(actions_widget)
        actions_layout.setContentsMargins(10, 0, 0, 0)
        actions_layout.setSpacing(10)

        actions_layout.addStretch()

        self.generate_btn = QPushButton(" Generate PDF")
        self.generate_btn.setIcon(get_icon(UIConfig.ICON_ROCKET, color="white"))
        self.generate_btn.setMinimumHeight(44)
        self.generate_btn.setMinimumWidth(160)
        apply_style(self.generate_btn, "primary")
        self.generate_btn.clicked.connect(self._on_generate_clicked)
        actions_layout.addWidget(self.generate_btn)

        self.open_folder_btn = QPushButton(" Open Folder")
        self.open_folder_btn.setIcon(get_icon(UIConfig.ICON_FOLDER))
        self.open_folder_btn.setMinimumHeight(38)
        self.open_folder_btn.setMinimumWidth(160)
        apply_style(self.open_folder_btn, "default")
        self.open_folder_btn.clicked.connect(self.open_folder_requested.emit)
        actions_layout.addWidget(self.open_folder_btn)

        actions_layout.addStretch()

        main_layout.addWidget(actions_widget)

    def _add_divider(self, layout):
        div = QFrame()
        div.setFrameShape(QFrame.VLine)
        div.setFrameShadow(QFrame.Sunken)
        div.setProperty("cssClass", "divider")
        layout.addWidget(div)

    def _populate_templates(self):
        """Scan and populate .tex templates."""
        import sys
        if getattr(sys, "frozen", False):
            from pathlib import Path as _Path
            templates_dir = _Path(sys.executable).parent / "templates"
        else:
            templates_dir = get_resource_path("script") / "templates"
        self.style_template.clear()
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
            self.generate_btn.setText(" Generating...")
            self.generate_btn.setIcon(get_icon(UIConfig.ICON_REFRESH, color="white"))
        else:
            self.generate_btn.setText(" Generate PDF")
            self.generate_btn.setIcon(get_icon(UIConfig.ICON_ROCKET, color="white"))

    def _on_generate_clicked(self):
        """Emit style parameters for generation."""
        # xelatex+fontspec handles Unicode directly — no extra packages needed
        _bullet_map = {
            0: "•",  # U+2022 BULLET
            1: "–",  # U+2013 EN DASH
            2: "›",  # U+203A SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
            3: "→",  # U+2192 RIGHTWARDS ARROW
        }
        raw_terms = self.extra_terms_input.text().strip()
        extra_terms = (
            [t.strip() for t in raw_terms.split(",") if t.strip()] if raw_terms else []
        )
        params = {
            "template_name": self.style_template.currentText(),
            "font": self.style_font.currentText(),
            "font_size": float(self.style_size.currentText()),
            "section_color": self._picked_color,
            "item_spacing": float(self.style_spacing.currentText()),
            "section_spacing": int(self.section_spacing.currentText()),
            "entry_spacing": int(self.entry_spacing.currentText()),
            "bullet": _bullet_map.get(self.style_bullet.currentIndex(), r"$\bullet$"),
            "bullet_indent": float(self.bullet_indent.currentText()),
            "use_icons": self.icons_chk.isChecked(),
            "margin_tb": float(self.margin_tb.currentText()),
            "margin_lr": float(self.margin_lr.currentText()),
            "extra_protected_terms": extra_terms,
        }
        self.generate_requested.emit(params)
