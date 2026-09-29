/**
 * ReBIT-shaped XML for the LOCAL mock FIU module (test data only, fake
 * names, masked numbers). Attribute names follow the ReBIT FI schemas
 * (FISchema/deposit.xsd, term_deposit.xsd, recurring_deposit.xsd,
 * mutual_funds.xsd, equities.xsd, sip.xsd). Shared with the tests, so the
 * numbers they expect are the numbers served here.
 */

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const attrs = (o) =>
  Object.entries(o)
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(" ");
const ns = (type) =>
  `xmlns="http://api.rebit.org.in/FISchema/${type}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`;
const holder = (extra = {}) =>
  `<Profile><Holders type="SINGLE"><Holder ${attrs({ name: "TEST USER", dob: "1994-03-15", mobile: "9999999999", nominee: "REGISTERED", ...extra })}/></Holders></Profile>`;
const isoDay = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** The investment accounts the mock serves when their type is requested. */
export const MOCK_INVESTMENTS = {
  TERM_DEPOSIT: {
    masked: "XXXXXXXX7001",
    current: "104250.75",
    principal: "100000.00",
    maturityAmount: "112550.00",
    maturityInDays: 150,
    rate: "7.10",
  },
  RECURRING_DEPOSIT: {
    masked: "XXXXXXXX7002",
    current: "31140.20",
    principal: "30000.00",
    maturityAmount: "63210.00",
    maturityInDays: 330,
    rate: "6.75",
    instalment: "2500.00",
    day: 10,
  },
  MUTUAL_FUNDS: { folio: "XXXXX4567", current: "171234.56", cost: "150000.00", schemes: 2 },
  EQUITIES: { demat: "XXXXXXXXXXXX0987", current: "84500.00", holdings: 2 },
  SIP: { folio: "XXXXX4567", active: { amount: "5000.00", day: 5 }, ceased: { amount: "2000.00" } },
};

/** DEPOSIT account XML (the same values the JSON mock used to send). */
export function depositXml({ masked, balance, start, today, txns, holderName = "TEST USER" }) {
  const rows = txns
    .map(
      (t) =>
        `<Transaction ${attrs({ txnId: t.txnId, type: t.type, mode: t.mode, amount: t.amount, currentBalance: t.currentBalance, transactionTimestamp: t.transactionTimestamp, valueDate: t.valueDate, narration: t.narration, reference: t.reference })}/>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><Account ${ns("deposit")} ${attrs({ linkedAccRef: `ref-${masked.slice(-4)}`, maskedAccNumber: masked, version: "1.1", type: "deposit" })}>${holder({ name: holderName })}<Summary ${attrs({ currentBalance: balance, currency: "INR", balanceDateTime: today.toISOString(), type: "SAVINGS", status: "ACTIVE" })}/><Transactions ${attrs({ startDate: isoDay(start), endDate: isoDay(today) })}>${rows}</Transactions></Account>`;
}

function window(today) {
  const from = new Date(today);
  from.setMonth(from.getMonth() - 12);
  return attrs({ startDate: isoDay(from), endDate: isoDay(today) });
}

/** One investment account of this FI type, or null for DEPOSIT. */
export function investmentXml(fiType, today = new Date()) {
  const m = MOCK_INVESTMENTS;
  if (fiType === "TERM_DEPOSIT" || fiType === "RECURRING_DEPOSIT") {
    const a = m[fiType];
    const rd = fiType === "RECURRING_DEPOSIT";
    const type = rd ? "recurring_deposit" : "term_deposit";
    const summary = {
      accountType: rd ? "RECURRING" : "FIXED",
      openingDate: isoDay(addDays(today, -200)),
      maturityAmount: a.maturityAmount,
      maturityDate: isoDay(addDays(today, a.maturityInDays)),
      interestRate: a.rate,
      principalAmount: a.principal,
      ...(rd ? { recurringAmount: a.instalment, recurringDepositDay: String(a.day) } : {}),
      interestComputation: "COMPOUND",
      compoundingFrequency: "QUARTERLY",
      currentValue: a.current,
    };
    return `<?xml version="1.0" encoding="UTF-8"?><Account ${ns(type)} ${attrs({ linkedAccRef: `ref-${a.masked.slice(-4)}`, maskedAccNumber: a.masked, version: "1.1", type })}>${holder()}<Summary ${attrs(summary)}/><Transactions ${window(today)}><Transaction ${attrs({ txnId: `${type}-1`, amount: "1780.25", narration: "INTEREST CREDIT", type: "INTEREST", mode: "OTHERS", balance: a.current, transactionDateTime: today.toISOString(), valueDate: isoDay(today) })}/></Transactions></Account>`;
  }
  if (fiType === "MUTUAL_FUNDS") {
    const a = m.MUTUAL_FUNDS;
    const holdings = [
      { amc: "TEST AMC ONE", schemeCode: "TST001", isin: "INF000T01010", isinDescription: "TEST LARGE CAP FUND - DIRECT GROWTH", closingUnits: "1234.567", nav: "85.4321", navDate: isoDay(addDays(today, -1)) },
      { amc: "TEST AMC TWO", schemeCode: "TST002", isin: "INF000T02026", isinDescription: "TEST SHORT DURATION FUND", closingUnits: "512.1", nav: "", navDate: "" },
    ]
      .map((h) => `<Holding ${attrs({ registrar: "TEST RTA", schemeOption: "GROWTH_TYPE", folioNo: a.folio, ...h })}/>`)
      .join("");
    return `<?xml version="1.0" encoding="UTF-8"?><Account ${ns("mutual_funds")} ${attrs({ linkedAccRef: "ref-mf", version: "1.0.0", type: "mutualfunds", maskedFolioNo: a.folio })}>${holder({ folioNo: a.folio })}<Summary ${attrs({ costValue: a.cost, currentValue: a.current })}><Investment><Holdings>${holdings}</Holdings></Investment></Summary><Transactions ${window(today)}/></Account>`;
  }
  if (fiType === "EQUITIES") {
    const a = m.EQUITIES;
    const holdings = [
      { issuerName: "TEST INDUSTRIES LTD", isin: "INE000T01011", isinDescription: "TEST INDUSTRIES LTD EQ", units: "50", lastTradedPrice: "1250.40" },
      { issuerName: "TEST POWER LTD", isin: "INE000T02019", isinDescription: "TEST POWER LTD EQ", units: "100", lastTradedPrice: "" },
    ]
      .map((h) => `<Holding ${attrs(h)}/>`)
      .join("");
    return `<?xml version="1.0" encoding="UTF-8"?><Account ${ns("equities")} ${attrs({ linkedAccRef: "ref-eq", maskedDematId: a.demat, version: "1.0.0", type: "equities" })}>${holder({ dematId: a.demat })}<Summary ${attrs({ currentValue: a.current })}><Investment><Holdings type="DEMAT">${holdings}</Holdings></Investment></Summary><Transactions ${window(today)}/></Account>`;
  }
  if (fiType === "SIP") {
    const a = m.SIP;
    const next = new Date(today);
    if (next.getDate() >= a.active.day) next.setMonth(next.getMonth() + 1);
    next.setDate(a.active.day);
    const last = new Date(next);
    last.setMonth(last.getMonth() - 1);
    const ceased = isoDay(addDays(today, -120));
    return `<?xml version="1.0" encoding="UTF-8"?><Account ${ns("sip")} ${attrs({ linkedAccRef: "ref-sip", maskedFolioNo: a.folio, version: "1.0.0", type: "sip" })}>${holder()}<Summary ${attrs({ folioNo: a.folio })}><Holdings><Holding ${attrs({ amc: "TEST AMC ONE", registrar: "TEST RTA", amfiCode: "100001" })}><Schemes><Scheme ${attrs({ scheme: "TEST LARGE CAP FUND - DIRECT GROWTH", isin: "INF000T01010" })}><Sips><Sip ${attrs({ SIPRefNo: "SIP-1", amount: a.active.amount, frequency: "Monthly", lastInstallmentDate: isoDay(last), nextInstallmentDate: isoDay(next), ceasedDate: "" })}/></Sips></Scheme><Scheme ${attrs({ scheme: "TEST SHORT DURATION FUND", isin: "INF000T02026" })}><Sips><Sip ${attrs({ SIPRefNo: "SIP-2", amount: a.ceased.amount, frequency: "Monthly", lastInstallmentDate: ceased, nextInstallmentDate: "", ceasedDate: ceased })}/></Sips></Scheme></Schemes></Holding></Holdings></Summary><Transactions/></Account>`;
  }
  return null;
}
