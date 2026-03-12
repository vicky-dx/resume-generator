"""Library tab — unified read-only view of all projects and skills across JSON files."""

import asyncio

from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QPushButton,
    QSplitter,
    QScrollArea,
    QFrame,
    QTabWidget,
)
from PySide6.QtCore import Qt, QTimer, Signal
from PySide6.QtGui import QFont
from qasync import asyncSlot

from gui.config import UIConfig
from gui.protocols import ILibraryReader
from gui.ui_helpers import get_icon


def _bold_label(text: str, size: int = UIConfig.FONT_NORMAL_SIZE) -> QLabel:
    lbl = QLabel(text)
    f = QFont()
    f.setBold(True)
    f.setPointSize(size)
    lbl.setFont(f)
    return lbl


def _tech_tags_html(tech_stack: str) -> str:
    techs = [t.strip() for t in tech_stack.split(",") if t.strip()]
    return "  ".join(
        f'<span style="background:#EEF4FF;color:#0078d4;'
        f"border:1px solid #B6D4F7;border-radius:4px;"
        f'padding:2px 8px;font-size:9pt;">{t}</span>'
        for t in techs
    )


class _ProjectDetailPanel(QScrollArea):
    """Right panel – renders full detail of the selected project.

    SRP: only responsible for displaying a single project's content.
    """

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWidgetResizable(True)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.setFrameShape(QFrame.Shape.NoFrame)
        self._show_placeholder()

    def _show_placeholder(self) -> None:
        w = QWidget()
        lyt = QVBoxLayout(w)
        lyt.setContentsMargins(20, 60, 20, 20)
        lbl = QLabel("← Select a project from the list")
        lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lbl.setStyleSheet("color: #ADB5BD; font-style: italic;")
        lyt.addWidget(lbl)
        lyt.addStretch()
        self.setWidget(w)

    def show_project(self, project) -> None:
        """Rebuild the detail view for the given LibraryProject."""
        w = QWidget()
        lyt = QVBoxLayout(w)
        lyt.setContentsMargins(20, 16, 20, 20)
        lyt.setSpacing(10)

        # ── Name ──────────────────────────────────────────────────────────────
        name_lbl = _bold_label(project.name, UIConfig.FONT_SECTION_SIZE + 1)
        name_lbl.setWordWrap(True)
        name_lbl.setStyleSheet(f"color: {UIConfig.COLOR_PRIMARY};")
        lyt.addWidget(name_lbl)

        # ── Meta row: year + source badge ─────────────────────────────────────
        meta = QWidget()
        meta_lyt = QHBoxLayout(meta)
        meta_lyt.setContentsMargins(0, 0, 0, 0)
        meta_lyt.setSpacing(8)
        if project.date:
            yr = QLabel(f"📅  {project.date}")
            yr.setStyleSheet("color: #6C757D; font-size: 10pt;")
            meta_lyt.addWidget(yr)
        meta_lyt.addStretch()
        src = QLabel(f"  {project.source}  ")
        src.setStyleSheet(
            "background:#F1F3F5; color:#6C757D; border:1px solid #DEE2E6;"
            " border-radius:4px; font-size:9pt; padding:1px 4px;"
        )
        meta_lyt.addWidget(src)
        lyt.addWidget(meta)

        # ── Divider ───────────────────────────────────────────────────────────
        sep = QFrame()
        sep.setFrameShape(QFrame.Shape.HLine)
        sep.setStyleSheet("background:#E9ECEF; max-height:1px; border:none;")
        lyt.addWidget(sep)

        # ── Technologies ──────────────────────────────────────────────────────
        if project.tech_stack:
            tech_hdr = _bold_label("Technologies")
            tech_hdr.setStyleSheet("color: #495057; margin-top: 4px;")
            lyt.addWidget(tech_hdr)
            tags_lbl = QLabel(_tech_tags_html(project.tech_stack))
            tags_lbl.setWordWrap(True)
            tags_lbl.setTextFormat(Qt.TextFormat.RichText)
            lyt.addWidget(tags_lbl)

        # ── Description ───────────────────────────────────────────────────────
        desc_hdr = _bold_label("Description")
        desc_hdr.setStyleSheet("color: #495057; margin-top: 4px;")
        lyt.addWidget(desc_hdr)

        desc_text = (
            "\n".join(project.description)
            if project.description
            else "No description available."
        )
        desc_lbl = QLabel(desc_text)
        desc_lbl.setWordWrap(True)
        desc_lbl.setAlignment(Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignLeft)
        desc_lbl.setStyleSheet("color: #343A40;")
        lyt.addWidget(desc_lbl)

        lyt.addStretch()
        self.setWidget(w)


class _ProjectsView(QWidget):
    """Master-detail layout: left list + right detail panel.

    SRP: only responsible for rendering projects data pushed to it.
    Does not call the reader directly — data is injected via populate().
    """

    refresh_requested = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._projects: list = []
        self._setup_ui()

    def _setup_ui(self) -> None:
        lyt = QVBoxLayout(self)
        lyt.setContentsMargins(0, 0, 0, 0)
        lyt.setSpacing(0)

        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setHandleWidth(1)
        splitter.setStyleSheet("QSplitter::handle { background: #CED4DA; }")

        # ── Left: project name list ────────────────────────────────────────────
        left = QWidget()
        left_lyt = QVBoxLayout(left)
        left_lyt.setContentsMargins(8, 8, 8, 8)
        left_lyt.setSpacing(6)

        header_row = QHBoxLayout()
        header_row.setContentsMargins(0, 0, 0, 0)
        header_lbl = QLabel("All Projects")
        header_lbl.setProperty("cssClass", "header_primary")
        header_row.addWidget(header_lbl)
        header_row.addStretch()
        self._refresh_btn = QPushButton()
        self._refresh_btn.setIcon(get_icon(UIConfig.ICON_REFRESH))
        self._refresh_btn.setProperty("cssClass", "icon")
        self._refresh_btn.setFixedSize(UIConfig.ICON_BTN_SIZE, UIConfig.ICON_BTN_SIZE)
        self._refresh_btn.setToolTip("Refresh library")
        self._refresh_btn.clicked.connect(self.refresh_requested.emit)
        header_row.addWidget(self._refresh_btn)
        left_lyt.addLayout(header_row)

        self._list = QListWidget()
        self._list.setSpacing(2)
        self._list.currentRowChanged.connect(self._on_row_changed)
        left_lyt.addWidget(self._list, 1)
        splitter.addWidget(left)

        # ── Right: detail panel ────────────────────────────────────────────────
        self._detail = _ProjectDetailPanel()
        splitter.addWidget(self._detail)

        splitter.setSizes([260, 600])
        splitter.setStretchFactor(0, 0)
        splitter.setStretchFactor(1, 1)

        lyt.addWidget(splitter, 1)

    def set_loading(self, loading: bool) -> None:
        """Disable/enable the refresh button and clear the list while loading."""
        self._refresh_btn.setEnabled(not loading)
        if loading:
            self._projects = []
            self._list.clear()
            self._detail._show_placeholder()

    def populate(self, projects: list) -> None:
        """Replace list contents with the supplied project data."""
        self._projects = projects
        self._list.clear()
        for p in projects:
            self._list.addItem(p.name)
        if projects:
            self._list.setCurrentRow(0)

    def _on_row_changed(self, row: int) -> None:
        if 0 <= row < len(self._projects):
            self._detail.show_project(self._projects[row])


class _SkillsView(QScrollArea):
    """Scrollable panel showing all skills grouped by category.

    SRP: only responsible for rendering skills data pushed to it.
    Does not call the reader directly — data is injected via populate().
    """

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWidgetResizable(True)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.setFrameShape(QFrame.Shape.NoFrame)
        self._show_loading()

    def _show_loading(self) -> None:
        w = QWidget()
        lyt = QVBoxLayout(w)
        lyt.setContentsMargins(20, 60, 20, 20)
        lbl = QLabel("Loading skills…")
        lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lbl.setStyleSheet("color: #ADB5BD; font-style: italic;")
        lyt.addWidget(lbl)
        lyt.addStretch()
        self.setWidget(w)

    def populate(self, skills: list) -> None:
        """Rebuild the panel with the supplied skills data."""
        inner = QWidget()
        lyt = QVBoxLayout(inner)
        lyt.setContentsMargins(20, 16, 20, 16)
        lyt.setSpacing(16)

        if not skills:
            lbl = QLabel("No skills found.")
            lbl.setStyleSheet("color: #ADB5BD; font-style: italic;")
            lyt.addWidget(lbl)
        else:
            for cat in skills:
                cat_lbl = _bold_label(cat.category)
                cat_lbl.setStyleSheet(f"color: {UIConfig.COLOR_PRIMARY};")
                lyt.addWidget(cat_lbl)

                items = cat.items if cat.items else []
                tag_html = "  ".join(
                    f'<span style="background:#EEF4FF;color:#0078d4;'
                    f"border:1px solid #B6D4F7;border-radius:4px;"
                    f'padding:3px 8px;font-size:9pt;">{item}</span>'
                    for item in items
                )
                tags_lbl = QLabel(tag_html)
                tags_lbl.setWordWrap(True)
                tags_lbl.setTextFormat(Qt.TextFormat.RichText)
                lyt.addWidget(tags_lbl)

                sep = QFrame()
                sep.setFrameShape(QFrame.Shape.HLine)
                sep.setStyleSheet("background:#F1F3F5; max-height:1px; border:none;")
                lyt.addWidget(sep)

        lyt.addStretch()
        self.setWidget(inner)


class LibraryTab(QWidget):
    """Library tab — unified read-only collection of all resume content.

    Depends only on the ILibraryReader abstraction (DIP).
    Coordinates async loading and pushes data into _ProjectsView / _SkillsView.
    Views never call the reader directly — all I/O is owned here (SRP).
    """

    show_action_panel = False

    def __init__(self, library_reader: ILibraryReader, parent=None):
        super().__init__(parent)
        self._reader = library_reader
        self._loading = False
        self._setup_ui()
        # Trigger first load on the next event-loop tick so the window renders
        # before any I/O starts (non-blocking startup).
        QTimer.singleShot(0, self._async_load)

    def _setup_ui(self) -> None:
        lyt = QVBoxLayout(self)
        lyt.setContentsMargins(
            UIConfig.PAD_SMALL,
            UIConfig.PAD_SMALL,
            UIConfig.PAD_SMALL,
            UIConfig.PAD_SMALL,
        )
        lyt.setSpacing(0)

        self._projects_view = _ProjectsView()
        self._skills_view = _SkillsView()

        # Refresh button in _ProjectsView delegates up to this coordinator.
        self._projects_view.refresh_requested.connect(self._async_load)

        self._sub_tabs = QTabWidget()
        self._sub_tabs.addTab(
            self._projects_view,
            get_icon(UIConfig.ICON_PROJECT),
            "Projects",
        )
        self._sub_tabs.addTab(
            self._skills_view,
            get_icon(UIConfig.ICON_SKILLS),
            "Skills",
        )
        lyt.addWidget(self._sub_tabs, 1)

    @asyncSlot()
    async def _async_load(self) -> None:
        """Load all library data off the UI thread.

        Guards against concurrent runs with _loading flag.
        Calls _load_all() exactly once per refresh (single-pass).
        """
        if self._loading:
            return
        self._loading = True
        self._projects_view.set_loading(True)

        loop = asyncio.get_running_loop()
        projects, skills = await loop.run_in_executor(None, self._reader.load_all)

        self._projects_view.populate(projects)
        self._skills_view.populate(skills)
        self._projects_view.set_loading(False)
        self._loading = False
