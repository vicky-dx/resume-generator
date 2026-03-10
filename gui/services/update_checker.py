"""Async GitHub Releases update checker.

Usage:
    from gui.services.update_checker import check_for_update
    info = await check_for_update(GITHUB_REPO, APP_VERSION)
    if info:
        # info = {"version": "1.2.0", "url": "https://...", "body": "..."}
"""
import asyncio
import json
import urllib.request
from typing import Optional

_GITHUB_API = "https://api.github.com/repos/{repo}/releases/latest"


def _fetch_latest(repo: str) -> Optional[dict]:
    """Blocking fetch of the latest release from GitHub API (run in executor)."""
    url = _GITHUB_API.format(repo=repo)
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "ResumeGenerator/update-checker"},
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None


async def check_for_update(repo: str, current_version: str) -> Optional[dict]:
    """Return release info dict if a newer version is available, else None.

    The returned dict contains:
        version  – latest version string (e.g. "1.2.0")
        url      – GitHub release page URL
        body     – release notes markdown
    """
    loop = asyncio.get_event_loop()
    data = await loop.run_in_executor(None, _fetch_latest, repo)
    if not data:
        return None
    tag = data.get("tag_name", "").lstrip("v")
    if _version_gt(tag, current_version):
        return {
            "version": tag,
            "url": data.get("html_url", ""),
            "body": data.get("body", ""),
        }
    return None


def _version_gt(a: str, b: str) -> bool:
    """Return True if version string *a* is greater than *b* (semver-style)."""
    try:
        return tuple(int(x) for x in a.split(".")) > tuple(
            int(x) for x in b.split(".")
        )
    except ValueError:
        return False
