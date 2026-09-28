"""Refresh the What-if fields of web/src/data/demo.json from the engine (river events, jars, payee contacts).

Run from api/: python scripts/refresh_demo_whatif.py
Only `river`, `jars` and the top-level `whatif` block are rewritten; everything else in the snapshot is kept.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app import pipeline, store  # noqa: E402
from app.engines import e17_whatif as e17  # noqa: E402

OUT = pathlib.Path(__file__).resolve().parents[2] / "web" / "src" / "data" / "demo.json"

store.reset()
demo = json.loads(OUT.read_text(encoding="utf-8"))
whatif = {}
for hid in ("A", "B", "C"):
    dash = pipeline.dashboard(hid)
    demo["dashboards"][hid]["river"] = dash["river"]
    demo["dashboards"][hid]["jars"] = dash["jars"]
    hh = pipeline.load(hid)
    ctx = pipeline.compute(hh)
    whatif[hid] = {
        "needs": {e["id"]: e17._needs(e) for e in hh["upcoming"] if e.get("movable")},
        "emi_monthly": round(ctx["norm"]["emi_monthly_p"] / 100),
        "monthly_income": round(ctx["norm"]["monthly_income_p"] / 100),
        "resilience_days": ctx["resilience_days"],
        "next_income_date": ctx["cash"]["next_income_date"],
    }
demo["whatif"] = whatif
OUT.write_text(json.dumps(demo, ensure_ascii=False), encoding="utf-8")
print("updated", OUT)
