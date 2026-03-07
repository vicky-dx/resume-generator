r"""
LaTeX escaping — split into focused single-responsibility classes.

LatexCharEscaper   — maps special characters (&, %, $, …) to LaTeX equivalents
MarkupConverter    — converts **bold** / __italic__ markers to \textbf / \textit
TermProtector      — wraps protected terms in \mbox{} to prevent hyphenation
LatexEscaper       — thin orchestrator that chains the three above (IEscaper)
"""

import re
from typing import Dict, List, Set


class LatexCharEscaper:
    """Single responsibility: escape special LaTeX characters."""

    def __init__(self, char_map: Dict[str, str]):
        self._char_map = char_map

    def escape(self, text: str) -> str:
        # Protect arrow/dash sequences before generic char replacement
        text = text.replace("->", "<<<ARROW>>>")
        text = text.replace("---", "<<<EMDASH>>>")
        text = text.replace("--", "<<<ENDASH>>>")
        for ch, repl in self._char_map.items():
            text = text.replace(ch, repl)
        text = text.replace("<<<ARROW>>>", r"$\rightarrow$")
        text = text.replace("<<<ENDASH>>>", r"--")
        text = text.replace("<<<EMDASH>>>", r"---")
        return text


class MarkupConverter:
    """Single responsibility: convert **bold** / __italic__ markdown to LaTeX."""

    def __init__(self, char_map: Dict[str, str]):
        self._char_map = char_map
        self._bold_pat = re.compile(r"\*\*(.+?)\*\*")
        self._italic_pat = re.compile(r"\*([^*\n]+?)\*")

    def convert(self, text: str) -> str:
        text = self._apply(text, self._bold_pat, r"\textbf", self._italic_pat)
        text = self._apply(text, self._italic_pat, r"\textit", self._bold_pat)
        return text

    def _apply(
        self, text: str, pattern: re.Pattern, cmd: str, nested_pat: re.Pattern
    ) -> str:
        def replacer(m):
            inner = m.group(1)
            for ch, r in self._char_map.items():
                inner = inner.replace(ch, r)

            def nest(nm, _cmd=cmd):
                ni = nm.group(1)
                for ch, r in self._char_map.items():
                    ni = ni.replace(ch, r)
                other = r"\textit" if _cmd == r"\textbf" else r"\textbf"
                return f"{other}{{{ni}}}"

            inner = nested_pat.sub(nest, inner)
            return f"{cmd}{{{inner}}}"

        return pattern.sub(replacer, text)

    def extract(self, text: str, tag: str):
        """Pull markup placeholders out of text so char escaping doesn't break them."""
        mapping: Dict[str, str] = {}

        def sub(m):
            key = f"<<<{tag}{len(mapping)}>>>"
            mapping[key] = m.group(1)
            return key

        pattern = self._bold_pat if tag == "BOLD" else self._italic_pat
        return pattern.sub(sub, text), mapping

    def restore(
        self, text: str, mapping: Dict[str, str], cmd: str, nested_pat: re.Pattern
    ) -> str:
        for placeholder, inner in mapping.items():
            for ch, r in self._char_map.items():
                inner = inner.replace(ch, r)

            def nest(nm, _cmd=cmd):
                ni = nm.group(1)
                for ch, r in self._char_map.items():
                    ni = ni.replace(ch, r)
                other = r"\textit" if _cmd == r"\textbf" else r"\textbf"
                return f"{other}{{{ni}}}"

            inner = nested_pat.sub(nest, inner)
            text = text.replace(placeholder, f"{cmd}{{{inner}}}")
        return text


class TermProtector:
    """Single responsibility: wrap protected terms in \\mbox{} to prevent hyphenation."""

    def __init__(self, terms: List[str], track: bool = False):
        self.track = track
        self.found: Set[str] = set()
        self._patterns = [(re.compile(re.escape(t), re.IGNORECASE), t) for t in terms]

    def protect(self, text: str) -> tuple[str, Dict[str, str]]:
        """Replace protected terms with placeholders; return text + mapping."""
        mapping: Dict[str, str] = {}
        for i, (pat, term) in enumerate(self._patterns):
            matches = pat.findall(text)
            if matches:
                placeholder = f"<<<TERM{i}>>>"
                mapping[placeholder] = matches[0]
                text = pat.sub(placeholder, text)
                if self.track:
                    self.found.add(matches[0])
        return text, mapping

    def restore(self, text: str, mapping: Dict[str, str]) -> str:
        for placeholder, original in mapping.items():
            text = text.replace(placeholder, r"\mbox{" + original + "}")
        return text


class LatexEscaper:
    """
    IEscaper implementation.
    Orchestrates LatexCharEscaper, MarkupConverter, and TermProtector
    to produce LaTeX-safe output from raw user text.
    """

    def __init__(
        self,
        char_escaper: LatexCharEscaper,
        markup_converter: MarkupConverter,
        term_protector: TermProtector,
    ):
        self._char = char_escaper
        self._markup = markup_converter
        self._terms = term_protector

    @property
    def protected_found(self) -> Set[str]:
        return self._terms.found

    def escape(self, text: str) -> str:
        if not isinstance(text, str):
            return text

        # 1. Extract markup and terms so char escaping doesn't corrupt them
        text, bold_map = self._markup.extract(text, "BOLD")
        text, italic_map = self._markup.extract(text, "ITALIC")
        text, term_map = self._terms.protect(text)

        # 2. Escape special characters
        text = self._char.escape(text)

        # 3. Restore protected terms as \mbox{}
        text = self._terms.restore(text, term_map)

        # 4. Restore markup as \textbf / \textit
        bold_pat = self._markup._bold_pat
        italic_pat = self._markup._italic_pat
        text = self._markup.restore(text, bold_map, r"\textbf", italic_pat)
        text = self._markup.restore(text, italic_map, r"\textit", bold_pat)

        return text
