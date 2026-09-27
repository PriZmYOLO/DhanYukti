"""E16 — confidence labels (pakka / andaaza / pata_nahi)."""
from __future__ import annotations


def grade(*, source: str = "aa", months_seen: int = 0, estimated: bool = False, unknown: bool = False) -> str:
    if unknown:
        return "pata_nahi"
    if estimated or source == "declared" or months_seen < 3:
        return "andaaza"
    return "pakka"


def combine(*labels: str) -> str:
    order = {"pakka": 0, "andaaza": 1, "pata_nahi": 2}
    return max(labels, key=lambda x: order[x]) if labels else "pata_nahi"
