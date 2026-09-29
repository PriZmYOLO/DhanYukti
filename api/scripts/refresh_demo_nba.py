"""Refresh the Next Best Action cards and the what-if daily cut in web/src/data/demo.json from the engine.

Run from api/: python scripts/refresh_demo_nba.py
Rewrites only each dashboard's `nba` list and whatif[hid].cut_per_day / floor_cut_text, so the offline
snapshot shows exactly what the engine says (no hand-typed rupee figures).
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app import pipeline, store  # noqa: E402
from app.engines import e03_cashflow as e03  # noqa: E402
from app.engines import e17_whatif as e17  # noqa: E402

OUT = pathlib.Path(__file__).resolve().parents[2] / "web" / "src" / "data" / "demo.json"

store.reset()
demo = json.loads(OUT.read_text(encoding="utf-8"))
for hid in ("A", "B", "C"):
    demo["dashboards"][hid]["nba"] = pipeline.dashboard(hid)["nba"]
    hh = pipeline.load(hid)
    plan = e17.cut_plan(hh, target="gap")
    nid = e03.run(hh)["next_income_date"]
    moves = [{"event_id": e["id"], "new_date": nid} for e in hh["upcoming"]
             if e.get("movable") and e["amount"] < 0 and hh["as_of"] < e["date"] < nid]
    floor = e17.cut_plan(hh, target="floor", moves=moves) if moves else None
    w = demo["whatif"].setdefault(hid, {})
    w["cut_per_day"] = plan["cut_per_day"] if plan else None
    w["floor_cut_text"] = e17.cut_text(floor) if floor else None
OUT.write_text(json.dumps(demo, ensure_ascii=False), encoding="utf-8")
print("updated", OUT)
