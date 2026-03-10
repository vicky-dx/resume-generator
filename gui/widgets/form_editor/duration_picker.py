"""Reusable month-year range picker widget.

Assembles strings in the canonical format expected by the LaTeX templates,
e.g. "Jan 2023 – Present" or "Feb 2020 – Mar 2024".
Eliminates free-text entry and guarantees consistent formatting.
"""

import re
from datetime import date as _date
from typing import TYPE_CHECKING, Callable

from PySide6.QtCore import Signal, Qt
from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QHBoxLayout,
    QLabel,
    QStackedWidget,
    QWidget,
)

_MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]

_CURRENT_YEAR = _date.today().year
_YEARS = [str(y) for y in range(1990, _CURRENT_YEAR + 2)]

# Patterns for parsing an existing duration string when loading saved data
_PARSE_RE = re.compile(
    r"^([A-Za-z]{3})\s+(\d{4})\s*[–\-]\s*"
    r"(Present|present|Current|current|([A-Za-z]{3})\s+(\d{4}))$"
)
# Year-only format: "2021 – 2024" or "2021 – Present"
_YEAR_ONLY_RE = re.compile(
    r"^(\d{4})\s*[–\-]\s*(Present|present|Current|current|\d{4})$"
)
# MM/YYYY format: "07/2018 - 07/2022" or "07/2018 - Present"
_SLASH_RE = re.compile(
    r"^(\d{1,2})/(\d{4})\s*[–\-]\s*(Present|present|Current|current|(\d{1,2})/(\d{4}))$"
)

_MONTH_NUM_TO_ABBR = {
    1: "Jan",
    2: "Feb",
    3: "Mar",
    4: "Apr",
    5: "May",
    6: "Jun",
    7: "Jul",
    8: "Aug",
    9: "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec",
}

# ---------------------------------------------------------------------------
# Parser strategies  (OCP: add new formats by appending to _PARSERS only)
# ---------------------------------------------------------------------------
# Each handler receives the widget and a completed re.Match object.
if TYPE_CHECKING:
    from gui.widgets.form_editor.duration_picker import DurationPickerWidget as _W


def _apply_parse_re(widget: "DurationPickerWidget", m: re.Match) -> None:  # type: ignore[name-defined]
    """Handle ``Mon YYYY – Mon YYYY`` / ``Mon YYYY – Present`` strings."""
    widget._set_month(widget._start_month, m.group(1))
    widget._set_year(widget._start_year, m.group(2))
    end_word = m.group(3).lower()
    if end_word in ("present", "current"):
        widget._present_cb.setChecked(True)
    else:
        widget._present_cb.setChecked(False)
        widget._set_month(widget._end_month, m.group(4))
        widget._set_year(widget._end_year, m.group(5))


def _apply_year_only_re(widget: "DurationPickerWidget", m: re.Match) -> None:  # type: ignore[name-defined]
    """Handle ``YYYY – YYYY`` / ``YYYY – Present`` strings."""
    widget._set_year(widget._start_year, m.group(1))
    end_word = m.group(2).lower()
    if end_word in ("present", "current"):
        widget._present_cb.setChecked(True)
    else:
        widget._present_cb.setChecked(False)
        widget._set_year(widget._end_year, m.group(2))


def _apply_slash_re(widget: "DurationPickerWidget", m: re.Match) -> None:  # type: ignore[name-defined]
    """Handle ``MM/YYYY – MM/YYYY`` / ``MM/YYYY – Present`` strings."""
    start_abbr = _MONTH_NUM_TO_ABBR.get(int(m.group(1)))
    if start_abbr:
        widget._set_month(widget._start_month, start_abbr)
    widget._set_year(widget._start_year, m.group(2))
    end_word = m.group(3).lower()
    if end_word in ("present", "current"):
        widget._present_cb.setChecked(True)
    else:
        widget._present_cb.setChecked(False)
        end_abbr = _MONTH_NUM_TO_ABBR.get(int(m.group(4)))
        if end_abbr:
            widget._set_month(widget._end_month, end_abbr)
        widget._set_year(widget._end_year, m.group(5))


# Ordered list of (compiled pattern, handler).  setText iterates this list;
# to support a new format, define a handler and append here — setText is
# never modified (satisfies OCP).
_PARSERS: list[tuple[re.Pattern, Callable]] = [
    (_PARSE_RE, _apply_parse_re),
    (_YEAR_ONLY_RE, _apply_year_only_re),
    (_SLASH_RE, _apply_slash_re),
]


class DurationPickerWidget(QWidget):
    """Compact start/end month-year selector with a 'Present' toggle.

    Single-row layout::

        [Jan▼] [2023▼]  –  [Mar▼] [2025▼]  [✓ Present]
                            ↕ swaps to green "Present" badge when checked

    Emits ``textChanged(str)`` whenever the assembled duration string changes,
    mirroring the API of ``QLineEdit`` so it's a drop-in replacement.
    """

    textChanged = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._build_ui()
        self._connect_signals()

    # ------------------------------------------------------------------
    # UI construction
    # ------------------------------------------------------------------

    def _build_ui(self):
        self.setFixedHeight(28)
        picker_row = QHBoxLayout(self)
        picker_row.setContentsMargins(0, 0, 0, 0)
        picker_row.setSpacing(4)

        # Start
        self._start_month = self._month_combo()
        self._start_year = self._year_combo()

        # Separator
        sep = QLabel("–")
        sep.setObjectName("durationSep")
        sep.setAlignment(Qt.AlignmentFlag.AlignCenter)
        sep.setFixedWidth(14)

        # End — uses a QStackedWidget to swap between combos and badge
        # Fixed width = month(90) + spacing(4) + year(90) = 184
        self._end_stack = QStackedWidget()
        self._end_stack.setFixedSize(184, 28)

        # Page 0: real end-date combos
        end_combo_page = QWidget()
        end_combo_layout = QHBoxLayout(end_combo_page)
        end_combo_layout.setContentsMargins(0, 0, 0, 0)
        end_combo_layout.setSpacing(4)
        self._end_month = self._month_combo()
        self._end_year = self._year_combo()
        end_combo_layout.addWidget(self._end_month)
        end_combo_layout.addWidget(self._end_year)

        # Page 1: "Present" badge — same fixed width as the two-combo page
        self._present_badge = QLabel("Present")
        self._present_badge.setObjectName("durationPresentBadge")
        self._present_badge.setAlignment(
            Qt.AlignmentFlag.AlignVCenter | Qt.AlignmentFlag.AlignLeft
        )
        self._present_badge.setFixedSize(184, 26)

        self._end_stack.addWidget(end_combo_page)  # index 0
        self._end_stack.addWidget(self._present_badge)  # index 1

        # Present checkbox
        self._present_cb = QCheckBox("Present")
        self._present_cb.setObjectName("durationPresentCheckbox")

        picker_row.addWidget(self._start_month)
        picker_row.addWidget(self._start_year)
        picker_row.addWidget(sep)
        picker_row.addWidget(self._end_stack)
        picker_row.addSpacing(6)
        picker_row.addWidget(self._present_cb)
        picker_row.addStretch()

        # Default: Present checked
        self._present_cb.setChecked(True)
        self._apply_present_state(True)

    @staticmethod
    def _month_combo() -> QComboBox:
        cb = QComboBox()
        cb.addItems(_MONTHS)
        cb.setFixedSize(90, 28)
        return cb

    @staticmethod
    def _year_combo() -> QComboBox:
        cb = QComboBox()
        cb.addItems(_YEARS)
        idx = _YEARS.index(str(_CURRENT_YEAR))
        cb.setCurrentIndex(idx)
        cb.setFixedSize(90, 28)
        return cb

    # ------------------------------------------------------------------
    # Signal wiring
    # ------------------------------------------------------------------

    def _connect_signals(self):
        self._present_cb.toggled.connect(self._apply_present_state)
        for w in (self._start_month, self._start_year, self._end_month, self._end_year):
            w.currentIndexChanged.connect(self._on_change)
        self._present_cb.toggled.connect(self._on_change)

    def _apply_present_state(self, checked: bool):
        """Swap the end-date stack between real combos and the Present badge."""
        self._end_stack.setCurrentIndex(1 if checked else 0)

    def _on_change(self, *_):
        self.textChanged.emit(self.text())

    # ------------------------------------------------------------------
    # Public API  (mirrors QLineEdit)
    # ------------------------------------------------------------------

    def text(self) -> str:
        """Return the assembled duration string."""
        start = f"{self._start_month.currentText()} {self._start_year.currentText()}"
        if self._present_cb.isChecked():
            end = "Present"
        else:
            end = f"{self._end_month.currentText()} {self._end_year.currentText()}"
        return f"{start} – {end}"

    def setText(self, value: str):
        """Populate the pickers from an existing duration string.

        Open/Closed: this method never changes when new formats are added.
        Register new parsers by appending to the module-level ``_PARSERS`` list.
        """
        if not value or not value.strip():
            return
        value = value.strip()
        for pattern, apply_fn in _PARSERS:
            m = pattern.match(value)
            if m:
                apply_fn(self, m)
                return

    def clear(self):
        """Reset to default state (current year for both, Present checked)."""
        idx = _YEARS.index(str(_CURRENT_YEAR))
        self._start_month.setCurrentIndex(0)
        self._start_year.setCurrentIndex(idx)
        self._end_month.setCurrentIndex(0)
        self._end_year.setCurrentIndex(idx)
        self._present_cb.setChecked(True)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _set_month(combo: QComboBox, month_str: str):
        title = month_str.capitalize()[:3]
        idx = combo.findText(title)
        if idx >= 0:
            combo.setCurrentIndex(idx)

    @staticmethod
    def _set_year(combo: QComboBox, year_str: str):
        idx = combo.findText(str(year_str))
        if idx >= 0:
            combo.setCurrentIndex(idx)
        else:
            # Year outside the predefined range — add it
            combo.addItem(str(year_str))
            combo.setCurrentIndex(combo.count() - 1)
