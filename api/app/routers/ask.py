"""Ask (companion). Rules calculate, AI explains.

A deterministic intent matcher (Hinglish + English keywords) calls the engines and fills a
bilingual template with real numbers. If ANTHROPIC_API_KEY is set, the templated answer is
optionally rephrased more warmly by Claude — the model never computes numbers, and any
rephrase that drops or changes a number is discarded.
"""
from __future__ import annotations

import json
import logging
import re

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import pipeline
from app.config import settings
from app.engines.common import L, inr

log = logging.getLogger("dhanyukti.ask")
router = APIRouter(prefix="/api", tags=["ask"])

INTENTS = [
    ("fee", r"\b(fee|fees|school|phees)\b"),
    ("what_if", r"\b(agar|what if|if|maan lo|suppose|kya hoga|late|der)\b"),
    ("why", r"\b(kyon|kyun|kyu|why|kaise pata|reason|wajah)\b"),
    ("loan", r"\b(loan|app|udhaar|udhar|karz|karza|quickrupee|kreditbee|lender)\b"),
    ("bima", r"\b(bima|beema|insurance|pmjjby|pmsby|ayushman|cover|suraksha)\b"),
    ("gullak", r"\b(gullak|save|saving|savings|bachat|bachao|bacha|jar)\b"),
    ("safe", r"(kitna kharch|safe|spend|kharch kar|kharcha kar|kitna bacha)"),
]


class AskIn(BaseModel):
    household_id: str
    question: str
    lang: str = "hi"


def match_intent(q: str) -> str:
    ql = q.lower()
    for name, pat in INTENTS:
        if re.search(pat, ql):
            return name
    return "hero"


def _amount(q: str) -> int | None:
    m = re.search(r"(?:₹|rs\.?|inr)?\s*([\d,]{3,})", q.lower())
    if m:
        try:
            return int(m.group(1).replace(",", ""))
        except ValueError:
            return None
    return None


def _days(q: str) -> int | None:
    m = re.search(r"(\d{1,2})\s*(din|day|days)", q.lower())
    return int(m.group(1)) if m else None


def answer(hid: str, question: str) -> tuple[dict, list[str]]:
    db = pipeline.dashboard(hid)
    intent = match_intent(question)
    nba = db["nba"]
    m = db["metrics"]

    if intent == "fee":
        fee = next((e for day in db["river"]["days"] for e in day["events"] if e["type"] == "fee" and e["movable"]), None)
        pay = next((day["date"] for day in db["river"]["days"] for e in day["events"] if e["type"] in ("salary",)), None)
        if fee and pay:
            sim = pipeline.simulate(hid, moves=[{"event_id": fee["id"], "new_date": pay}])
            return sim["message"], ["simulate_cashflow"]
        intent = "hero"

    if intent == "what_if":
        amt = _amount(question)
        days = _days(question)
        if days and re.search(r"salary|tankhwah|pagar|late|der", question.lower()):
            sim = pipeline.simulate(hid, salary_delay_days=days)
            return sim["message"], ["simulate_cashflow"]
        sim = pipeline.simulate(hid, shock_amount=amt or 2000)
        return sim["message"], ["simulate_shock"]

    if intent == "why" and nba:
        n = nba[0]
        conf = {"pakka": ("pakka", "confirmed"), "andaaza": ("andaaza", "an estimate"), "pata_nahi": ("pata nahi", "unknown")}[n["why"]["confidence"]]
        return L(f"{n['title']['hi']}. {n['body']['hi']} Niyam: {n['why']['rule']['hi']}. Bharosa: {conf[0]} ({len(n['why']['saw'])} len-den dekhe).",
                 f"{n['title']['en']}. {n['body']['en']} Rule: {n['why']['rule']['en']}. Confidence: {conf[1]} (based on {len(n['why']['saw'])} transactions)."), ["get_decision"]

    if intent == "loan":
        ls = db["lender_shield"]
        if not ls:
            return L("Pichhle 3 mahine mein koi app loan nahi dikha. Zaroorat ho to pehle bank se poochhein.",
                     "No app loans in the last 3 months. If you need credit, ask your bank first."), ["get_decision", "lender_shield"]
        bad = [x for x in ls if not x["on_rbi_list"] or x["effective_annual_pct"] > 36]
        hi = f"3 mahine mein {len(ls)} app loan. " + " ".join(
            f"{x['app']}: {inr(x['borrowed'])} par {inr(x['charges'])} ({x['days']} din){'' if x['on_rbi_list'] else ' — RBI list mein nahi'}." for x in ls)
        en = f"{len(ls)} app loans in 3 months. " + " ".join(
            f"{x['app']}: {inr(x['charges'])} on {inr(x['borrowed'])} ({x['days']} days){'' if x['on_rbi_list'] else ' — not on RBI list'}." for x in ls)
        if bad:
            hi += " Agli baar bank overdraft / chhota loan poochhein."
            en += " Next time, ask your bank for an overdraft / small loan."
        return L(hi, en), ["get_decision", "lender_shield"]

    if intent == "bima":
        pd = db["protection_detail"]
        no_life = [p["name"] for p in pd if not p["life"] and any(mm["id"] == p["member_id"] and mm["earner"] for mm in db["household"]["members"])]
        if no_life:
            names = ", ".join(no_life)
            return L(f"{names}: jeevan bima nahi. PMJJBY ₹436/saal mein ₹2 lakh, PMSBY ₹20/saal mein ₹2 lakh durghatna bima. Ayushman patrata beneficiary.nha.gov.in par dekhein.",
                     f"{names}: no life cover. PMJJBY gives ₹2 lakh for ₹436/yr, PMSBY ₹2 lakh accident cover for ₹20/yr. Check Ayushman eligibility at beneficiary.nha.gov.in."), ["get_decision"]
        return L("Kamane walon ka jeevan bima hai. Saal mein ek baar nominee aur premium check kar lein.",
                 "Earners have life cover. Check nominee and premium once a year."), ["get_decision"]

    if intent == "gullak":
        jars = db["jars"]
        hi = " ".join(f"{j['name']['hi']}: {inr(j['saved'])}/{inr(j['goal'])}, roz {inr(j['daily_suggest'])}." for j in jars)
        en = " ".join(f"{j['name']['en']}: {inr(j['saved'])} of {inr(j['goal'])}, {inr(j['daily_suggest'])}/day." for j in jars)
        return L(hi, en), ["get_decision"]

    if intent == "safe":
        s = m["safe_to_spend"]
        return L(f"Aaj {inr(s['value'])} tak kharch kar sakte hain. {s['sub']['hi']}.",
                 f"You can safely spend {inr(s['value'])} today. {s['sub']['en']}."), ["simulate_cashflow"]

    if nba:
        n = nba[0]
        return L(f"Aaj ka kaam: {n['title']['hi']}. {n['task']['hi']}", f"Today's task: {n['title']['en']}. {n['task']['en']}"), ["get_decision"]
    return L("Sab theek chal raha hai.", "Everything looks fine."), ["get_decision"]


_NUM = re.compile(r"\d[\d,]*")


def _numbers(s: str) -> set[str]:
    return {x.replace(",", "") for x in _NUM.findall(s)}


def rephrase(ans: dict) -> dict:
    """Optional warm rephrase via Claude. Failsafe: returns the original on any problem."""
    if not settings.llm_enabled:
        return ans
    system = ("You rephrase short money tips for low-income Indian families. Keep every number, rupee amount and date "
              "exactly as given. Do not add advice, numbers or product names. Hindi must be Roman-script Hinglish. "
              'Reply with only JSON: {"hi": "...", "en": "..."}')
    try:
        r = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": settings.anthropic_api_key, "anthropic-version": "2023-06-01",
                     "content-type": "application/json"},
            json={"model": settings.anthropic_model, "max_tokens": 1024, "system": system,
                  "output_config": {"effort": "low"},
                  "messages": [{"role": "user", "content": "Rephrase warmly, same meaning:\n" + json.dumps(ans, ensure_ascii=False)}]},
            timeout=12.0,
        )
        log.info("anthropic rephrase status=%s", r.status_code)
        if r.status_code != 200:
            return ans
        data = r.json()
        if data.get("stop_reason") not in ("end_turn", "stop_sequence"):
            return ans
        text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
        text = text[text.find("{"): text.rfind("}") + 1]
        out = json.loads(text)
        if not (isinstance(out, dict) and isinstance(out.get("hi"), str) and isinstance(out.get("en"), str)):
            return ans
        for k in ("hi", "en"):
            if not _numbers(ans[k]) <= _numbers(out[k]):
                return ans  # model dropped/changed a number -> keep the rules' answer
        return {"hi": out["hi"], "en": out["en"]}
    except Exception as e:  # noqa: BLE001
        log.warning("anthropic rephrase failed: %s", type(e).__name__)
        return ans


@router.post("/ask")
def ask(body: AskIn):
    hid = body.household_id.upper()
    if hid not in ("A", "B", "C"):
        raise HTTPException(404, "unknown household")
    ans, tools = answer(hid, body.question)
    return {"answer": rephrase(ans), "tools_used": tools, "tag": "jaankari"}
