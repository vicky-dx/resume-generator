from PySide6.QtWidgets import QWidget, QHBoxLayout, QPushButton, QLabel
from PySide6.QtGui import QFont, QTextCursor
from gui.ui_helpers import set_custom_tooltip


def _wrap_selection(editor, marker: str):
    """Wrap selected text with marker. If nothing selected, insert **text** placeholder."""
    cursor: QTextCursor = editor.textCursor()
    selected = cursor.selectedText()
    if selected:
        cursor.insertText(f"{marker}{selected}{marker}")
    else:
        pos = cursor.position()
        placeholder = "text"
        cursor.insertText(f"{marker}{placeholder}{marker}")
        # Select the placeholder so user can immediately overtype it
        cursor.setPosition(pos + len(marker))
        cursor.setPosition(
            pos + len(marker) + len(placeholder), QTextCursor.MoveMode.KeepAnchor
        )
        editor.setTextCursor(cursor)
    editor.setFocus()


class FormatToolbar(QWidget):
    """Compact **B** / *I* toolbar that wraps selected text in an attached editor."""

    def __init__(self, editor, parent=None):
        super().__init__(parent)
        self._editor = editor

        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(3)

        bold_btn = QPushButton("B")
        bold_btn.setFixedSize(24, 24)
        bold_btn.setProperty("cssClass", "format_btn")
        bold_font = QFont()
        bold_font.setBold(True)
        bold_btn.setFont(bold_font)
        set_custom_tooltip(bold_btn, "Bold — wraps selection in **...** ")
        bold_btn.clicked.connect(lambda: _wrap_selection(self._editor, "**"))
        layout.addWidget(bold_btn)

        italic_btn = QPushButton("I")
        italic_btn.setFixedSize(24, 24)
        italic_btn.setProperty("cssClass", "format_btn")
        italic_font = QFont()
        italic_font.setItalic(True)
        italic_btn.setFont(italic_font)
        set_custom_tooltip(italic_btn, "Italic — wraps selection in *...*")
        italic_btn.clicked.connect(lambda: _wrap_selection(self._editor, "*"))
        layout.addWidget(italic_btn)

        hint = QLabel("  **bold**  *italic*")
        hint.setProperty("cssClass", "hint")
        layout.addWidget(hint)

        layout.addStretch()
