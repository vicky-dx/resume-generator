from PySide6.QtWidgets import (
    QWidget,
    QFormLayout,
    QLineEdit,
    QFrame,
    QLabel,
    QTextEdit,
    QVBoxLayout,
    QScrollArea,
)
from PySide6.QtGui import QFont

from gui.widgets.form_editor.base import BaseSectionWidget
from gui.config import UIConfig
from gui.models import PersonalInfo


class PersonalInfoWidget(BaseSectionWidget):
    """Widget for editing personal info and summary."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._setup_ui()

    def _setup_ui(self):
        scroll = QScrollArea(self)
        scroll.setWidgetResizable(True)

        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.addWidget(scroll)

        container = QWidget()
        form = QVBoxLayout(container)
        form.setSpacing(16)
        form.setContentsMargins(16, 16, 16, 16)

        def _add_field(layout: QVBoxLayout, label_text: str, widget: QWidget):
            lbl = QLabel(label_text)
            lbl.setProperty("cssClass", "field_label")
            layout.addWidget(lbl)
            layout.addWidget(widget)

        def _le(placeholder):
            w = QLineEdit()
            w.setPlaceholderText(placeholder)
            return w

        self.f_name = _le("Full Name (e.g. John Smith)")
        self.f_location = _le("City, Country (e.g. Nagpur, India)")
        self.f_tagline = _le("Role | Skill | Skill (e.g. Data Engineer | AWS | Python)")
        self.f_email = _le("you@email.com")
        self.f_phone = _le("+1 234 567 8900")
        self.f_github = _le("https://github.com/username")
        self.f_linkedin = _le("https://linkedin.com/in/username")

        _add_field(form, "Name", self.f_name)
        _add_field(form, "Location", self.f_location)
        _add_field(form, "Tagline", self.f_tagline)
        _add_field(form, "Email", self.f_email)
        _add_field(form, "Phone", self.f_phone)
        _add_field(form, "GitHub", self.f_github)
        _add_field(form, "LinkedIn", self.f_linkedin)

        sep = QFrame()
        sep.setFrameShape(QFrame.HLine)
        sep.setFrameShadow(QFrame.Sunken)
        sep.setProperty("cssClass", "divider")
        form.addWidget(sep)

        from PySide6.QtWidgets import QHBoxLayout
        from gui.widgets.format_toolbar import FormatToolbar

        self.f_summary = QTextEdit()
        self.f_summary.setPlaceholderText(
            "Write a 2-3 sentence summary of your experience, skills, and goals..."
        )
        self.f_summary.setMinimumHeight(120)
        summary_header = QHBoxLayout()
        summary_hdr = QLabel("Professional Summary:")
        summary_hdr.setProperty("cssClass", "header_primary")
        summary_header.addWidget(summary_hdr)
        summary_header.addWidget(FormatToolbar(self.f_summary))
        form.addLayout(summary_header)
        form.addWidget(self.f_summary)

        form.addStretch()

        scroll.setWidget(container)

    def populate(self, pi: PersonalInfo, summary: str = ""):
        self.f_name.setText(pi.name)
        self.f_location.setText(pi.location)
        self.f_tagline.setText(pi.tagline)
        self.f_email.setText(pi.email)
        self.f_phone.setText(pi.phone)
        self.f_github.setText(pi.github)
        self.f_linkedin.setText(pi.linkedin)
        self.f_summary.setPlainText(summary)

    def collect(self) -> tuple[PersonalInfo, str]:
        pi = PersonalInfo(
            name=self.f_name.text().strip(),
            location=self.f_location.text().strip(),
            tagline=self.f_tagline.text().strip(),
            email=self.f_email.text().strip(),
            phone=self.f_phone.text().strip(),
            github=self.f_github.text().strip(),
            linkedin=self.f_linkedin.text().strip(),
        )
        return pi, self.f_summary.toPlainText().strip()

    def clear(self):
        self.f_name.clear()
        self.f_location.clear()
        self.f_tagline.clear()
        self.f_email.clear()
        self.f_phone.clear()
        self.f_github.clear()
        self.f_linkedin.clear()
        self.f_summary.clear()
