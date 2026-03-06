import re
from PySide6.QtGui import QSyntaxHighlighter, QTextCharFormat, QColor, QFont, QPainter, QTextFormat
from PySide6.QtWidgets import QPlainTextEdit, QWidget, QTextEdit
from PySide6.QtCore import Qt, QRect, QSize

from gui.config import UIConfig


class JSONHighlighter(QSyntaxHighlighter):
    """Syntax highlighter for JSON using color coding"""

    def __init__(self, parent=None):
        super().__init__(parent)

        # Define formats for different JSON elements
        self.formats = {}

        # Keys (property names) - blue
        key_format = QTextCharFormat()
        key_format.setForeground(QColor("#0451a5"))
        key_format.setFontWeight(QFont.Weight.Bold)
        self.formats["key"] = key_format

        # String values - brown/orange
        string_format = QTextCharFormat()
        string_format.setForeground(QColor("#a31515"))
        self.formats["string"] = string_format

        # Numbers - green
        number_format = QTextCharFormat()
        number_format.setForeground(QColor("#098658"))
        self.formats["number"] = number_format

        # Booleans and null - purple
        keyword_format = QTextCharFormat()
        keyword_format.setForeground(QColor("#0000ff"))
        keyword_format.setFontWeight(QFont.Weight.Bold)
        self.formats["keyword"] = keyword_format

        # Brackets and punctuation - dark gray
        punctuation_format = QTextCharFormat()
        punctuation_format.setForeground(QColor("#000000"))
        self.formats["punctuation"] = punctuation_format

    def highlightBlock(self, text):
        """Apply syntax highlighting to a block of text"""
        # Property names (keys) - "key":
        for match in re.finditer(r'"([^"]+)"\s*:', text):
            self.setFormat(
                match.start(), match.end() - match.start(), self.formats["key"]
            )

        # String values - "value" (but not keys)
        for match in re.finditer(r':\s*"([^"]+)"', text):
            start = match.start() + text[match.start() :].index('"')
            length = match.end() - start
            self.setFormat(start, length, self.formats["string"])

        # Numbers
        for match in re.finditer(r"\b\d+\.?\d*\b", text):
            self.setFormat(
                match.start(), match.end() - match.start(), self.formats["number"]
            )

        # Keywords (true, false, null)
        for match in re.finditer(r"\b(true|false|null)\b", text):
            self.setFormat(
                match.start(), match.end() - match.start(), self.formats["keyword"]
            )

        # Brackets and punctuation
        for match in re.finditer(r"[\[\]{}:,]", text):
            self.setFormat(match.start(), 1, self.formats["punctuation"])


class LineNumberArea(QWidget):
    def __init__(self, editor):
        super().__init__(editor)
        self.codeEditor = editor

    def sizeHint(self):
        return QSize(self.codeEditor.lineNumberAreaWidth(), 0)

    def paintEvent(self, event):
        self.codeEditor.lineNumberAreaPaintEvent(event)


class JSONEditor(QPlainTextEdit):
    """A QPlainTextEdit pre-configured for JSON editing with syntax highlighting and line numbers."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFont(QFont("Consolas", UIConfig.FONT_CODE_SIZE))
        self.setLineWrapMode(QPlainTextEdit.LineWrapMode.NoWrap)
        self.highlighter = JSONHighlighter(self.document())
        
        self.lineNumberArea = LineNumberArea(self)

        self.blockCountChanged.connect(self.updateLineNumberAreaWidth)
        self.updateRequest.connect(self.updateLineNumberArea)

        self.updateLineNumberAreaWidth(0)
        
        self._error_line = -1

    def lineNumberAreaWidth(self):
        digits = 1
        max_value = max(1, self.blockCount())
        while max_value >= 10:
            max_value /= 10
            digits += 1

        # Calculate width based on font metrics
        space = 3 + self.fontMetrics().horizontalAdvance("9") * digits
        return space

    def updateLineNumberAreaWidth(self, _):
        self.setViewportMargins(self.lineNumberAreaWidth(), 0, 0, 0)

    def updateLineNumberArea(self, rect, dy):
        if dy:
            self.lineNumberArea.scroll(0, dy)
        else:
            self.lineNumberArea.update(0, rect.y(), self.lineNumberArea.width(), rect.height())

        if rect.contains(self.viewport().rect()):
            self.updateLineNumberAreaWidth(0)

    def resizeEvent(self, event):
        super().resizeEvent(event)
        cr = self.contentsRect()
        self.lineNumberArea.setGeometry(QRect(cr.left(), cr.top(), self.lineNumberAreaWidth(), cr.height()))

    def lineNumberAreaPaintEvent(self, event):
        painter = QPainter(self.lineNumberArea)
        painter.fillRect(event.rect(), QColor("#f0f0f0"))

        block = self.firstVisibleBlock()
        blockNumber = block.blockNumber()
        top = self.blockBoundingGeometry(block).translated(self.contentOffset()).top()
        bottom = top + self.blockBoundingRect(block).height()

        while block.isValid() and top <= event.rect().bottom():
            if block.isVisible() and bottom >= event.rect().top():
                number = str(blockNumber + 1)
                
                # Highlight the background of the error line number in red
                if blockNumber + 1 == self._error_line:
                    painter.fillRect(
                        0, int(top), self.lineNumberArea.width(), int(self.fontMetrics().height()), QColor("#ffcccc")
                    )
                    painter.setPen(QColor("#ff0000"))
                else:
                    painter.setPen(Qt.darkGray)

                painter.drawText(
                    0, int(top), self.lineNumberArea.width() - 2, self.fontMetrics().height(),
                    Qt.AlignRight | Qt.AlignVCenter, number
                )

            block = block.next()
            top = bottom
            bottom = top + self.blockBoundingRect(block).height()
            blockNumber += 1

    def set_error_line(self, lineno: int):
        """Highlights a specific line with a red background indicating an error."""
        self._error_line = lineno
        
        selection = QTextEdit.ExtraSelection()
        lineColor = QColor("#ffcccc")

        selection.format.setBackground(lineColor)
        selection.format.setProperty(QTextFormat.FullWidthSelection, True)
        
        # Navigate cursor to the specific line
        cursor = self.textCursor()
        cursor.setPosition(0)
        cursor.movePosition(cursor.MoveOperation.Down, cursor.MoveMode.MoveAnchor, lineno - 1)
        
        selection.cursor = cursor
        
        self.setExtraSelections([selection])
        self.lineNumberArea.update() # Force repaint to show red number

    def clear_error(self):
        """Clears any error highlighting."""
        self._error_line = -1
        self.setExtraSelections([])
        self.lineNumberArea.update()
