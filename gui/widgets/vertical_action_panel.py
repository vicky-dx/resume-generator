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
    QScrollArea,
)
from PySide6.QtCore import Signal, Qt
from PySide6.QtGui import QColor

from gui.config import UIConfig
from gui.utils import get_resource_path
from gui.ui_helpers import apply_style, get_icon, set_custom_tooltip


class _ScrollSafeComboBox(QComboBox):
    """QComboBox that ignores scroll wheel events unless the popup is open.
    Prevents accidental value changes while scrolling the panel.
    """

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)

    def wheelEvent(self, event):
        if self.view().isVisible():
            super().wheelEvent(event)
        else:
            event.ignore()


class VerticalActionPanelWidget(QWidget):
    """Vertical variant of ActionPanelWidget for use as a Right Sidebar Property Inspector."""

    generate_requested = Signal(dict)
    open_folder_requested = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("verticalActionCard")
        self._picked_color = (96, 36, 191)  # Default purple
        self.setFixedWidth(280)
        self._setup_ui()

    def _setup_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # ── Scrollable Settings Area ────────────────────────────
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.NoFrame)
        scroll.setStyleSheet("background: transparent;")

        settings_widget = QWidget()
        settings_layout = QVBoxLayout(settings_widget)
        settings_layout.setContentsMargins(16, 16, 16, 16)
        settings_layout.setSpacing(16)

        def _add_section_header(title):
            lbl = QLabel(title)
            lbl.setProperty("cssClass", "field_label")
            settings_layout.addWidget(lbl)

        def _add_row(label_text, widget, tooltip=None):
            r = QHBoxLayout()
            r.setSpacing(10)
            lbl = QLabel(label_text)
            lbl.setProperty("cssClass", "field_label")
            r.addWidget(lbl)
            r.addWidget(widget, stretch=1)
            if tooltip:
                set_custom_tooltip(widget, tooltip)
            settings_layout.addLayout(r)

        # -- Document Style --
        _add_section_header("🎨 Document Style")

        self.style_template = _ScrollSafeComboBox()
        self._populate_templates()

        tmpl_row = QHBoxLayout()
        tmpl_row.setSpacing(6)
        tmpl_lbl = QLabel("Template:")
        tmpl_lbl.setProperty("cssClass", "field_label")
        tmpl_row.addWidget(tmpl_lbl)
        tmpl_row.addWidget(self.style_template, stretch=1)
        _refresh_tmpl_btn = QPushButton("↺")
        _refresh_tmpl_btn.setFixedSize(24, 24)
        _refresh_tmpl_btn.setProperty("cssClass", "icon")
        set_custom_tooltip(_refresh_tmpl_btn, "Rescan templates folder")
        _refresh_tmpl_btn.clicked.connect(self._populate_templates)
        tmpl_row.addWidget(_refresh_tmpl_btn)
        settings_layout.addLayout(tmpl_row)

        self.style_font = _ScrollSafeComboBox()
        self.style_font.addItems(
            ["Calibri", "Arial", "Georgia", "Times New Roman", "Verdana"]
        )
        _add_row(
            "Font:",
            self.style_font,
            tooltip="Base font family used across the document.",
        )

        self.style_size = _ScrollSafeComboBox()
        self.style_size.addItems(
            ["9.0", "9.5", "10.0", "10.5", "11.0", "11.5", "12.0", "12.5", "13.0"]
        )
        self.style_size.setCurrentIndex(5) # default 11pt
        _add_row(
            "Size:",
            self.style_size,
            tooltip="Base font size in points (e.g. 11pt, 12pt).",
        )

        self.color_btn = QPushButton()
        self.color_btn.setFixedSize(32, 24)
        self._refresh_color_btn()
        self.color_btn.clicked.connect(self._pick_color)

        color_lbl = QLabel("Colour:")
        color_lbl.setProperty("cssClass", "field_label")
        color_row = QHBoxLayout()
        color_row.addWidget(color_lbl)
        color_row.addStretch()
        color_row.addWidget(self.color_btn)
        settings_layout.addLayout(color_row)

        self._add_divider(settings_layout)

        # -- Layout Options --
        _add_section_header("📏 Layout Options")

        self.margin_tb = _ScrollSafeComboBox()
        self.margin_tb.addItems(["0.3", "0.4", "0.5", "0.6", "0.7", "0.8"])
        self.margin_tb.setCurrentIndex(2) # default 0.5in
        _add_row(
            "Margin TB (in):",
            self.margin_tb,
            tooltip="Top and Bottom page margins in inches.",
        )

        self.margin_lr = _ScrollSafeComboBox()
        self.margin_lr.addItems(["0.4", "0.5", "0.6", "0.7", "0.8", "0.9"])
        self.margin_lr.setCurrentIndex(1) # default 0.5in
        _add_row(
            "Margin LR (in):",
            self.margin_lr,
            tooltip="Left and Right page margins in inches.",
        )

        self.section_spacing = _ScrollSafeComboBox()
        self.section_spacing.addItems(["4", "6", "8", "10", "12", "14"])
        self.section_spacing.setCurrentIndex(2) # default 8pt
        _add_row(
            "Gaps - Section (pt):",
            self.section_spacing,
            tooltip="Vertical space between major sections (e.g. Experience to Education).",
        )

        self.entry_spacing = _ScrollSafeComboBox()
        self.entry_spacing.addItems(["4", "6", "8", "10", "12", "14"])
        self.entry_spacing.setCurrentIndex(2) # default 8pt
        _add_row(
            "Gaps - Job Entry (pt):",
            self.entry_spacing,
            tooltip="Vertical space between individual job entries in Work Experience.",
        )

        self.style_spacing = _ScrollSafeComboBox()
        self.style_spacing.addItems(["0", "0.3", "0.5", "0.8", "1.0", "1.5", "2.0"])
        self.style_spacing.setCurrentIndex(2)  # default 0.5pt
        _add_row(
            "Line Spacing:",
            self.style_spacing,
            tooltip="Extra spacing between lines of text in bullet points or paragraphs.",
        )

        self._add_divider(settings_layout)

        # -- Details & Lists --
        _add_section_header("📋 Details & Lists")

        self.style_bullet = _ScrollSafeComboBox()
        self.style_bullet.addItems(
            ["•  bullet", "–  dash", "›  arrow", "→  right arrow"]
        )
        _add_row(
            "Bullet:",
            self.style_bullet,
            tooltip="The symbol used for bullet points in lists.",
        )

        self.bullet_indent = _ScrollSafeComboBox()
        self.bullet_indent.addItems(["0.2", "0.4", "0.6", "0.8", "1.0", "1.2", "1.5"])
        self.bullet_indent.setCurrentIndex(5) # default 1.2em
        _add_row(
            "Indent (em):",
            self.bullet_indent,
            tooltip="How far bullet points are indented from the left margin.",
        )

        self.icons_chk = QCheckBox("Use Icons (fa5)")
        set_custom_tooltip(self.icons_chk, "Load fontawesome5")
        # select checkbox bydefault
        self.icons_chk.setChecked(True)
        settings_layout.addWidget(self.icons_chk)

        self.extra_terms_input = QLineEdit()
        self.extra_terms_input.setPlaceholderText("e.g. React, AWS")
        _add_row(
            "Protect terms:",
            self.extra_terms_input,
            tooltip="Terms preserve casing/symbols",
        )

        settings_layout.addStretch()
        scroll.setWidget(settings_widget)

        main_layout.addWidget(scroll, stretch=1)

        # ── Sticky Bottom Actions ──
        actions_widget = QWidget()
        actions_layout = QVBoxLayout(actions_widget)
        actions_layout.setContentsMargins(16, 12, 16, 16)
        actions_layout.setSpacing(10)

        # Top divider
        div = QFrame()
        div.setFrameShape(QFrame.HLine)
        div.setFrameShadow(QFrame.Sunken)
        div.setProperty("cssClass", "divider")
        actions_layout.addWidget(div)

        self.generate_btn = QPushButton(" Generate PDF")
        self.generate_btn.setIcon(get_icon(UIConfig.ICON_ROCKET, color="white"))
        self.generate_btn.setMinimumHeight(44)
        apply_style(self.generate_btn, "primary")
        self.generate_btn.clicked.connect(self._on_generate_clicked)
        actions_layout.addWidget(self.generate_btn)

        self.open_folder_btn = QPushButton(" Open Folder")
        self.open_folder_btn.setIcon(get_icon(UIConfig.ICON_FOLDER))
        self.open_folder_btn.setMinimumHeight(38)
        apply_style(self.open_folder_btn, "default")
        self.open_folder_btn.clicked.connect(self.open_folder_requested.emit)
        actions_layout.addWidget(self.open_folder_btn)

        main_layout.addWidget(actions_widget)

    def _add_divider(self, layout):
        div = QFrame()
        div.setFrameShape(QFrame.HLine)
        div.setFrameShadow(QFrame.Sunken)
        div.setProperty("cssClass", "divider")
        layout.addWidget(div)
        layout.addSpacing(4)

    def _populate_templates(self):
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
        r, g, b = self._picked_color
        self.color_btn.setStyleSheet(
            f"QPushButton {{ background-color: rgb({r},{g},{b});"
            f" border: 1px solid #CED4DA; border-radius: 4px; }}"
            f"QPushButton:hover {{ border: 2px solid #0078d4; }}"
        )

    def _pick_color(self):
        r, g, b = self._picked_color
        chosen = QColorDialog.getColor(QColor(r, g, b), self, "Section Heading Colour")
        if chosen.isValid():
            self._picked_color = (chosen.red(), chosen.green(), chosen.blue())
            self._refresh_color_btn()

    def set_generating_state(self, is_generating: bool):
        self.generate_btn.setEnabled(not is_generating)
        if is_generating:
            self.generate_btn.setText(" Generating...")
            self.generate_btn.setIcon(get_icon(UIConfig.ICON_REFRESH, color="white"))
        else:
            self.generate_btn.setText(" Generate PDF")
            self.generate_btn.setIcon(get_icon(UIConfig.ICON_ROCKET, color="white"))

    def _on_generate_clicked(self):
        _bullet_map = {
            0: "•",
            1: "–",
            2: "›",
            3: "→",
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
