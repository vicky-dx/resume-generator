"""
Default configuration constants and factory helpers.
"""

from typing import Dict, List
from script.escaper import (
    LatexCharEscaper,
    MarkupConverter,
    TermProtector,
    LatexEscaper,
)


DEFAULT_PROTECTED_TERMS: List[str] = [
    "Kubernetes",
    "Docker",
    "Terraform",
    "Airflow",
    "Kafka",
    "Spark",
    "Redshift",
    "PostgreSQL",
    "MongoDB",
    "FastAPI",
    "XGBoost",
    "LightGBM",
    "Snowflake",
    "Grafana",
    "Prometheus",
    "Jenkins",
    "GitHub",
    "GitLab",
    "Tableau",
    "Streamlit",
    "Boto3",
    "Python",
    "JavaScript",
    "TypeScript",
    "auto-scaling",
    "ETL",
    "GenAI",
    "LLMs",
    "ChatGPT",
    "OpenAI",
    "machine learning",
    "deep learning",
    "data engineering",
    "MLOps",
    "microservices",
    "serverless",
    "real-time",
    "end-to-end",
]

DEFAULT_CHAR_MAP: Dict[str, str] = {
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "{": r"\{",
    "}": r"\}",
    "~": r"\textasciitilde{}",
    "^": r"\^{}",
}


def build_default_escaper(track_protected: bool = True) -> LatexEscaper:
    """Factory: wire up the default LatexEscaper from standard config."""
    char_escaper = LatexCharEscaper(DEFAULT_CHAR_MAP)
    markup_converter = MarkupConverter(DEFAULT_CHAR_MAP)
    term_protector = TermProtector(DEFAULT_PROTECTED_TERMS, track=track_protected)
    return LatexEscaper(char_escaper, markup_converter, term_protector)
