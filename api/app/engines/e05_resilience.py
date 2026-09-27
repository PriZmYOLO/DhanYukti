"""E05 — resilience: how many days of essentials are covered with zero income.

days = (operational balance + idle savings + emergency jar) / (essentials per day + fixed monthly
obligations [EMIs + rent + bills] / 30). School fees are not treated as survival spend.
"""
from __future__ import annotations


def resilience_days(liquid_p: int, essentials_per_day_p: int, fixed_monthly_p: int) -> int:
    burn = essentials_per_day_p + fixed_monthly_p / 30
    if burn <= 0:
        return 999
    return int(max(0, liquid_p) / burn + 0.5)


def status(days: int) -> str:
    if days < 15:
        return "red"
    if days < 30:
        return "amber"
    return "green"
