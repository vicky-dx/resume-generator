from PySide6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QComboBox,
    QPushButton,
    QMessageBox,
)
from PySide6.QtCore import Qt


class ProviderKeyDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Configure AI Provider")
        self.setModal(True)
        self.resize(400, 150)

        self.provider = "DeepSeek"
        self.api_key = ""

        self._setup_ui()

    def _setup_ui(self):
        lyt = QVBoxLayout(self)

        # Provider selection
        prov_lyt = QHBoxLayout()
        prov_lbl = QLabel("Provider:")
        self.prov_combo = QComboBox()
        self.prov_combo.addItem("DeepSeek")
        # Can add more providers here later (e.g. OpenAI, Anthropic)
        prov_lyt.addWidget(prov_lbl)
        prov_lyt.addWidget(self.prov_combo, 1)
        lyt.addLayout(prov_lyt)

        # API Key input
        key_lyt = QHBoxLayout()
        key_lbl = QLabel("API Key:")
        self.key_input = QLineEdit()
        self.key_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.key_input.setPlaceholderText("Enter your API key here...")
        key_lyt.addWidget(key_lbl)
        key_lyt.addWidget(self.key_input, 1)
        lyt.addLayout(key_lyt)

        lyt.addSpacing(10)

        # Buttons
        btn_lyt = QHBoxLayout()
        btn_lyt.addStretch()

        cancel_btn = QPushButton("Cancel")
        cancel_btn.clicked.connect(self.reject)

        save_btn = QPushButton("Save && Continue")
        save_btn.setProperty("cssClass", "primary")
        save_btn.clicked.connect(self._on_save)

        btn_lyt.addWidget(cancel_btn)
        btn_lyt.addWidget(save_btn)
        lyt.addLayout(btn_lyt)

    def _on_save(self):
        key = self.key_input.text().strip()
        if not key:
            QMessageBox.warning(self, "Validation Error", "API Key cannot be empty.")
            return

        self.provider = self.prov_combo.currentText()
        self.api_key = key
        self.accept()
