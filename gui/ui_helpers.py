"""
Widget factory helpers — extracted from UIConfig (SRP fix).

UIConfig's single responsibility is holding constants; widget creation is a
separate concern and belongs here.
"""

from PySide6.QtWidgets import QPushButton


def apply_style(widget, variant: str = "default") -> None:
    """Apply a named button style to *widget* via QSS properties.

    Variants: ``'primary'``, ``'danger'``, ``'default'``, ``'icon'``.
    """
    widget.setProperty("cssClass", variant)
    # Force re-evaluation of the style sheet if the widget is already visible.
    widget.style().unpolish(widget)
    widget.style().polish(widget)


def make_icon_button(icon: str, size: int, tooltip: str = "") -> QPushButton:
    """Return a square, icon-only QPushButton of the given *size*."""
    btn = QPushButton(icon)
    btn.setToolTip(tooltip)
    btn.setFixedSize(size, size)
    btn.setProperty("cssClass", "icon")
    return btn
