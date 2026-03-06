import pytest

from script.escaper import LatexCharEscaper, MarkupConverter, TermProtector, LatexEscaper


@pytest.fixture
def char_map():
    return {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }


@pytest.fixture
def protected_terms():
    return ["AWS", "API", "GCP", "SQL", "NoSQL", "CI/CD", "SaaS"]


@pytest.fixture
def char_escaper(char_map):
    return LatexCharEscaper(char_map)


@pytest.fixture
def markup_converter(char_map):
    return MarkupConverter(char_map)


@pytest.fixture
def term_protector(protected_terms):
    return TermProtector(protected_terms, track=False)


@pytest.fixture
def latex_escaper(char_escaper, markup_converter, term_protector):
    return LatexEscaper(char_escaper, markup_converter, term_protector)
