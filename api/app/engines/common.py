"""Shared helpers: paise arithmetic, Indian rupee formatting, bilingual strings, dates."""
from __future__ import annotations

from datetime import date, timedelta


def P(rupees: float | int) -> int:
    """Rupees -> integer paise."""
    return int(round(rupees * 100))


def R(paise: int) -> int:
    """Integer paise -> integer rupees (round half away from zero)."""
    if paise >= 0:
        return (paise + 50) // 100
    return -((-paise + 50) // 100)


def L(hi: str, en: str) -> dict:
    return {"hi": hi, "en": en}


def inr(rupees: int | float) -> str:
    """Indian digit grouping: 150000 -> '₹1,50,000'."""
    n = int(round(rupees))
    neg = n < 0
    s = str(abs(n))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        s = ",".join(groups) + "," + tail
    return ("-" if neg else "") + "₹" + s


def d(s: str) -> date:
    return date.fromisoformat(s)


def iso(x: date) -> str:
    return x.isoformat()


def add_days(x: date, n: int) -> date:
    return x + timedelta(days=n)


HI_MONTHS = ["", "Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"]
EN_MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def ordinal(n: int) -> str:
    if 10 <= n % 100 <= 20:
        suf = "th"
    else:
        suf = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suf}"
