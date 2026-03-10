"""
ResumeGeneratorService — owns orchestration and file I/O.
High-level policy; depends only on abstractions (IDocumentBuilder, IEscaper).
"""

import json
from pathlib import Path

from core.models import ResumeData
from script.protocols import IDocumentBuilder, IEscaper


class ResumeGeneratorService:
    """
    Single responsibility: coordinate reading JSON → building LaTeX → writing file.
    No knowledge of Jinja2, escaping details, or style parameters.
    """

    def __init__(self, builder: IDocumentBuilder, escaper: IEscaper):
        self._builder = builder
        self._escaper = escaper

    def generate(self, data_file: str, output_file: str) -> str:
        """
        Load JSON data, render to LaTeX via the builder, write to output_file.
        Returns the output file path string.
        """
        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        data = ResumeData.model_validate(data).model_dump(by_alias=True)

        latex_content = self._builder.build(data)

        with open(output_file, "w", encoding="utf-8") as f:
            f.write(latex_content)

        return output_file
