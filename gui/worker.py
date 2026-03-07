import asyncio
import subprocess
import sys
import traceback
from pathlib import Path
from typing import Callable
from PySide6.QtCore import QObject, Signal

from gui.config import UIConfig
from gui.logger import app_logger

# IResumeGenerator-compatible callable — see script/protocols.py.
# Injected by the caller (main_window.py) so this class never imports a
# concrete implementation directly (DIP).
GenerateFn = Callable[..., str]


class AsyncGenerationWorker(QObject):
    """
    Asyncio worker for resume generation.

    TODO (SRP): This class currently owns three concerns:
      1. Workflow orchestration (run)
      2. LaTeX compilation subprocess management (_compile_latex)
      3. Output-path resolution (_get_output_path / _prepare_json_and_paths)
    Consider extracting a LatexCompiler collaborator and a PathResolver helper
    so each class has a single reason to change.
    """

    progress_update = Signal(int)
    log_message = Signal(str, str)  # message, level
    finished = Signal(bool, str)  # success, message

    def __init__(
        self,
        project_dir,
        json_path,
        compiler,
        resume_name,
        generate_fn: GenerateFn,  # DIP: injected, not constructed here
        style_params=None,
    ):
        super().__init__()
        self.project_dir = project_dir
        self.json_path = Path(json_path)
        self.compiler = compiler
        self.resume_name = resume_name
        self._generate_fn = generate_fn  # IResumeGenerator-compatible callable
        self.style_params = style_params or {}

    async def run(self):
        """Run generation asynchronously"""
        try:
            self.progress_update.emit(UIConfig.PROGRESS_START)
            self.log_message.emit("Starting resume generation...", "info")

            # Step 1: Generate LaTeX
            self.log_message.emit("Step 1/3: Converting JSON to LaTeX...", "info")
            json_path, latex_file = self._prepare_json_and_paths()

            if not self._run_generator(json_path, latex_file):
                self.finished.emit(False, "LaTeX generation failed")
                return

            self.progress_update.emit(UIConfig.PROGRESS_LATEX_DONE)
            self.log_message.emit("LaTeX generated successfully", "success")

            # Step 2: First compilation
            self.log_message.emit("Step 2/3: First PDF compilation...", "info")
            if not await self._compile_latex(latex_file):
                self.finished.emit(False, "First compilation failed")
                return

            self.progress_update.emit(UIConfig.PROGRESS_COMPILE1_DONE)

            # Step 3: Second compilation
            self.log_message.emit("Step 3/3: Second PDF compilation...", "info")
            if not await self._compile_latex(latex_file):
                self.finished.emit(False, "Second compilation failed")
                return

            self.progress_update.emit(UIConfig.PROGRESS_COMPLETE)
            self.log_message.emit("Resume PDF generated successfully!", "success")
            self.finished.emit(True, str(self._get_output_path()))

        except Exception as e:
            app_logger.critical(
                "Unhandled error in generation worker:\n%s",
                traceback.format_exc(),
            )
            self.log_message.emit(f"Error: {str(e)}", "error")
            self.finished.emit(False, str(e))

    def _prepare_json_and_paths(self):
        """Prepare JSON file and get paths.

        TODO (SRP): path resolution is not a worker responsibility.
        Extract into a dedicated PathResolver or pass pre-resolved paths in.
        """
        output_folder = self.project_dir / f"{self.compiler}-resume"
        output_folder.mkdir(exist_ok=True)  # safety net — in case folder was deleted
        latex_file = output_folder / f"{self.resume_name}.tex"
        return self.json_path, latex_file

    def _run_generator(self, json_path, latex_file) -> bool:
        """
        Delegate to the injected generate_fn (IResumeGenerator).
        No concrete imports — the caller wired the real implementation.
        """
        try:
            self._generate_fn(
                data_file=str(json_path),
                output_file=str(latex_file),
                template_name=self.style_params.get("template_name", "classic.tex"),
                font=self.style_params.get("font", "Calibri"),
                font_size=self.style_params.get("font_size", 11.5),
                section_color=self.style_params.get("section_color", (96, 36, 191)),
                margin_tb=self.style_params.get("margin_tb", 0.5),
                margin_lr=self.style_params.get("margin_lr", 0.5),
            )
            self.log_message.emit(f"LaTeX written: {latex_file.name}", "info")
            return True
        except Exception as e:
            app_logger.error("LaTeX generator error:\n%s", traceback.format_exc())
            self.log_message.emit(f"Generator error: {e}", "error")
            return False

    async def _compile_latex(self, latex_file):
        """
        Compile LaTeX to PDF asynchronously.

        TODO (SRP): subprocess management is a separate concern from workflow
        orchestration. Consider extracting a LatexCompiler class with an async
        compile(latex_file) -> bool interface.
        """
        cmd = [
            self.compiler,
            "-interaction=nonstopmode",
            "-output-directory",
            str(latex_file.parent),
            str(latex_file),
        ]

        if sys.platform == "win32":
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(latex_file.parent),
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
        else:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(latex_file.parent),
            )

        assert process.stdout is not None  # guaranteed by stdout=PIPE
        assert process.stderr is not None  # guaranteed by stderr=PIPE

        # Print output lines in real-time as they stream in
        async for line in process.stdout:
            decoded_line = line.decode("utf-8", errors="replace").strip()
            if decoded_line and not decoded_line.startswith("("):
                self.log_message.emit(decoded_line, "info")

        # Wait for the process to fully close
        await process.wait()

        if process.returncode != 0:
            stderr_bytes = await process.stderr.read()
            stderr_text = (
                stderr_bytes.decode("utf-8", errors="replace") if stderr_bytes else ""
            )
            if stderr_text:
                app_logger.error(
                    "xelatex stderr (rc=%d) for %s:\n%s",
                    process.returncode,
                    latex_file.name,
                    stderr_text,
                )
                self.log_message.emit(stderr_text, "error")
            else:
                app_logger.error(
                    "xelatex failed (rc=%d) for %s — no stderr output",
                    process.returncode,
                    latex_file.name,
                )
            return False

        app_logger.info("xelatex OK: %s", latex_file.name)
        return True

    def _get_output_path(self):
        """Get output PDF path"""
        output_folder = self.project_dir / f"{self.compiler}-resume"
        return output_folder / f"{self.resume_name}.pdf"
