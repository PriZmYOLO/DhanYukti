"""Gamification: points ledger, streaks, levels, badges, mission, habit leaderboard, value ledger.

Never touches money records — the only money-adjacent write is a Gullak jar's `saved` amount
on a gullak_deposit event (jars are user-declared goals, not bank records).
"""
from __future__ import annotations

import copy
from datetime import date, timedelta

from app import store
from app.engines.common import L
from app.fixtures.households import HOUSEHOLDS

POINTS = {"setup": 100, "checkin": 5, "task_done": 25, "gullak_deposit": 50, "protection_check": 50,
          "correction": 10, "lesson": 15}
LEVELS = [
    (1, 0, L("Beej", "Seed")),
    (2, 200, L("Ankur", "Sprout")),
    (3, 500, L("Paudha", "Plant")),
    (4, 1000, L("Ped", "Tree")),
    (5, 2000, L("Bargad", "Banyan")),
]
BADGES = [
    {"id": "pehla_kadam", "name": L("Pehla Kadam", "First Step"), "desc": L("Pehla kaam poora kiya", "Completed your first task"), "icon": "footprints"},
    {"id": "karz_mukti", "name": L("Karz Mukti", "Debt Free"), "desc": L("Mehenga app loan chhoda", "Stepped away from a costly app loan"), "icon": "unlock"},
    {"id": "suraksha_kavach", "name": L("Suraksha Kavach", "Protection Shield"), "desc": L("Parivaar ka bima check kiya", "Checked the family's insurance"), "icon": "shield"},
    {"id": "bachav_30", "name": L("30 Din ka Bachav", "30-Day Cushion"), "desc": L("30 din ka zaroori kharch Emergency Gullak mein", "30 days of essentials in the emergency jar"), "icon": "jar"},
    {"id": "parivaar_champion", "name": L("Parivaar Champion", "Family Champion"), "desc": L("Parivaar ne milkar 75 aadatein poori ki", "The family completed 75 habits together"), "icon": "trophy"},
]
FAMILY_HABITS_FOR_CHAMPION = 75


def _today() -> date:
    return date.today()


def _state(hid: str) -> dict:
    g = store.STATE["game"].get(hid)
    if g is None:
        seed = copy.deepcopy(HOUSEHOLDS[hid]["game"])
        seed["last_checkin"] = (_today() - timedelta(days=1)).isoformat() if seed["streak"] > 0 else None
        seed["checkins"] = []
        store.STATE["game"][hid] = seed
        g = seed
    return g


def level_for(points: int) -> tuple[int, dict, int]:
    cur = LEVELS[0]
    for lv in LEVELS:
        if points >= lv[1]:
            cur = lv
    nxt = next((lv[1] for lv in LEVELS if lv[1] > points), LEVELS[-1][1])
    return cur[0], cur[2], nxt


def game_out(hid: str) -> dict:
    with store.lock():
        g = _state(hid)
        lvl, name, nxt = level_for(g["points"])
        return {
            "points": g["points"], "streak": g["streak"], "streak_shield": g["streak_shield"],
            "level": lvl, "level_name": name, "next_level_at": nxt,
            "badges": [{**b, "earned": b["id"] in g["badges_earned"]} for b in BADGES],
            "mission": copy.deepcopy(g["mission"]),
            "leaderboard": sorted(copy.deepcopy(g["leaderboard"]), key=lambda x: (-x["habits"], x["name"])),
            "ledger": copy.deepcopy(g["ledger"]),
        }


def _badge(bid: str) -> dict:
    b = next(x for x in BADGES if x["id"] == bid)
    return {**b, "earned": True}


def apply_event(hid: str, type_: str, ref: str | None = None, amount: int | None = None) -> dict:
    if type_ not in POINTS:
        raise ValueError(f"unknown event type {type_}")
    with store.lock():
        g = _state(hid)
        today = _today().isoformat()
        delta = POINTS[type_]
        jars_out = None

        if type_ == "checkin":
            last = g.get("last_checkin")
            if last == today:
                delta = 0
            else:
                gap = (_today() - date.fromisoformat(last)).days if last else None
                if gap == 1:
                    g["streak"] += 1
                elif gap == 2 and g["streak_shield"] > 0:
                    g["streak_shield"] -= 1
                    g["streak"] += 1
                else:
                    g["streak"] = 1
                g["last_checkin"] = today
                if g["streak"] % 7 == 0:
                    g["streak_shield"] = min(3, g["streak_shield"] + 1)

        if type_ == "gullak_deposit":
            amt = max(0, int(amount or 0))
            jars = store.STATE["jars"][hid]
            jar = next((j for j in jars if j["id"] == ref), None) or next((j for j in jars if j["kind"] == "emergency"), jars[0])
            jar["saved"] += amt
            g["mission"]["progress"] = min(g["mission"]["target"], g["mission"]["progress"] + amt)
            if amt:
                g["ledger"].append({"date": today, "what": L(f"{jar['name']['hi']} mein bachat", f"Saved in {jar['name']['en']}"),
                                    "amount": amt, "evidenced": False})
            jars_out = jars

        if type_ == "task_done" and ref:
            store.STATE["open_actions"][hid].append({"ref": ref, "done_at": today})

        g["points"] += delta
        if delta:
            primary = HOUSEHOLDS[hid]["primary_user"]
            for row in g["leaderboard"]:
                if row["member_id"] == primary:
                    row["habits"] += 1
                    row["streak"] = max(row["streak"], g["streak"])

        # badge unlocks (first new one is returned)
        unlocked = None
        earned = g["badges_earned"]
        cands = []
        if type_ in ("task_done", "setup", "gullak_deposit", "protection_check"):
            cands.append("pehla_kadam")
        if type_ == "task_done" and ref and ("lender" in ref or "loan" in ref):
            cands.append("karz_mukti")
        if type_ == "protection_check":
            cands.append("suraksha_kavach")
        if type_ == "gullak_deposit":
            em = next((j for j in store.STATE["jars"][hid] if j["kind"] == "emergency"), None)
            if em and em["saved"] >= HOUSEHOLDS[hid]["essentials_per_day"] * 30:
                cands.append("bachav_30")
        if sum(r["habits"] for r in g["leaderboard"]) >= FAMILY_HABITS_FOR_CHAMPION:
            cands.append("parivaar_champion")
        for c in cands:
            if c not in earned:
                earned.append(c)
                unlocked = unlocked or _badge(c)

        lvl, _, _ = level_for(g["points"])
        out = {"points": g["points"], "delta": delta, "streak": g["streak"], "level": lvl}
        if unlocked:
            out["badge_unlocked"] = unlocked
        if jars_out is not None:
            out["jars"] = jars_with_suggest(hid)
        return out


def jars_with_suggest(hid: str, as_of: str = "2026-09-23") -> list[dict]:
    out = []
    for j in store.STATE["jars"][hid]:
        days = max(1, (date.fromisoformat(j["target_date"]) - date.fromisoformat(as_of)).days)
        remaining = max(0, j["goal"] - j["saved"])
        per_day = -(-remaining // days)  # ceil
        per_day = -(-per_day // 10) * 10 if per_day else 0  # round up to ₹10
        out.append({"id": j["id"], "name": j["name"], "goal": j["goal"], "saved": j["saved"], "kind": j["kind"],
                    "daily_suggest": per_day})
    return out
