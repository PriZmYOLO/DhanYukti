/** Checks for the voice nudge templates and the number guard (Job 2c). */
import assert from "node:assert/strict";

import {
  cashShortText,
  indianGrouping,
  numbersKept,
  validCashShort,
} from "../src/lib/voice/nudges";

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`PASS  ${name}`);
};

check("Indian grouping", () => {
  assert.equal(indianGrouping(3000), "3,000");
  assert.equal(indianGrouping(125000), "1,25,000");
  assert.equal(indianGrouping(12345678), "1,23,45,678");
});
check(
  "template text: English and reviewed Hindi carry the same numbers",
  () => {
    const t = cashShortText({ amount_paise: 420_000, date: "2026-09-28" });
    assert.equal(
      t.english,
      "On 28 September, your cash may fall short by 4,200 rupees. This is a shortfall to plan for, not money lost.",
    );
    assert.ok(t.hindiReviewed.startsWith("28 सितंबर को"));
    assert.ok(numbersKept(t.english, t.hindiReviewed));
  },
);
check(
  "number guard: Devanagari digits count; a changed or dropped number fails",
  () => {
    const en = "On 28 September, your cash may fall short by 4,200 rupees.";
    assert.ok(numbersKept(en, "२८ सितंबर को ४,२०० रुपये कम पड़ सकते हैं।"));
    assert.equal(numbersKept(en, "28 सितंबर को 42 सौ रुपये"), false);
    assert.equal(numbersKept(en, "सितंबर को 4,200 रुपये"), false);
  },
);
check(
  "only typed values are accepted (no free text can reach Bhashini)",
  () => {
    assert.ok(validCashShort({ amount_paise: 300000, date: "2026-09-28" }));
    assert.equal(
      validCashShort({ amount_paise: "300000", date: "2026-09-28" }),
      null,
    );
    assert.equal(
      validCashShort({ amount_paise: 300050, date: "2026-09-28" }),
      null,
    );
    assert.equal(
      validCashShort({ amount_paise: 300000, date: "Ravi's salary day" }),
      null,
    );
    assert.equal(
      validCashShort({ amount_paise: -5, date: "2026-09-28" }),
      null,
    );
  },
);
console.log(`\n${passed} checks passed`);
