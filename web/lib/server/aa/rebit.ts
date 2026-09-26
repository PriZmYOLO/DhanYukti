/**
 * Parse a decrypted ReBIT FI "DEPOSIT" document (JSON or XML) into the few
 * facts the app uses. Amounts become integer paise; a value that can't be
 * read stays null (unknown is not zero). Nothing is inferred here: income,
 * obligations and spending are the financial engines' job.
 *
 * No path aliases, so the mock and check scripts can import it too.
 */

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
  transactions: ParsedTransaction[];
}

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

function fromJson(doc: unknown): ParsedDepositAccount {
  const account = pick(doc, "Account") ?? doc;
  const summary = pick(account, "Summary");
  const txns = pick(account, "Transactions");
  const list = asArray(pick(txns, "Transaction")).map(txn);
  const holder = asArray(
    pick(pick(pick(account, "Profile"), "Holders"), "Holder"),
  )[0];
  return {
    masked_acc_number: str(pick(account, "maskedAccNumber")),
    account_type: str(pick(summary, "type")),
    balance_paise: toPaise(pick(summary, "currentBalance")),
    balance_at: str(pick(summary, "balanceDateTime")),
    data_from: isoDate(pick(txns, "startDate")),
    data_to: isoDate(pick(txns, "endDate")),
    holder_dob: isoDate(pick(holder, "dob")),
    transactions: list,
  };
}

/** Attributes of every <tag .../> or <tag ...> occurrence. */
function xmlAttrs(xml: string, tag: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const re = new RegExp(`<(?:\\w+:)?${tag}\\b([^>]*)>`, "gi");
  for (const match of xml.matchAll(re)) {
    const attrs: Record<string, string> = {};
    for (const a of match[1].matchAll(/([\w:]+)\s*=\s*"([^"]*)"/g)) {
      attrs[a[1].replace(/^\w+:/, "")] = a[2];
    }
    out.push(attrs);
  }
  return out;
}

function fromXml(xml: string): ParsedDepositAccount {
  const account = xmlAttrs(xml, "Account")[0] ?? {};
  const summary = xmlAttrs(xml, "Summary")[0] ?? {};
  const txns = xmlAttrs(xml, "Transactions")[0] ?? {};
  return {
    masked_acc_number: str(pick(account, "maskedAccNumber")),
    account_type: str(pick(summary, "type")),
    balance_paise: toPaise(pick(summary, "currentBalance")),
    balance_at: str(pick(summary, "balanceDateTime")),
    data_from: isoDate(pick(txns, "startDate")),
    data_to: isoDate(pick(txns, "endDate")),
    holder_dob: isoDate(pick(xmlAttrs(xml, "Holder")[0], "dob")),
    transactions: xmlAttrs(xml, "Transaction").map(txn),
  };
}

export function parseDepositFI(plaintext: string): ParsedDepositAccount {
  const text = plaintext.trim();
  if (text.startsWith("<")) return fromXml(text);
  return fromJson(JSON.parse(text));
}
