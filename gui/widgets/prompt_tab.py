import json
import os

from PySide6.QtWidgets import (
    QWidget,
    QSizePolicy,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QSplitter,
    QListWidget,
    QListWidgetItem,
    QStackedWidget,
    QPushButton,
    QTextEdit,
    QLineEdit,
    QScrollArea,
    QFrame,
    QCheckBox,
)
from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QFont, QTextCursor

from core.prompt_template import PromptTemplate
from gui.ui_helpers import set_custom_tooltip, make_icon_button, get_icon
from gui.config import UIConfig

TEMPLATE_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "prompt_templates")
)


class PromptTab(QWidget):
    """Reusable prompt template manager with Edit and Use modes."""

    show_log_panel = False
    show_action_panel = False

    def __init__(self, parent=None):
        super().__init__(parent)
        self.templates: list[dict] = self._load_templates()
        self.placeholder_inputs: dict[str, QLineEdit | QTextEdit] = {}
        self._ph_checkboxes: dict[str, QCheckBox] = {}
        self._ph_refresh_timer = QTimer(self)
        self._ph_refresh_timer.setSingleShot(True)
        self._ph_refresh_timer.setInterval(300)
        self._ph_refresh_timer.timeout.connect(self._do_refresh_placeholder_settings)
        self._setup_ui()
        self._refresh_list()

    # ── Storage ──────────────────────────────────────────────────────────────

    def _load_templates(self) -> list[dict]:
        templates = []
        if os.path.exists(TEMPLATE_DIR):
            for fname in sorted(os.listdir(TEMPLATE_DIR)):
                if fname.endswith(".json"):
                    with open(os.path.join(TEMPLATE_DIR, fname), encoding="utf-8") as f:
                        templates.append(json.load(f))
        return templates

    def _save_template_to_disk(self, tpl: dict):
        os.makedirs(TEMPLATE_DIR, exist_ok=True)
        fname = os.path.join(TEMPLATE_DIR, f"{tpl['name'].replace(' ', '_')}.json")
        with open(fname, "w", encoding="utf-8") as f:
            json.dump(tpl, f, indent=2)

    def _delete_template_from_disk(self, name: str):
        fname = os.path.join(TEMPLATE_DIR, f"{name.replace(' ', '_')}.json")
        if os.path.exists(fname):
            os.remove(fname)

    # ── UI setup ─────────────────────────────────────────────────────────────

    def _setup_ui(self):
        root = QHBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setHandleWidth(1)
        root.addWidget(splitter)

        splitter.addWidget(self._build_sidebar())
        splitter.addWidget(self._build_right_panel())
        splitter.setStretchFactor(0, 0)
        splitter.setStretchFactor(1, 1)
        splitter.setSizes([220, 780])

    # ── Left sidebar ──────────────────────────────────────────────────────────

    def _build_sidebar(self) -> QWidget:
        sidebar = QWidget()
        sidebar.setObjectName("formNav")
        sidebar.setFixedWidth(220)
        layout = QVBoxLayout(sidebar)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Header with "+ New" button
        header = QWidget()
        header.setObjectName("formToolbar")
        h_layout = QHBoxLayout(header)
        h_layout.setContentsMargins(10, 8, 8, 8)
        h_layout.setSpacing(4)
        title_lbl = QLabel("Templates")
        title_lbl.setProperty("cssClass", "header_secondary")
        h_layout.addWidget(title_lbl, stretch=1)
        new_btn = make_icon_button(
            UIConfig.ICON_PLUS, UIConfig.ICON_BTN_SIZE, "Create a new prompt template"
        )
        new_btn.clicked.connect(self._create_new_template)
        h_layout.addWidget(new_btn)
        edit_btn = make_icon_button(
            UIConfig.ICON_EDIT, UIConfig.ICON_BTN_SIZE, "Edit selected template"
        )
        edit_btn.clicked.connect(self._edit_selected_template)
        h_layout.addWidget(edit_btn)

        sep = QFrame()
        sep.setFrameShape(QFrame.Shape.VLine)
        sep.setFrameShadow(QFrame.Shadow.Sunken)
        sep.setFixedWidth(1)
        h_layout.addWidget(sep)

        delete_btn = make_icon_button(
            UIConfig.ICON_TRASH,
            UIConfig.ICON_BTN_SIZE,
            "Delete selected template",
            color="#e81123",
        )
        delete_btn.clicked.connect(self._delete_selected_template)
        h_layout.addWidget(delete_btn)
        layout.addWidget(header)

        # Template list
        self.template_list = QListWidget()
        self.template_list.setObjectName("innerNav")
        self.template_list.setContentsMargins(4, 4, 4, 4)
        self.template_list.currentRowChanged.connect(self._on_list_selection)
        layout.addWidget(self.template_list, stretch=1)

        return sidebar

    # ── Right panel ───────────────────────────────────────────────────────────

    def _build_right_panel(self) -> QWidget:
        panel = QWidget()
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(
            UIConfig.PAD_FRAME,
            UIConfig.PAD_FRAME,
            UIConfig.PAD_FRAME,
            UIConfig.PAD_FRAME,
        )
        layout.setSpacing(UIConfig.PAD_SMALL)

        # Stacked pages: 0 = Edit, 1 = Use
        self.stack = QStackedWidget()
        self.stack.addWidget(self._build_edit_page())
        self.stack.addWidget(self._build_use_page())
        self.stack.setCurrentIndex(1)
        layout.addWidget(self.stack, stretch=1)

        return panel

    def _build_edit_page(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(UIConfig.PAD_SMALL)
        layout.setContentsMargins(0, 0, 0, 0)

        # Template name
        name_lbl = QLabel("Template Name")
        name_lbl.setProperty("cssClass", "field_label")
        layout.addWidget(name_lbl)
        self.edit_name = QLineEdit()
        self.edit_name.setPlaceholderText("e.g. Tailor Resume for Job")
        layout.addWidget(self.edit_name)

        # Body label + { } button inline
        body_header = QHBoxLayout()
        body_header.setContentsMargins(0, 0, 0, 0)
        body_header.setSpacing(6)
        body_lbl = QLabel("Template Body")
        body_lbl.setProperty("cssClass", "field_label")
        body_header.addWidget(body_lbl)
        ph_btn = QPushButton("{ }")
        ph_btn.setFixedSize(24, 24)
        ph_btn.setProperty("cssClass", "format_btn")
        f = QFont()
        f.setBold(True)
        ph_btn.setFont(f)
        set_custom_tooltip(ph_btn, "Wrap selected text as {{placeholder}}")
        ph_btn.clicked.connect(self._convert_selection_to_placeholder)
        body_header.addWidget(ph_btn)
        hint = QLabel("{{placeholder}}")
        hint.setProperty("cssClass", "hint")
        body_header.addWidget(hint)
        body_header.addStretch()
        layout.addLayout(body_header)

        self.edit_template = QTextEdit()
        self.edit_template.setPlaceholderText(
            "Write your prompt here.\n\n"
            "Select any word and click { } to turn it into a {{placeholder}}.\n\n"
            "Example:\n"
            "Tailor the following resume for this role:\n"
            "{{job_description}}\n\n"
            "Candidate Name: {{candidate_name}}"
        )
        self.edit_template.textChanged.connect(self._refresh_placeholder_settings)
        layout.addWidget(self.edit_template, stretch=1)

        # Per-placeholder multiline settings (shown when placeholders exist)
        self._ph_settings_widget = QWidget()
        ph_outer = QVBoxLayout(self._ph_settings_widget)
        ph_outer.setContentsMargins(0, 0, 0, 0)
        ph_outer.setSpacing(4)
        ph_lbl = QLabel("Multi-line Placeholders")
        ph_lbl.setProperty("cssClass", "field_label")
        ph_outer.addWidget(ph_lbl)
        ph_hint = QLabel(
            "Check placeholders that need a large text area (e.g. job description)."
        )
        ph_hint.setProperty("cssClass", "hint")
        ph_hint.setWordWrap(True)
        ph_outer.addWidget(ph_hint)
        self._ph_checkboxes_layout = QVBoxLayout()
        self._ph_checkboxes_layout.setSpacing(4)
        ph_outer.addLayout(self._ph_checkboxes_layout)
        self._ph_settings_widget.setVisible(False)
        layout.addWidget(self._ph_settings_widget)

        save_btn = QPushButton("Save Template")
        save_btn.setProperty("cssClass", "primary")
        save_btn.clicked.connect(self._save_template)
        layout.addWidget(save_btn)

        return page

    def _build_use_page(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(0)
        layout.setContentsMargins(0, 0, 0, 0)

        # ── Empty state (no templates exist) ─────────────────────────────
        self._empty_state = QLabel(
            "No templates yet.\nClick  +  in the sidebar to create your first one."
        )
        self._empty_state.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._empty_state.setProperty("cssClass", "empty_state")
        self._empty_state.setWordWrap(True)
        self._empty_state.setVisible(False)
        layout.addWidget(self._empty_state, stretch=1)

        # ── Fill Placeholders section ────────────────────────────────────
        # Uses QSizePolicy.Minimum so it shrinks to exactly its content —
        # no dead whitespace below the last field.
        self._fill_section = QWidget()
        self._fill_section.setSizePolicy(
            QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum
        )
        self._fill_section.setVisible(False)
        fill_layout = QVBoxLayout(self._fill_section)
        fill_layout.setContentsMargins(0, 0, 0, UIConfig.PAD_SMALL)
        fill_layout.setSpacing(UIConfig.PAD_SMALL)

        fill_header = QHBoxLayout()
        fill_header.setContentsMargins(0, 0, 0, 0)
        fill_header.setSpacing(6)
        fill_lbl = QLabel("Fill Placeholders")
        fill_lbl.setProperty("cssClass", "header_secondary")
        fill_header.addWidget(fill_lbl, stretch=1)
        clear_inputs_btn = make_icon_button(
            UIConfig.ICON_TRASH,
            UIConfig.ICON_BTN_SIZE,
            "Clear all placeholder inputs",
            color="#e81123",
        )
        clear_inputs_btn.clicked.connect(self._clear_placeholder_inputs)
        self._clear_inputs_btn = clear_inputs_btn
        fill_header.addWidget(clear_inputs_btn)
        fill_layout.addLayout(fill_header)

        # Fields are added/removed dynamically in _rebuild_placeholder_form
        self._fields_container = QWidget()
        self.form_layout = QVBoxLayout(self._fields_container)
        self.form_layout.setSpacing(10)
        self.form_layout.setContentsMargins(0, 0, 8, 0)

        # Scroll area caps the form height so output always gets space,
        # even with many multiline placeholders.
        self._fields_scroll = QScrollArea()
        self._fields_scroll.setWidgetResizable(True)
        self._fields_scroll.setFrameShape(QFrame.Shape.NoFrame)
        self._fields_scroll.setHorizontalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAlwaysOff
        )
        self._fields_scroll.setMaximumHeight(320)
        self._fields_scroll.setWidget(self._fields_container)
        fill_layout.addWidget(self._fields_scroll)

        layout.addWidget(self._fill_section)

        # ── Thin separator between form and output ───────────────────────
        self._form_sep = QFrame()
        self._form_sep.setFrameShape(QFrame.Shape.HLine)
        self._form_sep.setFrameShadow(QFrame.Shadow.Sunken)
        self._form_sep.setVisible(False)
        layout.addWidget(self._form_sep)

        # ── Generated Prompt section (stretch=1, fills remaining space) ──
        self._output_section = QWidget()
        self._output_section.setVisible(False)
        output_layout = QVBoxLayout(self._output_section)
        output_layout.setContentsMargins(0, UIConfig.PAD_SMALL, 0, 0)
        output_layout.setSpacing(UIConfig.PAD_SMALL)

        out_header = QHBoxLayout()
        out_header.setContentsMargins(0, 0, 0, 0)
        out_header.setSpacing(6)
        out_lbl = QLabel("Generated Prompt")
        out_lbl.setProperty("cssClass", "header_secondary")
        out_header.addWidget(out_lbl, stretch=1)
        copy_btn = QPushButton("  Copy")
        copy_btn.setIcon(get_icon(UIConfig.ICON_PASTE, "#495057"))
        copy_btn.setProperty("cssClass", "default")
        set_custom_tooltip(copy_btn, "Copy generated prompt to clipboard")
        copy_btn.clicked.connect(self._copy_prompt)
        out_header.addWidget(copy_btn)
        output_layout.addLayout(out_header)

        self.prompt_output = QTextEdit()
        self.prompt_output.setReadOnly(True)
        self.prompt_output.setPlaceholderText("Your filled prompt will appear here…")
        output_layout.addWidget(self.prompt_output, stretch=1)

        layout.addWidget(self._output_section, stretch=1)

        return page

    # ── Sidebar helpers ───────────────────────────────────────────────────────

    def _refresh_list(self):
        self.template_list.blockSignals(True)
        self.template_list.clear()
        for tpl in self.templates:
            self.template_list.addItem(QListWidgetItem(tpl["name"]))
        self.template_list.blockSignals(False)
        if self.templates:
            self.template_list.setCurrentRow(0)
            self._on_list_selection(0)
        else:
            self._clear_edit_page()

    def _on_list_selection(self, row: int):
        if row < 0 or row >= len(self.templates):
            return
        tpl = self.templates[row]
        # Populate edit page
        self.edit_name.setText(tpl["name"])
        self.edit_template.setPlainText(
            tpl["template"]
        )  # triggers _refresh_placeholder_settings
        for ph, cb in self._ph_checkboxes.items():
            cb.setChecked(ph in tpl.get("multiline_placeholders", []))
        self._rebuild_placeholder_form(
            tpl.get("placeholders", []), set(tpl.get("multiline_placeholders", []))
        )
        self._switch_mode(1)

    def _rebuild_placeholder_form(
        self,
        placeholders: list[str],
        multiline: set | frozenset = frozenset(),
        has_template: bool = True,
    ):
        # Clear previous field widgets
        while self.form_layout.count():
            item = self.form_layout.takeAt(0)
            if item is not None:
                w = item.widget()
                if w is not None:
                    w.deleteLater()
        self.placeholder_inputs = {}

        if not has_template:
            self._empty_state.setVisible(True)
            self._fill_section.setVisible(False)
            self._form_sep.setVisible(False)
            self._output_section.setVisible(False)
            return

        self._empty_state.setVisible(False)

        if not placeholders:
            self._fill_section.setVisible(False)
            self._form_sep.setVisible(False)
            self._output_section.setVisible(True)
            self._generate_prompt()
            return

        # Build label-above-input fields
        for ph in placeholders:
            lbl = QLabel(ph.replace("_", " ").title())
            lbl.setProperty("cssClass", "field_label")
            self.form_layout.addWidget(lbl)
            if ph in multiline:
                inp: QLineEdit | QTextEdit = QTextEdit()
                inp.setPlaceholderText(f"Paste or type {ph.replace('_', ' ')} here…")
                inp.setFixedHeight(100)
                inp.setAcceptRichText(False)
                inp.textChanged.connect(self._generate_prompt)
            else:
                inp = QLineEdit()
                inp.setPlaceholderText(f"Enter {ph.replace('_', ' ')}")
                inp.textChanged.connect(self._generate_prompt)
            self.form_layout.addWidget(inp)
            self.placeholder_inputs[ph] = inp

        # Calculate scroll height from known field sizes — sizeHint() is
        # unreliable before the widget is shown, so we compute directly.
        LABEL_H, LINE_H, MULTI_H, SPACING = 20, 34, 100, 10
        content_h = sum(
            LABEL_H + SPACING + (MULTI_H if ph in multiline else LINE_H) + SPACING
            for ph in placeholders
        )
        self._fields_scroll.setFixedHeight(min(content_h, 320))

        self._fill_section.setVisible(True)
        self._form_sep.setVisible(True)
        self._output_section.setVisible(True)
        self._generate_prompt()

    def _clear_edit_page(self):
        self.edit_name.clear()
        self.edit_template.clear()
        self._rebuild_placeholder_form([], has_template=False)

    def _clear_placeholder_inputs(self):
        for inp in self.placeholder_inputs.values():
            inp.blockSignals(True)
            inp.clear()
            inp.blockSignals(False)
        self.prompt_output.clear()

    def _edit_selected_template(self):
        row = self.template_list.currentRow()
        if row < 0 or row >= len(self.templates):
            return
        self._switch_mode(0)
        self.edit_name.setFocus()

    def _create_new_template(self):
        self._clear_edit_page()
        self.template_list.clearSelection()
        self._switch_mode(0)
        self.edit_name.setFocus()

    def _delete_selected_template(self):
        row = self.template_list.currentRow()
        if row < 0 or row >= len(self.templates):
            return
        name = self.templates[row]["name"]
        self._delete_template_from_disk(name)
        self.templates.pop(row)
        self._refresh_list()

    def _refresh_placeholder_settings(self):
        """Debounce: restart timer on every keystroke, only act after 300 ms idle."""
        self._ph_refresh_timer.start()

    def _do_refresh_placeholder_settings(self):
        """Rebuild multiline checkboxes after typing has paused."""
        while self._ph_checkboxes_layout.count():
            item = self._ph_checkboxes_layout.takeAt(0)
            w = item.widget() if item else None
            if w:
                w.deleteLater()
        self._ph_checkboxes = {}
        placeholders = PromptTemplate.extract_placeholders(
            self.edit_template.toPlainText()
        )
        self._ph_settings_widget.setVisible(bool(placeholders))
        for ph in placeholders:
            cb = QCheckBox(ph.replace("_", " ").title())
            self._ph_checkboxes_layout.addWidget(cb)
            self._ph_checkboxes[ph] = cb

    # ── Mode toggle ───────────────────────────────────────────────────────────

    def _switch_mode(self, idx: int):
        self.stack.setCurrentIndex(idx)

    # ── Actions ───────────────────────────────────────────────────────────────

    def _convert_selection_to_placeholder(self):
        cursor: QTextCursor = self.edit_template.textCursor()
        selected = cursor.selectedText()
        if selected:
            cursor.insertText(f"{{{{{selected}}}}}")
        else:
            pos = cursor.position()
            cursor.insertText("{{placeholder}}")
            cursor.setPosition(pos + 2)
            cursor.setPosition(
                pos + 2 + len("placeholder"), QTextCursor.MoveMode.KeepAnchor
            )
            self.edit_template.setTextCursor(cursor)
        self.edit_template.setFocus()

    def _save_template(self):
        name = self.edit_name.text().strip()
        template = self.edit_template.toPlainText().strip()
        if not name or not template:
            return
        placeholders = PromptTemplate.extract_placeholders(template)
        multiline_phs = [ph for ph, cb in self._ph_checkboxes.items() if cb.isChecked()]
        tpl = {
            "name": name,
            "template": template,
            "placeholders": placeholders,
            "multiline_placeholders": multiline_phs,
        }
        self._save_template_to_disk(tpl)
        # Update in-memory list (replace if same name, else append)
        for i, t in enumerate(self.templates):
            if t["name"] == name:
                self.templates[i] = tpl
                self._refresh_list()
                self.template_list.setCurrentRow(i)
                return
        self.templates.append(tpl)
        self._refresh_list()
        self.template_list.setCurrentRow(len(self.templates) - 1)

    def _generate_prompt(self):
        row = self.template_list.currentRow()
        if row < 0 or row >= len(self.templates):
            self.prompt_output.setPlainText("Select a template from the sidebar first.")
            return
        values = {}
        for ph, inp in self.placeholder_inputs.items():
            val = inp.toPlainText() if isinstance(inp, QTextEdit) else inp.text()
            values[ph] = f"[{val.strip()}]" if val.strip() else f"[{ph}]"
        prompt = PromptTemplate(**self.templates[row]).render(values)
        self.prompt_output.setPlainText(prompt)

    def _copy_prompt(self):
        from PySide6.QtWidgets import QApplication

        text = self.prompt_output.toPlainText()
        if text:
            QApplication.clipboard().setText(text)
