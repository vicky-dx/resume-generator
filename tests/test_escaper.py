import pytest

from script.escaper import LatexCharEscaper


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


def test_markup_converter_bold(markup_converter):
    text = "This is a **bold** statement."
    converted = markup_converter.convert(text)
    assert converted == r"This is a \textbf{bold} statement."


def test_markup_converter_italic(markup_converter):
    text = "This is an __italic__ word."
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


def test_latex_escaper_integration(latex_escaper):
    text = "Built a **serverless** pipeline on AWS moving 100% -> 200% data __fast__."
    final = latex_escaper.escape(text)
    
    # Check all independent logic executed cleanly across the full chain
    assert r"\textbf{serverless}" in final
    assert r"\mbox{AWS}" in final
    assert r"100\% $\rightarrow$ 200\%" in final
    assert r"\textit{fast}" in final
