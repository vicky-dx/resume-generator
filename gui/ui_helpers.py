"""
Widget factory helpers — extracted from UIConfig (SRP fix).

UIConfig's single responsibility is holding constants; widget creation is a
separate concern and belongs here.
"""

from PySide6.QtWidgets import QPushButton, QLabel
from PySide6.QtCore import Qt, QPoint, QTimer
from PySide6.QtGui import QCursor


class _CustomTooltip(QLabel):
    """A styled QLabel popup used as a custom tooltip.

    Created once per application and reused. Bypasses native Windows tooltip
    rendering which ignores Qt stylesheets under dark mode.
    """

    _instance = None

    @classmethod
    def instance(cls) -> "_CustomTooltip":
        if cls._instance is None or not cls._instance.isVisible():
            cls._instance = cls(None)
        return cls._instance

    def __init__(self, parent=None):
        super().__init__(parent, Qt.WindowType.ToolTip)
        self.setWindowFlags(Qt.WindowType.ToolTip | Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, False)
        self.setStyleSheet(
            "QLabel {"
            "  background-color: #FFFBCC;"
            "  color: #212529;"
            "  border: 1px solid #AAAAAA;"
            "  border-radius: 4px;"
            "  padding: 4px 8px;"
            "  font-family: 'Segoe UI', sans-serif;"
            "  font-size: 9pt;"
            "}"
        )
        self.setWordWrap(True)
        self._hide_timer = QTimer(self)
        self._hide_timer.setSingleShot(True)
        self._hide_timer.timeout.connect(self.hide)

    def show_at_cursor(self, text: str, timeout_ms: int = 4000):
        self.setText(text)
        self.adjustSize()
        pos = QCursor.pos() + QPoint(12, 16)
        self.move(pos)
        self.show()
        self.raise_()
        self._hide_timer.start(timeout_ms)


def set_custom_tooltip(widget, text: str):
    """Replace the native tooltip on *widget* with a fully styled custom popup."""
    widget.setToolTip("")  # suppress native tooltip
    from PySide6.QtCore import QObject, QEvent as QEv

    class _Filter(QObject):
        def eventFilter(self, obj, event):
            if event.type() == QEv.Type.ToolTip:
                _CustomTooltip.instance().show_at_cursor(text)
                return True
            if event.type() in (QEv.Type.Leave, QEv.Type.MouseButtonPress):
                inst = _CustomTooltip._instance
                if inst:
                    inst.hide()
            return False

    f = _Filter(widget)
    widget.installEventFilter(f)
    widget._tooltip_filter = f  # keep strong reference


def install_list_tooltip_filter(list_widget):
    """Install a custom tooltip handler on a QListWidget.

    Each QListWidgetItem's tooltip text (set via item.setToolTip) is shown
    using the custom styled popup instead of the native black tooltip.
    """
    from PySide6.QtCore import QObject, QEvent as QEv

    class _ListFilter(QObject):
        def eventFilter(self, obj, event):
            if event.type() == QEv.Type.ToolTip:
                item = obj.itemAt(event.pos())
                if item:
                    tip = item.toolTip()
                    if tip:
                        _CustomTooltip.instance().show_at_cursor(tip)
                        return True
            if event.type() in (QEv.Type.Leave, QEv.Type.MouseButtonPress):
                inst = _CustomTooltip._instance
                if inst:
                    inst.hide()
            return False

    f = _ListFilter(list_widget)
    list_widget.installEventFilter(f)
    list_widget._tooltip_filter = f  # keep strong reference
    list_widget.setMouseTracking(True)


def apply_style(widget, variant: str = "default") -> None:
    """Apply a named button style to *widget* via QSS properties.

    Variants: ``'primary'``, ``'danger'``, ``'default'``, ``'icon'``.
    """
    widget.setProperty("cssClass", variant)
    # Force re-evaluation of the style sheet if the widget is already visible.
    widget.style().unpolish(widget)
    widget.style().polish(widget)


import qtawesome as qta


def get_icon(icon_name: str, color: str = None):
    """Return a QIcon generated from QtAwesome."""
    color = color or "#495057"
    return qta.icon(icon_name, color=color)


def make_icon_button(
    icon_name: str, size: int, tooltip: str = "", color: str = None
) -> QPushButton:
    """Return a square, icon-only QPushButton of the given *size*."""
    btn = QPushButton()
    btn.setIcon(get_icon(icon_name, color))
    if tooltip:
        set_custom_tooltip(btn, tooltip)
    btn.setFixedSize(size, size)
    btn.setProperty("cssClass", "icon")
    return btn
