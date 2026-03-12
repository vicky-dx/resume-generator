from PySide6.QtWidgets import (
    QWidget,
    QHBoxLayout,
    QVBoxLayout,
    QListWidget,
    QPushButton,
    QLabel,
    QScrollArea,
    QFormLayout,
)
from PySide6.QtCore import Qt
from gui.ui_helpers import apply_style


class BaseSectionWidget(QWidget):
    """Base interface for all form sections."""

    def populate(self, data: dict):
        """Populate the UI from a data dict."""
        pass

    def collect(self) -> dict:
        """Collect current UI data into a dict."""
        return {}

    def clear(self):
        """Clear all fields."""
        pass


class ListBasedSectionWidget(BaseSectionWidget):
    """Base widget for sections with a list of items on the left and a detail form on the right."""

    def __init__(self, list_title="Entries:", item_name="Entry", parent=None):
        super().__init__(parent)
        self.item_name = item_name
        self.data_list = []
        self.current_idx = -1

        self._setup_base_ui(list_title)

    def _setup_base_ui(self, list_title):
        outer = QHBoxLayout(self)
        outer.setContentsMargins(4, 4, 4, 4)
        outer.setSpacing(8)

        # Left panel: List and buttons
        left = QWidget()
        left.setFixedWidth(220)
        left_layout = QVBoxLayout(left)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(4)
        list_title_lbl = QLabel(list_title)
        list_title_lbl.setProperty("cssClass", "header_secondary")
        left_layout.addWidget(list_title_lbl)

        self.item_list = QListWidget()
        self.item_list.setObjectName("innerNav")
        self.item_list.currentRowChanged.connect(self._on_row_changed)
        left_layout.addWidget(self.item_list, 1)

        btns_layout = QHBoxLayout()
        add_btn = QPushButton("+ Add")
        apply_style(add_btn, "primary")
        add_btn.clicked.connect(self._add_item)
        rm_btn = QPushButton("− Remove")
        apply_style(rm_btn, "danger")
        rm_btn.clicked.connect(self._remove_item)
        btns_layout.addWidget(add_btn)
        btns_layout.addWidget(rm_btn)
        left_layout.addLayout(btns_layout)

        order_btns_layout = QHBoxLayout()
        up_btn = QPushButton("↑ Up")
        apply_style(up_btn, "default")
        up_btn.clicked.connect(self._move_up)
        down_btn = QPushButton("↓ Down")
        apply_style(down_btn, "default")
        down_btn.clicked.connect(self._move_down)
        order_btns_layout.addWidget(up_btn)
        order_btns_layout.addWidget(down_btn)
        left_layout.addLayout(order_btns_layout)

        outer.addWidget(left)

        # Right panel: Form container with Stacked Widget to support an Empty State
        from PySide6.QtWidgets import QStackedWidget

        self.right_stack = QStackedWidget()

        # 1. Empty State Widget
        self.empty_widget = QWidget()
        empty_layout = QVBoxLayout(self.empty_widget)

        self.empty_label = QLabel(
            f"Select a {self.item_name} on the left to edit\n\nor click '+ Add' to create a new one."
        )
        self.empty_label.setProperty("cssClass", "empty_state")
        self.empty_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        empty_layout.addWidget(self.empty_label)

        # 2. Form State Widget
        self.right_scroll = QScrollArea()
        self.right_scroll.setWidgetResizable(True)
        self.right_scroll.setStyleSheet(
            "QScrollArea { border: none; background-color: transparent; }"
        )

        self.right_container = QWidget()
        self.right_form = QVBoxLayout(self.right_container)
        self.right_form.setSpacing(16)
        self.right_form.setContentsMargins(16, 16, 16, 16)

        # Add a clear stretchy spacer at the bottom by default
        self._setup_form(self.right_form)
        self.right_form.addStretch()

        self.right_scroll.setWidget(self.right_container)

        self.right_stack.addWidget(self.empty_widget)
        self.right_stack.addWidget(self.right_scroll)

        outer.addWidget(self.right_stack, 1)

    def _setup_form(self, layout: QVBoxLayout):
        """Override to add fields to the right-side form layout (using standard widgets)."""
        pass

    def _add_field(self, layout: QVBoxLayout, label_text: str, widget: QWidget):
        """Helper to create a solid, modern vertical input layout."""
        lbl = QLabel(label_text)
        lbl.setProperty("cssClass", "field_label")
        layout.addWidget(lbl)
        layout.addWidget(widget)

    def _add_rich_text_field(
        self, layout: QVBoxLayout, label_text: str, widget: QWidget
    ):
        """Like _add_field but with a B/I formatting toolbar for multi-line text fields."""
        from PySide6.QtWidgets import QHBoxLayout
        from gui.widgets.format_toolbar import FormatToolbar

        header = QHBoxLayout()
        header.setContentsMargins(0, 0, 0, 0)
        header.setSpacing(6)
        lbl = QLabel(label_text)
        lbl.setProperty("cssClass", "field_label")
        header.addWidget(lbl)
        header.addWidget(FormatToolbar(widget))
        layout.addLayout(header)
        layout.addWidget(widget)

    def _on_row_changed(self, row):
        self._save_current()
        self.current_idx = row
        self._load_index(row)

    def _save_current(self):
        idx = self.current_idx
        if 0 <= idx < len(self.data_list):
            data = self._get_current_item_data()
            self.data_list[idx] = data
            self.item_list.item(idx).setText(
                self._get_item_title(data) or f"{self.item_name} {idx + 1}"
            )

    def _load_index(self, idx):
        if 0 <= idx < len(self.data_list):
            self.right_stack.setCurrentWidget(self.right_scroll)
            self._set_current_item_data(self.data_list[idx])
        else:
            self.right_stack.setCurrentWidget(self.empty_widget)
            self._clear_form()

    def _add_item(self):
        self._save_current()
        empty_data = self._get_empty_item()
        self.data_list.append(empty_data)
        self.item_list.addItem(f"New {self.item_name}")
        self.item_list.setCurrentRow(len(self.data_list) - 1)

    def _remove_item(self):
        idx = self.item_list.currentRow()
        if idx < 0:
            return
        self.current_idx = -1
        self.data_list.pop(idx)
        self.item_list.takeItem(idx)
        new_idx = min(idx, len(self.data_list) - 1)
        if new_idx >= 0:
            self.item_list.setCurrentRow(new_idx)
        else:
            self._load_index(-1)

    def _move_up(self):
        row = self.item_list.currentRow()
        if row > 0:
            self._save_current()

            # Swap data
            self.data_list[row - 1], self.data_list[row] = (
                self.data_list[row],
                self.data_list[row - 1],
            )

            # Swap UI items
            self.item_list.blockSignals(True)
            item = self.item_list.takeItem(row)
            self.item_list.insertItem(row - 1, item)
            self.item_list.setCurrentRow(row - 1)
            self.current_idx = row - 1
            self.item_list.blockSignals(False)

            self._refresh_item_text(row)
            self._refresh_item_text(row - 1)

    def _move_down(self):
        row = self.item_list.currentRow()
        if row >= 0 and row < len(self.data_list) - 1:
            self._save_current()

            # Swap data
            self.data_list[row + 1], self.data_list[row] = (
                self.data_list[row],
                self.data_list[row + 1],
            )

            # Swap UI items
            self.item_list.blockSignals(True)
            item = self.item_list.takeItem(row)
            self.item_list.insertItem(row + 1, item)
            self.item_list.setCurrentRow(row + 1)
            self.current_idx = row + 1
            self.item_list.blockSignals(False)

            self._refresh_item_text(row)
            self._refresh_item_text(row + 1)

    def _refresh_item_text(self, row):
        if 0 <= row < len(self.data_list):
            data = self.data_list[row]
            item = self.item_list.item(row)
            if item:
                item.setText(
                    self._get_item_title(data) or f"{self.item_name} {row + 1}"
                )

    # Methods to override in subclasses:
    def _get_current_item_data(self) -> dict:
        return {}

    def _set_current_item_data(self, data: dict):
        pass

    def _clear_form(self):
        pass

    def _get_item_title(self, data: dict) -> str:
        return ""

    def _get_empty_item(self) -> dict:
        return {}

    def _setup_live_title_update(self, widget):
        """Connect widget's text change to live-update the current list item title."""
        from PySide6.QtWidgets import QLineEdit, QTextEdit

        if isinstance(widget, QLineEdit):
            widget.textChanged.connect(self._update_current_title)
        elif isinstance(widget, QTextEdit):
            widget.textChanged.connect(self._update_current_title)

    def _update_current_title(self):
        idx = self.current_idx
        if 0 <= idx < len(self.data_list):
            item = self.item_list.item(idx)
            if item:
                data = self._get_current_item_data()
                title = self._get_item_title(data)
                if title:
                    item.setText(title)

    # Public BaseSectionWidget interface — LSP-compliant implementations:
    def clear(self):
        """Reset the entire list and form to an empty state."""
        self.current_idx = -1
        self.data_list = []
        self.item_list.clear()
        self._clear_form()
        self.right_stack.setCurrentWidget(self.empty_widget)

    # Internal list implementations (removes LSP violation):
    def _collect_list(self) -> list:
        self._save_current()
        return self.data_list

    def _populate_list(self, data: list):
        self.current_idx = -1
        self.data_list = []
        self.item_list.clear()
        self._clear_form()
        for item in data:
            self.data_list.append(item)
            self.item_list.addItem(
                self._get_item_title(item) or getattr(self, "item_name", "Entry")
            )
        if self.data_list:
            self.item_list.setCurrentRow(0)
