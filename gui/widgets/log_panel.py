from PySide6.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QTextEdit
from PySide6.QtGui import QFont

from gui.config import UIConfig
from gui.ui_helpers import make_icon_button
from gui.logger import app_logger


class LogPanel(QWidget):
    """Collapsible panel for displaying build output logs."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._setup_ui()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(2)

        toggle_row = QHBoxLayout()
        toggle_row.setContentsMargins(0, 0, 0, 0)
        toggle_row.setSpacing(UIConfig.ROW_SPACING)

        self._log_toggle_btn = QPushButton("▶ Build Output")
        self._log_toggle_btn.setCheckable(True)
        self._log_toggle_btn.setChecked(False)
        self._log_toggle_btn.setFixedHeight(UIConfig.ROW_HEIGHT)
        self._log_toggle_btn.setProperty("cssClass", "log_toggle")
        self._log_toggle_btn.clicked.connect(self._toggle_log)
        toggle_row.addWidget(self._log_toggle_btn)

        clear_btn = make_icon_button(
            UIConfig.ICON_TRASH, UIConfig.ICON_BTN_SIZE, "Clear log"
        )
        clear_btn.clicked.connect(self.clear_log)
        toggle_row.addWidget(clear_btn)
        toggle_row.addStretch()
        layout.addLayout(toggle_row)

        self.log_text = QTextEdit()
        self.log_text.setObjectName("buildOutputLog")
        self.log_text.setFont(QFont("Consolas", UIConfig.FONT_CODE_SIZE))
        self.log_text.setReadOnly(True)
        self.log_text.setFixedHeight(UIConfig.LOG_HEIGHT)
        self.log_text.setVisible(False)
        layout.addWidget(self.log_text)

    def _toggle_log(self, checked):
        """Expand or collapse the build output log."""
        self.log_text.setVisible(checked)
        self._log_toggle_btn.setText("▼ Build Output" if checked else "▶ Build Output")

    def append_message(self, message: str, level: str = "info"):
        """Append a colored message to the log without auto-expanding."""
        _level_map = {
            "info": app_logger.info,
            "success": app_logger.info,
            "warning": app_logger.warning,
            "error": app_logger.error,
        }
        _level_map.get(level, app_logger.info)("[UI] %s", message)

        colors = {
            "info": "#d4d4d4",
            "success": "#4AF626",
            "warning": "#ce9178",
            "error": "#f44747",
        }
        color = colors.get(level, "#d4d4d4")

        safe_msg = (
            message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        )

        import datetime

        time_str = datetime.datetime.now().strftime("%H:%M:%S")
        html = (
            f'<span style="color: #808080">[{time_str}]</span> '
            f'<span style="color: {color}">{safe_msg}</span>'
        )
        self.log_text.append(html)

    def clear_log(self):
        """Clear all log entries."""
        self.log_text.clear()
