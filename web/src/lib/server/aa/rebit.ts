/**
 * Parse a decrypted ReBIT FI document (XML first, JSON if it comes) into the
 * few facts the app uses, one parser per FI type. Amounts become integer
 * paise; units, NAVs, prices and rates stay exact decimal strings. A value
 * that can't be read stays null (unknown is not zero). Unknown fields are
 * ignored. Nothing is inferred here: income, obligations and spending are
 * the financial engines' job.
 *
 * Field names follow the ReBIT FI schemas (api.rebit.org.in/schema,
 * FISchema/*.xsd, checked 28 Sep 2026) for deposit, term_deposit,
 * recurring_deposit, mutual_funds, equities and sip, v1.x and v2.0.0.
 *
 * No path aliases, so the mock and check scripts can import it too.
 */
import { XMLParser } from "fast-xml-parser";

import type { FiType } from "../../aa/fi-types";

export interface ParsedTransaction {
  txn_id: string | null;
  type: "CREDIT" | "DEBIT" | null;
  mode: string | null;
  amount_paise: number | null;
  /** Running balance after the transaction, when the FIP sends it. */
  balance_paise: number | null;
  value_date: string | null;
  timestamp: string | null;
  narration: string | null;
}

export interface ParsedDepositAccount {
  masked_acc_number: string | null;
  account_type: string | null; // SAVINGS / CURRENT
  balance_paise: number | null;
  balance_at: string | null; // ISO timestamp from the FIP
  data_from: string | null; // ISO date
  data_to: string | null;
  /** Holder date of birth from Profile, used only to work out an age. */
  holder_dob: string | null;
  /** Holder's first name only (Profile), to greet the member; the full name is not kept. */
  holder_first_name?: string | null;
  transactions: ParsedTransaction[];
}

/** TERM_DEPOSIT and RECURRING_DEPOSIT (the RD fields are null for an FD). */
export interface DepositTerms {
  masked_acc_number: string | null;
  /** currentValue (v1.x) or currentBalance (v2.0.0). */
  current_value_paise: number | null;
  principal_paise: number | null;
  maturity_amount_paise: number | null;
  maturity_date: string | null;
  /** Percent a year, as sent ("7.10"). */
  interest_rate: string | null;
  recurring_amount_paise: number | null;
  /** Day of the month the RD instalment is due (1–31). */
  recurring_day: number | null;
}

export interface MutualFundHolding {
  amc: string | null;
  /** isinDescription, else the scheme code. */
  scheme_name: string | null;
  scheme_code: string | null;
  isin: string | null;
  units: string | null;
  nav: string | null;
  /** Not in the ReBIT schema per scheme; read only if a FIP sends it. */
  current_value_paise: number | null;
  cost_value_paise: number | null;
  /** navDate. */
  as_of: string | null;
}

export interface EquityHolding {
  issuer: string | null;
  isin: string | null;
  units: string | null;
  last_price: string | null;
  /** Not in the ReBIT schema per holding; read only if a FIP sends it. */
  current_value_paise: number | null;
}

export interface SipEntry {
  amc: string | null;
  scheme: string | null;
  isin: string | null;
  amount_paise: number | null;
  frequency: string | null;
  next_date: string | null;
  last_date: string | null;
  /** From ceasedDate: set → ceased; else a next date → active. */
  status: "active" | "ceased" | "unknown";
}

export type Holdings =
  | {
      kind: "mutual_funds";
      /** Account-level totals from Summary. */
      current_value_paise: number | null;
      cost_value_paise: number | null;
      schemes: MutualFundHolding[];
    }
  | {
      kind: "equities";
      current_value_paise: number | null;
      holdings: EquityHolding[];
    }
  | { kind: "sip"; sips: SipEntry[] };

interface Common {
  /** Masked account, demat id or folio, as the FIP sent it. */
  masked_ref: string | null;
  holder_dob: string | null;
  data_from: string | null;
  data_to: string | null;
}

export type ParsedFI =
  | ({ fi_type: "DEPOSIT" } & ParsedDepositAccount)
  | ({ fi_type: "TERM_DEPOSIT" | "RECURRING_DEPOSIT" } & Common & {
        deposit_terms: DepositTerms;
      })
  | ({ fi_type: "MUTUAL_FUNDS" | "EQUITIES" | "SIP" } & Common & {
        holdings: Holdings;
      });

/* -------------------------------- values -------------------------------- */

export function toPaise(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  const [whole, frac = ""] = text.replace("-", "").split(".");
  const paise = Number(whole) * 100 + Number((frac + "00").slice(0, 2) || "0");
  return Number.isSafeInteger(paise)
    ? text.startsWith("-")
      ? -paise
      : paise
    : null;
}

/** Exact decimal as a string ("1234.567"), or null. Never a float. */
function decimal(value: unknown): string | null {
  const text = str(value)?.replace(/,/g, "");
  return text && /^-?\d+(\.\d+)?$/.test(text) ? text : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isoDate(value: unknown): string | null {
  const s = str(value);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

/** Case-insensitive property lookup (FIPs vary: Account/account). */
function pick(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const found = Object.keys(obj).find(
    (k) => k.toLowerCase() === key.toLowerCase(),
  );
  return found ? (obj as Record<string, unknown>)[found] : undefined;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

/* ------------------------------- document ------------------------------- */

// Attributes become plain keys, so an XML tree reads like ReBIT JSON.
const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
});

/** The <Account> element (or JSON object), wherever it sits. */
function accountOf(plaintext: string): Record<string, unknown> {
  const text = plaintext.trim();
  const doc: unknown = text.startsWith("<")
    ? xml.parse(text)
    : JSON.parse(text);
  return (findKey(doc, "Account") ?? doc ?? {}) as Record<string, unknown>;
}

function findKey(node: unknown, key: string, depth = 0): unknown {
  if (!node || typeof node !== "object" || depth > 4) return undefined;
  const direct = pick(node, key);
  if (direct && typeof direct === "object") return asArray(direct)[0];
  for (const child of Object.values(node)) {
    const found = findKey(child, key, depth + 1);
    if (found) return found;
  }
  return undefined;
}

const TYPE_NAMES: Record<string, FiType> = {
  deposit: "DEPOSIT",
  term_deposit: "TERM_DEPOSIT",
  recurring_deposit: "RECURRING_DEPOSIT",
  mutual_funds: "MUTUAL_FUNDS",
  mutualfunds: "MUTUAL_FUNDS",
  equities: "EQUITIES",
  sip: "SIP",
};

/** The FI type the document says it is: Account@type, else its namespace. */
export function detectFiType(account: Record<string, unknown>): FiType | null {
  const norm = (v: unknown) =>
    typeof v === "string" ? v.trim().toLowerCase().replace(/-/g, "_") : "";
  const byType = TYPE_NAMES[norm(pick(account, "type"))];
  if (byType) return byType;
  const ns = norm(pick(account, "xmlns")).split("/").pop() ?? "";
  return TYPE_NAMES[ns] ?? null;
}

function holderDob(account: unknown): string | null {
  const holder = asArray(
    pick(pick(pick(account, "Profile"), "Holders"), "Holder"),
  )[0];
  return isoDate(pick(holder, "dob"));
}

function holderFirstName(account: unknown): string | null {
  const holder = asArray(
    pick(pick(pick(account, "Profile"), "Holders"), "Holder"),
  )[0];
  const name = str(pick(holder, "name"));
  const first = name?.trim().split(/\s+/)[0] ?? "";
  return /^[A-Za-z\u0900-\u097F.'-]{2,30}$/.test(first) ? first : null;
}

function common(account: unknown, maskedKeys: string[]): Common {
  const txns = pick(account, "Transactions");
  return {
    masked_ref:
      maskedKeys.map((k) => str(pick(account, k))).find(Boolean) ?? null,
    holder_dob: holderDob(account),
    data_from: isoDate(pick(txns, "startDate")),
    data_to: isoDate(pick(txns, "endDate")),
  };
}

/* ------------------------------ per FI type ----------------------------- */

function txn(raw: unknown): ParsedTransaction {
  const type = str(pick(raw, "type"))?.toUpperCase();
  return {
    txn_id: str(pick(raw, "txnId")),
    type: type === "CREDIT" || type === "DEBIT" ? type : null,
    mode: str(pick(raw, "mode")),
    amount_paise: toPaise(pick(raw, "amount")),
    balance_paise: toPaise(pick(raw, "currentBalance")),
    value_date: isoDate(pick(raw, "valueDate")),
    timestamp: str(pick(raw, "transactionTimestamp")),
    narration: str(pick(raw, "narration")),
  };
}

/** DEPOSIT: the output the verified live flow has always used. */
function deposit(account: unknown): ParsedDepositAccount {
  const summary = pick(account, "Summary");
  const txns = pick(account, "Transactions");
  return {
    masked_acc_number: str(pick(account, "maskedAccNumber")),
    account_type: str(pick(summary, "type")),
    balance_paise: toPaise(pick(summary, "currentBalance")),
    balance_at: str(pick(summary, "balanceDateTime")),
    data_from: isoDate(pick(txns, "startDate")),
    data_to: isoDate(pick(txns, "endDate")),
    holder_dob: holderDob(account),
    holder_first_name: holderFirstName(account),
    transactions: asArray(pick(txns, "Transaction")).map(txn),
  };
}

function depositTerms(account: unknown): DepositTerms {
  const s = pick(account, "Summary");
  const day = Number(str(pick(s, "recurringDepositDay")));
  return {
    masked_acc_number: str(pick(account, "maskedAccNumber")),
    current_value_paise:
      toPaise(pick(s, "currentValue")) ?? toPaise(pick(s, "currentBalance")),
    principal_paise: toPaise(pick(s, "principalAmount")),
    maturity_amount_paise: toPaise(pick(s, "maturityAmount")),
    maturity_date: isoDate(pick(s, "maturityDate")),
    interest_rate: decimal(pick(s, "interestRate")),
    recurring_amount_paise: toPaise(pick(s, "recurringAmount")),
    recurring_day: Number.isInteger(day) && day >= 1 && day <= 31 ? day : null,
  };
}

function mutualFunds(account: unknown): Holdings {
  const s = pick(account, "Summary");
  const rows = asArray(
    pick(pick(pick(s, "Investment"), "Holdings"), "Holding"),
  );
  return {
    kind: "mutual_funds",
    current_value_paise: toPaise(pick(s, "currentValue")),
    cost_value_paise: toPaise(pick(s, "costValue")),
    schemes: rows.map((h) => ({
      amc: str(pick(h, "amc")),
      scheme_name:
        str(pick(h, "isinDescription")) ?? str(pick(h, "schemeCode")),
      scheme_code: str(pick(h, "schemeCode")),
      isin: str(pick(h, "isin")),
      units: decimal(pick(h, "closingUnits")),
      nav: decimal(pick(h, "nav")),
      current_value_paise: toPaise(pick(h, "currentValue")),
      cost_value_paise: toPaise(pick(h, "costValue")),
      as_of: isoDate(pick(h, "navDate")),
    })),
  };
}

function equities(account: unknown): Holdings {
  const s = pick(account, "Summary");
  const rows = asArray(
    pick(pick(pick(s, "Investment"), "Holdings"), "Holding"),
  );
  return {
    kind: "equities",
    current_value_paise: toPaise(pick(s, "currentValue")),
    holdings: rows.map((h) => ({
      issuer: str(pick(h, "issuerName")),
      isin: str(pick(h, "isin")),
      units: decimal(pick(h, "units")),
      last_price: decimal(pick(h, "lastTradedPrice")),
      current_value_paise: toPaise(pick(h, "currentValue")),
    })),
  };
}

function sips(account: unknown): Holdings {
  const holdings = asArray(
    pick(pick(pick(account, "Summary"), "Holdings"), "Holding"),
  );
  const out: SipEntry[] = [];
  for (const h of holdings) {
    for (const scheme of asArray(pick(pick(h, "Schemes"), "Scheme"))) {
      for (const sip of asArray(pick(pick(scheme, "Sips"), "Sip"))) {
        const next = isoDate(pick(sip, "nextInstallmentDate"));
        const ceased = isoDate(pick(sip, "ceasedDate"));
        out.push({
          amc: str(pick(h, "amc")),
          scheme: str(pick(scheme, "scheme")),
          isin: str(pick(scheme, "isin")),
          amount_paise: toPaise(pick(sip, "amount")),
          frequency: str(pick(sip, "frequency")),
          next_date: next,
          last_date: isoDate(pick(sip, "lastInstallmentDate")),
          status: ceased ? "ceased" : next ? "active" : "unknown",
        });
      }
    }
  }
  return { kind: "sip", sips: out };
}

/**
 * Parse one decrypted FI document. The type comes from the document
 * (Account@type / namespace), else the hint (e.g. the session's fiType),
 * else DEPOSIT, which is what every document was treated as before.
 */
export function parseFI(
  plaintext: string,
  hint: FiType | null = null,
): ParsedFI {
  const account = accountOf(plaintext);
  const fiType = detectFiType(account) ?? hint ?? "DEPOSIT";
  switch (fiType) {
    case "TERM_DEPOSIT":
    case "RECURRING_DEPOSIT":
      return {
        fi_type: fiType,
        ...common(account, ["maskedAccNumber"]),
        deposit_terms: depositTerms(account),
      };
    case "MUTUAL_FUNDS":
      return {
        fi_type: fiType,
        ...common(account, ["maskedFolioNo", "maskedDematID"]),
        holdings: mutualFunds(account),
      };
    case "EQUITIES":
      return {
        fi_type: fiType,
        ...common(account, ["maskedDematId"]),
        holdings: equities(account),
      };
    case "SIP":
      return {
        fi_type: fiType,
        ...common(account, ["maskedFolioNo"]),
        holdings: sips(account),
      };
    default:
      return { fi_type: "DEPOSIT", ...deposit(account) };
  }
}

/** DEPOSIT only (kept for callers and tests of the verified flow). */
export function parseDepositFI(plaintext: string): ParsedDepositAccount {
  return deposit(accountOf(plaintext));
}
