from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel
from PySide6.QtCore import Qt

class PromptTab(QWidget):
    """Tab for prompt editing and viewing."""
    def __init__(self, parent=None):
        super().__init__(parent)
        self._setup_ui()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        label = QLabel("Prompt Tab Content Goes Here")
        label.setAlignment(Qt.AlignCenter)
        layout.addWidget(label)
