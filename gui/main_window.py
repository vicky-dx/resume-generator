from pathlib import Path
from PySide6.QtWidgets import (
    QMainWindow,
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QTabWidget,
    QLabel,
    QMessageBox,
    QFrame,
    QComboBox,
    QPushButton,
    QProgressBar,
)
from PySide6.QtGui import QIcon, QFont
from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import QApplication
import asyncio
from gui.config import UIConfig, APP_VERSION, GITHUB_REPO
from gui.utils import get_base_path, get_resource_path
from gui.protocols import IFileManager
from gui.services.update_checker import check_for_update
import webbrowser
from qasync import asyncSlot
from gui.ui_helpers import get_icon
from gui.worker import AsyncGenerationWorker
from script.generate_resume import (
    generate_resume as _generate_resume,
)  # IResumeGenerator
from gui.widgets.template_tab import TemplateTab
from gui.widgets.quick_create_tab import QuickCreateTab
from gui.widgets.form_editor.form_tab import FormEditorTab
from gui.widgets.library_tab import LibraryTab
from gui.widgets.prompt_tab import PromptTab
from gui.widgets.log_panel import LogPanel
from gui.widgets.action_panel import ActionPanelWidget
from gui.services.library_service import LibraryService


class ResumeGeneratorMainWindow(QMainWindow):
    """Main GUI window orchestrating the application."""

    def __init__(self, file_manager: IFileManager):
        super().__init__()
        self.worker = None
        self.is_generating = False
        self.file_manager = file_manager  # DIP: injected by main.py

        self._setup_paths()
        self._setup_ui()

        # Initial data load
        self.refresh_templates()

        # Check for updates 3 s after startup so it never delays boot
        QTimer.singleShot(3000, self._trigger_update_check)

    def _setup_paths(self):
        self.project_dir = get_base_path()
        self.json_folder = self.project_dir / "job-role-json"

        # Create required directories if they don't exist
        self.json_folder.mkdir(exist_ok=True)
        (self.project_dir / "xelatex-resume").mkdir(exist_ok=True)

    def _setup_ui(self):
        self.setWindowTitle("Resume Generator")

        # Fit window to available screen — important for laptops / low-res displays.
        screen = QApplication.primaryScreen().availableGeometry()
        win_w = min(UIConfig.WIDTH, screen.width())
        win_h = min(UIConfig.HEIGHT, screen.height())
        # Minimum size: small enough to always fit, but large enough to be usable.
        self.setMinimumSize(min(800, screen.width()), min(600, screen.height()))
        self.resize(win_w, win_h)
        # Center on screen
        self.move(
            screen.x() + (screen.width() - win_w) // 2,
            screen.y() + (screen.height() - win_h) // 2,
        )

        # Set window icon
        assets = get_resource_path("assets")
        icon_path = (
            assets / "cv.ico" if (assets / "cv.ico").exists() else assets / "cv.png"
        )
        if icon_path.exists():
            self.setWindowIcon(QIcon(str(icon_path)))

        # Central widget
        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(
            UIConfig.PAD_OUTER,
            UIConfig.PAD_OUTER,
            UIConfig.PAD_OUTER,
            6,
        )
        main_layout.setSpacing(UIConfig.PAD_SECTION)

        # ── Update notification banner (hidden until an update is found) ──
        self._update_bar = QFrame()
        self._update_bar.setObjectName("updateBar")
        self._update_bar.setVisible(False)
        _bar_layout = QHBoxLayout(self._update_bar)
        _bar_layout.setContentsMargins(12, 6, 12, 6)
        _bar_layout.setSpacing(8)
        self._update_label = QLabel()
        self._update_label.setObjectName("updateLabel")
        _bar_layout.addWidget(self._update_label, stretch=1)
        self._update_download_btn = QPushButton("Download")
        self._update_download_btn.setObjectName("updateDownloadBtn")
        self._update_download_btn.setFixedHeight(24)
        _bar_layout.addWidget(self._update_download_btn)
        _dismiss_btn = QPushButton("Dismiss")
        _dismiss_btn.setObjectName("updateDismissBtn")
        _dismiss_btn.setFixedHeight(24)
        _dismiss_btn.clicked.connect(lambda: self._update_bar.setVisible(False))
        _bar_layout.addWidget(_dismiss_btn)
        main_layout.addWidget(self._update_bar)

        self.tabs = QTabWidget()
        main_layout.addWidget(self.tabs)

        self.template_tab = TemplateTab(self.file_manager)
        self.template_tab.edit_requested.connect(self.load_template_for_editing)
        self.template_tab.refresh_requested.connect(self.refresh_templates)
        self.tabs.addTab(
            self.template_tab, get_icon(UIConfig.ICON_TEMPLATE), "From Template"
        )

        self.quick_tab = QuickCreateTab()
        self.quick_tab.save_requested.connect(self.save_quick_template)
        self.quick_tab.validate_requested.connect(self.validate_json)
        self.tabs.addTab(self.quick_tab, get_icon(UIConfig.ICON_QUICK), "Quick Create")

        self.form_tab = FormEditorTab()
        self.form_tab.load_requested.connect(self._form_load_template)
        self.form_tab.save_requested.connect(self._form_save_to_file)
        self.form_tab.save_and_generate_requested.connect(self._form_save_and_generate)
        self.form_tab.open_folder_requested.connect(self.open_output_folder)
        self.tabs.addTab(self.form_tab, get_icon(UIConfig.ICON_EDIT), "Form Editor")

        self.prompt_tab = PromptTab()
        self.tabs.addTab(self.prompt_tab, get_icon(UIConfig.ICON_QUICK), "Prompt")

        self.library_tab = LibraryTab(LibraryService(self.json_folder))
        self.tabs.addTab(self.library_tab, get_icon(UIConfig.ICON_LIBRARY), "Library")

        # Bottom Panel
        self.generate_panel = QWidget()
        panel_layout = QVBoxLayout(self.generate_panel)
        panel_layout.setContentsMargins(0, 0, 0, 0)
        panel_layout.setSpacing(4)

        # Separator
        line = QFrame()
        line.setFrameShape(QFrame.HLine)
        line.setFrameShadow(QFrame.Sunken)
        panel_layout.addWidget(line)

        # Action Section
        self.action_panel = ActionPanelWidget()
        self.action_panel.generate_requested.connect(self.generate_resume)
        self.action_panel.open_folder_requested.connect(self.open_output_folder)
        panel_layout.addWidget(self.action_panel)

        # Log + Progress container (opt-in via show_log_panel)
        self._log_container = QWidget()
        log_container_layout = QVBoxLayout(self._log_container)
        log_container_layout.setContentsMargins(0, 0, 0, 0)
        log_container_layout.setSpacing(2)

        # Inline progress row (shown only during generation)
        self._progress_row = QWidget()
        self._progress_row.setObjectName("progressOverlay")
        progress_row_layout = QHBoxLayout(self._progress_row)
        progress_row_layout.setContentsMargins(10, 4, 10, 4)
        progress_row_layout.setSpacing(8)

        self._progress_label = QLabel("Generating…")
        self._progress_label.setObjectName("progressLabel")
        progress_row_layout.addWidget(self._progress_label)

        self._progress_bar = QProgressBar()
        self._progress_bar.setObjectName("generationProgress")
        self._progress_bar.setRange(0, 100)
        self._progress_bar.setValue(0)
        self._progress_bar.setFixedHeight(10)
        self._progress_bar.setFixedWidth(180)
        self._progress_bar.setTextVisible(False)
        progress_row_layout.addWidget(self._progress_bar)

        self._progress_row.setFixedHeight(22)
        self._progress_label.setVisible(False)
        self._progress_bar.setVisible(False)

        self.log_panel = LogPanel()
        log_container_layout.addWidget(self.log_panel)

        panel_layout.addWidget(self._log_container)
        panel_layout.addWidget(self._progress_row, 0, Qt.AlignmentFlag.AlignRight)

        main_layout.addWidget(self.generate_panel)

        self.tabs.currentChanged.connect(self._on_tab_changed)

    def _on_tab_changed(self, index):
        widget = self.tabs.widget(index)
        show_action = getattr(widget, "show_action_panel", True)
        show_log = getattr(widget, "show_log_panel", True)
        self.action_panel.setVisible(show_action)
        self._log_container.setVisible(show_log)
        self.generate_panel.setVisible(show_action or show_log)
        if index == 0:
            self.refresh_templates()

    def show_message(self, message: str, level: str = "info"):
        """Show message box."""
        msg = QMessageBox(self)
        msg.setWindowTitle("Information" if level == "info" else level.capitalize())
        msg.setText(message)

        icon_map = {
            "info": QMessageBox.Icon.Information,
            "success": QMessageBox.Icon.Information,
            "warning": QMessageBox.Icon.Warning,
            "error": QMessageBox.Icon.Critical,
        }
        msg.setIcon(icon_map.get(level, QMessageBox.Icon.Information))
        msg.exec()

    # --- Actions ---

    def refresh_templates(self):
        try:
            templates = self.file_manager.list_templates()
            self.template_tab.update_templates(templates)
            self.log_panel.append_message(
                f"Found {len(templates)} template(s)", "success"
            )
        except Exception as e:
            self.show_message(f"Failed to load templates: {e}", "error")

    def load_template_for_editing(self, filename: str):
        try:
            data = self.file_manager.load_template(filename)
            self.form_tab.populate(Path(filename).stem, data)
            self.tabs.setCurrentIndex(2)
            self.log_panel.append_message(
                f"Loaded into Form Editor: {filename}", "success"
            )
        except Exception as e:
            self.show_message(f"Failed to load template: {e}", "error")

    def save_quick_template(self, name: str, json_text: str):
        import json

        if not name:
            self.show_message("Please enter a resume name", "warning")
            return
        try:
            data = json.loads(json_text)
            filename = f"{name}.json"

            if (
                self.file_manager.template_exists(filename)
                and not self.quick_tab.current_editing_file
            ):
                reply = QMessageBox.question(
                    self,
                    "File Exists",
                    f"File '{filename}' already exists.\n\nOverwrite it?",
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                    QMessageBox.StandardButton.No,
                )
                if reply == QMessageBox.StandardButton.No:
                    return

            self.file_manager.save_template(filename, data)
            self.show_message(f"Template saved: {filename}", "success")
            self.log_panel.append_message(f"Saved template: {filename}", "success")
            self.refresh_templates()

        except json.JSONDecodeError as e:
            self.quick_tab.json_editor.set_error_line(e.lineno)
            self.show_message(f"Cannot save invalid JSON: {str(e)}", "error")
        except Exception as e:
            self.show_message(f"Failed to save template: {e}", "error")

    def validate_json(self, json_text: str):
        import json

        if not json_text:
            self.show_message("No JSON data to validate", "warning")
            return
        try:
            data = json.loads(json_text)
            self.quick_tab.json_editor.clear_error()
            key_count = len(data) if isinstance(data, dict) else "N/A"
            self.show_message(f"JSON is valid! ✓ {key_count} top-level keys", "success")
            self.log_panel.append_message("JSON validation passed ✓", "success")
        except json.JSONDecodeError as e:
            self.quick_tab.json_editor.set_error_line(e.lineno)
            self.show_message(f"Invalid JSON: {str(e)}", "error")
            self.log_panel.append_message(f"JSON validation failed: {str(e)}", "error")

    # --- Form Tab Actions ---

    def _form_load_template(self):
        import json
        from PySide6.QtWidgets import QFileDialog

        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Choose a resume JSON file",
            str(self.json_folder),
            "JSON Files (*.json);;All Files (*)",
        )
        if file_path:
            try:
                path = Path(file_path)
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.form_tab.populate(path.stem, data)
                self.tabs.setCurrentIndex(2)
                self.log_panel.append_message(
                    f"Loaded into Form Editor: {path.name}", "success"
                )
            except Exception as e:
                self.show_message(f"Failed to load template: {e}", "error")

    def _form_save_to_file(self, name: str, data: dict) -> bool:
        if not name:
            self.show_message(
                "Please enter a resume name at the top of the Form Editor.", "warning"
            )
            return False
        try:
            filename = f"{name}.json"
            self.file_manager.save_template(filename, data)
            self.refresh_templates()
            self.log_panel.append_message(f"Form saved → {filename}", "success")
            return True
        except Exception as e:
            self.show_message(f"Failed to save: {e}", "error")
            return False

    def _form_save_and_generate(self, name: str, data: dict, style_config: dict):
        if self._form_save_to_file(name, data):
            self.generate_resume(style_params=style_config)

    # --- Generation ---

    @asyncSlot()
    async def generate_resume(self, style_params: dict = None):
        if self.is_generating:
            return

        # Fallback to default params if raw generate button triggered without styles mapped
        if not style_params:
            self.action_panel._on_generate_clicked()
            return

        current_widget = self.tabs.currentWidget()
        if not hasattr(current_widget, "get_resume_data"):
            self.show_message("Active tab does not support generation", "warning")
            return

        try:
            resume_name, json_data = current_widget.get_resume_data()
        except ValueError as e:
            self.show_message(str(e), "warning")
            return
        except Exception as e:
            self.show_message(f"Error reading resume data: {str(e)}", "error")
            return

        # Save the dict to a file so GenerationWorker has a concrete Path
        try:
            filename = f"{resume_name}.json"
            json_path = self.file_manager.save_template(filename, json_data)
        except Exception as e:
            self.show_message(f"Failed to prepare JSON file: {e}", "error")
            return

        self.is_generating = True
        self.action_panel.set_generating_state(True)
        self.log_panel.clear_log()

        self.worker = AsyncGenerationWorker(
            self.project_dir,
            json_path,
            "xelatex",
            resume_name,
            generate_fn=_generate_resume,  # DIP: inject the IResumeGenerator callable
            style_params=style_params,
        )
        self.worker.log_message.connect(self.log_panel.append_message)
        self.worker.progress_update.connect(self._on_progress_update)
        self.worker.finished.connect(self.on_generation_finished)
        self._progress_bar.setValue(0)
        self._progress_label.setText("Generating…")
        self._progress_label.setVisible(True)
        self._progress_bar.setVisible(True)
        await self.worker.run()

    def _on_progress_update(self, value: int):
        self._progress_bar.setValue(value)

    def on_generation_finished(self, success: bool, message: str):
        self.is_generating = False
        self.action_panel.set_generating_state(False)

        self._progress_bar.setValue(100)
        self._progress_label.setText("✅ Done" if success else "❌ Failed")
        QTimer.singleShot(3000, self._hide_progress_row)

        if success:
            self.show_message("Resume generated successfully!", "success")
        else:
            self.show_message(f"Generation failed:\n{message}", "error")

    def _hide_progress_row(self):
        self._progress_label.setVisible(False)
        self._progress_bar.setVisible(False)
        self._progress_bar.setValue(0)

    def open_output_folder(self):
        import os, platform
        import subprocess

        output_folder = self.project_dir / "xelatex-resume"
        output_folder.mkdir(exist_ok=True)

        path = str(output_folder)
        try:
            if platform.system() == "Windows":
                os.startfile(path)
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", path])
            else:
                subprocess.Popen(["xdg-open", path])
        except Exception as e:
            self.show_message(f"Could not open folder: {e}", "error")

    # ── Update checker ────────────────────────────────────────────────────────

    def _trigger_update_check(self):
        """Kick off the async update check from a QTimer callback."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(self._check_for_update())
        except Exception:
            pass

    async def _check_for_update(self):
        """Fetch latest GitHub release; show banner if a newer version exists."""
        try:
            info = await check_for_update(GITHUB_REPO, APP_VERSION)
            if info:
                self._show_update_banner(info["version"], info["url"])
        except Exception:
            pass  # update check is best-effort; never crash the app

    def _show_update_banner(self, version: str, url: str):
        self._update_label.setText(
            f"<b>Update available — v{version}</b>  "
            f"(you have v{APP_VERSION}). Download the latest build from GitHub."
        )
        self._update_download_btn.clicked.connect(lambda: webbrowser.open(url))
        self._update_bar.setVisible(True)
