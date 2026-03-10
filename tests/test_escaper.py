import pytest

from script.escaper import LatexCharEscaper, TermProtector, LatexEscaper


def test_char_escaper_basic_symbols(char_escaper):
    text = "Find 100% of the cost & save $50_000 #deals {amazing}"
    escaped = char_escaper.escape(text)
    
    # Assert each character mapped successfully
    assert r"\%" in escaped
    assert r"\&" in escaped
    assert r"\$" in escaped
    assert r"\_" in escaped
    assert r"\#" in escaped
    assert r"\{" in escaped
    assert r"\}" in escaped


def test_char_escaper_arrows_and_dashes(char_escaper):
    text = "Before -> After and range 10--20 or long break---done"
    escaped = char_escaper.escape(text)
    
    assert r"$\rightarrow$" in escaped
    assert r"--" in escaped
    assert r"---" in escaped
    # Ensure they didn't get accidentally corrupted by other character escaping
    assert "Before $\\rightarrow$ After" in escaped
    assert "range 10--20" in escaped
    assert "break---done" in escaped


def test_char_escaper_tilde_and_caret(char_escaper):
    text = "Visit example~org and version 2^32"
    escaped = char_escaper.escape(text)
    assert r"\textasciitilde{}" in escaped
    assert r"\textasciicircum{}" in escaped


def test_char_escaper_backslash(char_escaper):
    text = r"Use \n for newlines"
    escaped = char_escaper.escape(text)
    # \ is replaced by \textbackslash{} first; then { and } in that
    # replacement are also escaped, producing \textbackslash\{\}
    assert r"\textbackslash\{\}" in escaped


def test_markup_converter_no_markup_passthrough(markup_converter):
    text = "Plain text with no markers."
    assert markup_converter.convert(text) == text


def test_markup_converter_bold(markup_converter):
    text = "This is a **bold** statement."
    converted = markup_converter.convert(text)
    assert converted == r"This is a \textbf{bold} statement."


def test_markup_converter_bold_with_special_char(markup_converter):
    """Special chars inside bold markers must be escaped, not left raw."""
    text = "**cost & time**"
    converted = markup_converter.convert(text)
    assert converted == r"\textbf{cost \& time}"


def test_markup_converter_italic(markup_converter):
    text = "This is an *italic* word."
    converted = markup_converter.convert(text)
    assert converted == r"This is an \textit{italic} word."





def test_term_protector_wrapping(term_protector):
    text = "Experience with AWS and API design."
    protected_text, mapping = term_protector.protect(text)
    
    assert "<<<TERM0>>>" in protected_text
    assert "<<<TERM1>>>" in protected_text
    
    restored = term_protector.restore(protected_text, mapping)
    assert restored == r"Experience with \mbox{AWS} and \mbox{API} design."


def test_term_protector_case_insensitive(term_protector):
    text = "Using aws tools."
    protected_text, mapping = term_protector.protect(text)
    assert "<<<TERM0>>>" in protected_text
    restored = term_protector.restore(protected_text, mapping)
    assert restored == r"Using \mbox{aws} tools."


def test_term_protector_term_not_present(term_protector):
    """Text with no protected terms must come back unchanged."""
    text = "Worked on a web project."
    protected_text, mapping = term_protector.protect(text)
    assert mapping == {}
    assert protected_text == text


def test_term_protector_tracking(protected_terms, char_map):
    """track=True populates .found with the matched term strings."""
    tp = TermProtector(protected_terms, track=True)
    text = "Deployed using AWS and GCP."
    _, mapping = tp.protect(text)
    tp.restore(_, mapping)
    assert "AWS" in tp.found
    assert "GCP" in tp.found


def test_latex_escaper_integration(latex_escaper):
    text = "Built a **serverless** pipeline on AWS moving 100% -> 200% data *fast*."
    final = latex_escaper.escape(text)
    
    # Check all independent logic executed cleanly across the full chain
    assert r"\textbf{serverless}" in final
    assert r"\mbox{AWS}" in final
    assert r"100\% $\rightarrow$ 200\%" in final
    assert r"\textit{fast}" in final


def test_latex_escaper_non_string_passthrough(latex_escaper):
    """Non-string values (e.g. from optional JSON fields) must be returned as-is."""
    assert latex_escaper.escape(42) == 42
    assert latex_escaper.escape(None) is None


def test_latex_escaper_empty_string(latex_escaper):
    assert latex_escaper.escape("") == ""


def test_latex_escaper_protected_found_populated(char_map, protected_terms):
    """protected_found is only populated when track=True is passed to TermProtector."""
    from script.escaper import LatexCharEscaper, MarkupConverter, TermProtector, LatexEscaper
    tp = TermProtector(protected_terms, track=True)
    escaper = LatexEscaper(LatexCharEscaper(char_map), MarkupConverter(char_map), tp)
    escaper.escape("Deployed on AWS and GCP infrastructure.")
    assert "AWS" in escaper.protected_found
    assert "GCP" in escaper.protected_found
