"""Refresh the Lender Shield fields of web/src/data/demo.json from the engine.

Run from api/: python scripts/refresh_demo_lenders.py
Rewrites only each dashboard's `lender_shield`, its `nba_lender_shield` card and the `loan` ask answer,
so the offline snapshot says exactly what the engine says (RBI's list vs DhanYukti's own ₹36 line).
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app import pipeline, store  # noqa: E402
from app.routers import ask  # noqa: E402

OUT = pathlib.Path(__file__).resolve().parents[2] / "web" / "src" / "data" / "demo.json"

store.reset()
demo = json.loads(OUT.read_text(encoding="utf-8"))
for hid in ("A", "B", "C"):
    dash = pipeline.dashboard(hid)
    snap = demo["dashboards"][hid]
    snap["lender_shield"] = dash["lender_shield"]
    fresh = {n["id"]: n for n in dash["nba"]}
    snap["nba"] = [fresh.get(n["id"], n) if n["id"] == "nba_lender_shield" else n for n in snap["nba"]]
    if "loan" in demo["ask"][hid]:
        demo["ask"][hid]["loan"] = {"hi": ask.answer(hid, "loan app")[0]}
OUT.write_text(json.dumps(demo, ensure_ascii=False), encoding="utf-8")
print("updated", OUT)
