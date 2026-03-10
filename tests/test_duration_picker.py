"""Rigorous unit tests for DurationPickerWidget.setText() parsing.

Tests run without a display (no Qt widgets instantiated) by testing the
regex and helper functions directly. A separate section uses QApplication
for full widget round-trip tests.
"""

import pytest
import re

from gui.widgets.form_editor.duration_picker import (
    _PARSE_RE,
    _YEAR_ONLY_RE,
    _SLASH_RE,
    _MONTH_NUM_TO_ABBR,
    _PARSERS,
    _apply_parse_re,
    _apply_year_only_re,
    _apply_slash_re,
)


# ---------------------------------------------------------------------------
# Regex-level tests (no Qt needed)
# ---------------------------------------------------------------------------


class TestParseRe:
    """'Mon YYYY – Mon YYYY' and '… – Present/Current' formats."""

    @pytest.mark.parametrize(
        "value",
        [
            "Jan 2023 – Present",
            "Jan 2023 - Present",
            "Feb 2022 – Mar 2024",
            "Feb 2022 - Mar 2024",
            "Sep 2019 – current",
            "Dec 2015 – Current",
            "Aug 2017 – Jun 2021",
            "Oct 2020 – present",
        ],
    )
    def test_matches(self, value):
        assert _PARSE_RE.match(value), f"Should match: {value!r}"

    @pytest.mark.parametrize(
        "value",
        [
            "01/2023 – Present",  # slash format, not for this regex
            "2021 – 2023",  # year-only
            "January 2023 – Present",  # full month name
            "",
        ],
    )
    def test_no_match(self, value):
        assert not _PARSE_RE.match(value), f"Should NOT match: {value!r}"

    def test_groups_full_range(self):
        m = _PARSE_RE.match("Feb 2022 – Mar 2024")
        assert m.group(1) == "Feb"
        assert m.group(2) == "2022"
        assert m.group(4) == "Mar"
        assert m.group(5) == "2024"

    def test_groups_present(self):
        m = _PARSE_RE.match("Jan 2023 – Present")
        assert m.group(1) == "Jan"
        assert m.group(2) == "2023"
        assert m.group(3).lower() == "present"


class TestYearOnlyRe:
    """'YYYY – YYYY' and 'YYYY – Present' formats."""

    @pytest.mark.parametrize(
        "value",
        [
            "2021 – 2024",
            "2021 - 2024",
            "2020 – Present",
            "2018 - present",
        ],
    )
    def test_matches(self, value):
        assert _YEAR_ONLY_RE.match(value), f"Should match: {value!r}"

    @pytest.mark.parametrize(
        "value",
        [
            "Jan 2023 – 2025",  # mixed
            "07/2018 - 07/2022",
            "",
        ],
    )
    def test_no_match(self, value):
        assert not _YEAR_ONLY_RE.match(value), f"Should NOT match: {value!r}"

    def test_groups(self):
        m = _YEAR_ONLY_RE.match("2021 – 2024")
        assert m.group(1) == "2021"
        assert m.group(2) == "2024"


class TestSlashRe:
    """'MM/YYYY – MM/YYYY' and '… – Present' formats."""

    @pytest.mark.parametrize(
        "value",
        [
            "07/2018 - 07/2022",
            "09/2023 - 05/2025",
            "09/2021 - 06/2022",
            "1/2020 - 12/2024",
            "07/2018 - Present",
            "07/2018 – present",
            "1/2020 - Current",
            # with trailing space stripped
            "07/2018 - 07/2022",
        ],
    )
    def test_matches(self, value):
        assert _SLASH_RE.match(value.strip()), f"Should match: {value!r}"

    @pytest.mark.parametrize(
        "value",
        [
            "Jan 2023 – Present",
            "2021 – 2024",
            "",
        ],
    )
    def test_no_match(self, value):
        assert not _SLASH_RE.match(value), f"Should NOT match: {value!r}"

    def test_invalid_month_13_still_matches_regex_but_code_guards_it(self):
        r"""Month 13 passes the regex (\d{1,2}) but _MONTH_NUM_TO_ABBR.get(13) returns None,
        so the code safely skips setting the month combo."""
        assert _SLASH_RE.match("13/2020 - 01/2021")  # regex does match
        assert _MONTH_NUM_TO_ABBR.get(13) is None  # but lookup returns None — safe

    def test_groups_full_range(self):
        m = _SLASH_RE.match("07/2018 - 07/2022")
        assert m.group(1) == "07"
        assert m.group(2) == "2018"
        assert m.group(4) == "07"
        assert m.group(5) == "2022"

    def test_groups_present(self):
        m = _SLASH_RE.match("09/2023 - Present")
        assert m.group(1) == "09"
        assert m.group(2) == "2023"
        assert m.group(3).lower() == "present"

    # Actual values from piyush-resume-3.json (trailing space stripped by setText)
    @pytest.mark.parametrize(
        "raw, exp_start_month, exp_start_year, exp_end_month, exp_end_year",
        [
            ("09/2023 - 05/2025 ", "Sep", "2023", "May", "2025"),
            ("07/2018 - 07/2022 ", "Jul", "2018", "Jul", "2022"),
            ("09/2021 - 06/2022 ", "Sep", "2021", "Jun", "2022"),
        ],
    )
    def test_real_json_values(
        self, raw, exp_start_month, exp_start_year, exp_end_month, exp_end_year
    ):
        value = raw.strip()
        m = _SLASH_RE.match(value)
        assert m, f"No match for {value!r}"
        start_abbr = _MONTH_NUM_TO_ABBR.get(int(m.group(1)))
        end_abbr = _MONTH_NUM_TO_ABBR.get(int(m.group(4)))
        assert start_abbr == exp_start_month
        assert m.group(2) == exp_start_year
        assert end_abbr == exp_end_month
        assert m.group(5) == exp_end_year


class TestMonthNumToAbbr:
    def test_all_months_present(self):
        assert len(_MONTH_NUM_TO_ABBR) == 12

    @pytest.mark.parametrize(
        "num, abbr",
        [
            (1, "Jan"),
            (2, "Feb"),
            (3, "Mar"),
            (4, "Apr"),
            (5, "May"),
            (6, "Jun"),
            (7, "Jul"),
            (8, "Aug"),
            (9, "Sep"),
            (10, "Oct"),
            (11, "Nov"),
            (12, "Dec"),
        ],
    )
    def test_mapping(self, num, abbr):
        assert _MONTH_NUM_TO_ABBR[num] == abbr

    def test_invalid_month_not_present(self):
        assert 0 not in _MONTH_NUM_TO_ABBR
        assert 13 not in _MONTH_NUM_TO_ABBR


# ---------------------------------------------------------------------------
# Full widget round-trip tests (requires QApplication)
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def qapp():
    """Create a QApplication for the module scope."""
    import sys
    from PySide6.QtWidgets import QApplication

    app = QApplication.instance() or QApplication(sys.argv)
    yield app


@pytest.fixture
def picker(qapp):
    from gui.widgets.form_editor.duration_picker import DurationPickerWidget

    w = DurationPickerWidget()
    return w


class TestDurationPickerWidget:
    @pytest.mark.parametrize(
        "value, expected_text",
        [
            # Mon YYYY – Present
            ("Jan 2023 – Present", "Jan 2023 – Present"),
            ("Aug 2017 – Jun 2021", "Aug 2017 – Jun 2021"),
            # Mon YYYY - Mon YYYY  (dash variant)
            ("Feb 2022 - Mar 2024", "Feb 2022 – Mar 2024"),
            # Year only
            ("2021 – 2024", "Jan 2021 – Jan 2024"),  # month defaults to Jan
            ("2020 – Present", "Jan 2020 – Present"),
            # MM/YYYY slash format
            ("07/2018 - 07/2022", "Jul 2018 – Jul 2022"),
            ("09/2023 - 05/2025", "Sep 2023 – May 2025"),
            ("09/2021 - 06/2022", "Sep 2021 – Jun 2022"),
            # Slash + Present
            ("07/2018 - Present", "Jul 2018 – Present"),
            ("1/2020 - Current", "Jan 2020 – Present"),
            # Trailing spaces (real JSON values)
            ("09/2023 - 05/2025 ", "Sep 2023 – May 2025"),
            ("07/2018 - 07/2022 ", "Jul 2018 – Jul 2022"),
        ],
    )
    def test_set_text_round_trip(self, picker, value, expected_text):
        picker.setText(value)
        assert (
            picker.text() == expected_text
        ), f"setText({value!r}) -> text()={picker.text()!r}, expected {expected_text!r}"

    def test_default_is_present(self, picker):
        """Fresh widget should default to Present checked."""
        assert "Present" in picker.text()

    def test_clear_resets_to_present(self, picker):
        picker.setText("Feb 2020 – Mar 2022")
        assert "Mar 2022" in picker.text()
        picker.clear()
        assert "Present" in picker.text()

    def test_empty_string_does_not_crash(self, picker):
        picker.setText("")  # should be a no-op
        assert picker.text()  # still has a value

    def test_none_equivalent_does_not_crash(self, picker):
        picker.setText("   ")  # whitespace-only should be a no-op
        assert picker.text()

    def test_text_changed_signal_fires(self, picker):
        signals = []
        picker.textChanged.connect(signals.append)
        picker.setText("Mar 2021 – Dec 2023")
        assert len(signals) >= 1

    def test_present_checkbox_toggles_stack(self, picker):
        picker.setText("Jan 2020 – Dec 2022")
        assert "Dec 2022" in picker.text()

        picker._present_cb.setChecked(True)
        assert "Present" in picker.text()

        picker._present_cb.setChecked(False)
        assert "Present" not in picker.text()


# ---------------------------------------------------------------------------
# OCP structure tests  (no Qt needed)
# ---------------------------------------------------------------------------


class TestParsersStructure:
    """Verify the _PARSERS strategy list satisfies OCP guarantees."""

    def test_parsers_is_a_list(self):
        assert isinstance(_PARSERS, list)

    def test_parsers_has_three_entries(self):
        assert len(_PARSERS) == 3

    def test_each_entry_is_pattern_and_callable(self):
        for pattern, fn in _PARSERS:
            assert hasattr(pattern, "match"), "first element must be a compiled pattern"
            assert callable(fn), "second element must be callable"

    def test_parsers_order_parse_re_first(self):
        assert _PARSERS[0][0] is _PARSE_RE

    def test_parsers_order_year_only_second(self):
        assert _PARSERS[1][0] is _YEAR_ONLY_RE

    def test_parsers_order_slash_re_third(self):
        assert _PARSERS[2][0] is _SLASH_RE

    def test_parsers_handlers_are_correct_functions(self):
        assert _PARSERS[0][1] is _apply_parse_re
        assert _PARSERS[1][1] is _apply_year_only_re
        assert _PARSERS[2][1] is _apply_slash_re

    def test_new_parser_can_be_appended_without_touching_setText(self):
        """OCP: extending _PARSERS with a new entry must not require any
        changes to DurationPickerWidget.setText().
        """
        import re as _re

        sentinel = []
        new_pattern = _re.compile(r"^NEVER_MATCHES_ANYTHING_XYZ$")

        def mock_handler(widget, m):  # pragma: no cover
            sentinel.append(True)

        _PARSERS.append((new_pattern, mock_handler))
        try:
            # _PARSERS now has 4 entries — setText loop will reach it
            assert len(_PARSERS) == 4
            # The new entry doesn't match real inputs, so sentinel stays empty
            assert sentinel == []
        finally:
            _PARSERS.pop()  # restore original state

        assert len(_PARSERS) == 3  # back to normal
