"use client";
import { useCallback, useEffect, useState } from "react";
import { Zap, Flame, Bike, Wheat, PiggyBank, IdCard, Check, Trash2, TriangleAlert } from "lucide-react";
import { useApp } from "@/lib/store";
import { api, ME, MeError, type HubLookupKind } from "@/lib/api";
import { ensureSession } from "@/lib/session";
import { ELECTRICITY_BOARDS, GAS_PROVIDERS, NEEDS_DISTRICT } from "@/lib/hub-providers";
import type { HubRecord, L } from "@/lib/types";

/** Perfios Hub records. A linked member looks up THEIR OWN records (live); demo households replay. */
export default function Enrich() {
  const { hid } = useApp();
  return hid === ME ? <MyRecords /> : <DemoEnrich />;
}

// ------------------------------------------------------------------------------------------------
// The linked member's own records
// ------------------------------------------------------------------------------------------------
type RecKind = "electricity" | "png" | "ration" | "epf" | "rc" | "dl";
const RECORDS: { k: RecKind; Icon: typeof Zap; name: L; why: L; keep: L; bg: string; stores: HubRecord["kind"][] }[] = [
  { k: "electricity", Icon: Zap, name: { hi: "Bijli ka bill", en: "Electricity bill" }, bg: "bg-haldi-soft", stores: ["electricity"],
    why: { hi: "Board se asli aakhri tareekh aur rakam — aapke mahine ke plan mein pakki", en: "The board's real due date and amount — marked certain in your month plan" },
    keep: { hi: "Rakhte hain: board, bill, bakaya, aakhri tareekh. Naam/pata nahi.", en: "We keep: board, bill, amount due, due date. No name or address." } },
  { k: "png", Icon: Flame, name: { hi: "Gas (PNG) ka bill", en: "Piped gas (PNG) bill" }, bg: "bg-rose", stores: ["png"],
    why: { hi: "Gas bill ki tareekh aur rakam plan mein", en: "Your gas bill's date and amount in the plan" },
    keep: { hi: "Rakhte hain: company, bill, aakhri tareekh.", en: "We keep: company, bill, due date." } },
  { k: "ration", Icon: Wheat, name: { hi: "Ration card", en: "Ration card" }, bg: "bg-mint", stores: ["ration"],
    why: { hi: "AAY / priority card ho to Ayushman jaisi yojana ka ishaara", en: "An AAY / priority card points to schemes like Ayushman" },
    keep: { hi: "Rakhte hain: card ki shreni, rajya, sadasyon ki ginti. Naam nahi.", en: "We keep: card category, state, number of members. No names." } },
  { k: "epf", Icon: PiggyBank, name: { hi: "PF passbook (EPFO OTP)", en: "PF passbook (EPFO OTP)" }, bg: "bg-lav", stores: ["epf"],
    why: { hi: "PF retirement ki bachat — dikhayenge, kharch mein nahi ginenge. Naukri ke saath EDLI bima bhi.", en: "PF is retirement savings — shown, never counted as spendable. Active PF also means EDLI life cover." },
    keep: { hi: "Rakhte hain: PF/pension balance, aakhri jama ka mahina.", en: "We keep: PF/pension balance, last contribution month." } },
  { k: "rc", Icon: Bike, name: { hi: "Gaadi (RC + challan)", en: "Vehicle (RC + challans)" }, bg: "bg-haldi-soft", stores: ["rc", "challan"],
    why: { hi: "Bima / PUC khatam hone se pehle yaad, aur bakaya challan", en: "Reminders before insurance / PUC run out, and unpaid challans" },
    keep: { hi: "Rakhte hain: tareekhein, loan haan/nahi, bakaya challan. Maalik ka naam nahi.", en: "We keep: dates, loan yes/no, unpaid challans. No owner name." } },
  { k: "dl", Icon: IdCard, name: { hi: "Driving licence", en: "Driving licence" }, bg: "bg-mint", stores: ["dl"],
    why: { hi: "Kaam wala (commercial) licence khatam hone se pehle yaad", en: "A reminder before your (commercial) licence runs out" },
    keep: { hi: "Rakhte hain: sthiti aur aakhri tareekh. Janm tithi/photo nahi.", en: "We keep: status and end dates. No birth date or photo." } },
];

const ERR: Record<string, L> = {
  hub_not_configured: { hi: "Is deployment par record lookup abhi juda nahi hai.", en: "Record lookups aren't connected on this deployment yet." },
  not_found: { hi: "Is number ka koi record nahi mila. Number dobara dekhein.", en: "No record found for that number. Please check it." },
  invalid_input: { hi: "Source ne yeh number nahi maana. Dobara dekhein.", en: "The source didn't accept that number. Please check it." },
  source_unavailable: { hi: "Sarkari source abhi band hai. Thodi der baad koshish karein.", en: "The government source is down. Please try later." },
  otp_expired: { hi: "OTP ka samay nikal gaya. Naya OTP maangein.", en: "The OTP request expired. Ask for a new OTP." },
  daily_limit: { hi: "Aaj ke liye kaafi lookup ho gaye. Kal koshish karein.", en: "That's enough lookups for today. Try again tomorrow." },
  consent_required: { hi: "Pehle anumati dein.", en: "Please give permission first." },
  invalid_request: { hi: "Di gayi jaankari dobara dekhein.", en: "Please check the details you entered." },
  engine_unreachable: { hi: "Engine jaag raha hai — ek minute mein dobara try karein.", en: "The engine is waking up — try again in a minute." },
};

function Field({ label, value, onChange, placeholder, type = "text", mode }: {
  label: L; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mode?: "numeric" | "text";
}) {
  const { t } = useApp();
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase text-muted">{t(label)}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} inputMode={mode}
        className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-ink/20" autoComplete="off" />
    </label>
  );
}

function MyRecords() {
  const { t, lang, data, refresh } = useApp();
  const [stored, setStored] = useState<Record<string, unknown>>({});
  const [open, setOpen] = useState<RecKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<L | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const [agree, setAgree] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const load = useCallback(() => { api.hubFacts().then((r) => setStored(r.facts)).catch(() => {}); }, []);
  useEffect(load, [load]);

  const start = (k: RecKind) => { setOpen(open === k ? null : k); setErr(null); setF({}); setAgree(false); setOtpSent(false); };

  const run = async (kind: HubLookupKind, input: Record<string, string>) => {
    setBusy(true); setErr(null);
    try {
      await ensureSession();
      const r = await api.hubLookup(kind, input, true);
      if (r.otp_sent) { setOtpSent(true); return; }
      setOpen(null); load(); await refresh();
    } catch (e) {
      const code = e instanceof MeError ? e.code : "engine_unreachable";
      setErr(ERR[code] ?? { hi: "Lookup nahi hua. Dobara koshish karein.", en: e instanceof MeError ? e.safe : "The lookup didn't work. Please try again." });
    } finally { setBusy(false); }
  };

  const remove = async (k: RecKind) => {
    setBusy(true);
    try { await api.hubForget(k); load(); await refresh(); } catch { /* shown by the list staying */ } finally { setBusy(false); }
  };

  const records = data?.records ?? [];
  const notes = data?.records_notes ?? [];
  return (
    <div className="mx-5 lg:mx-0 space-y-2">
      {notes.map((n, i) => (
        <p key={i} className="flex gap-2 rounded-2xl bg-haldi-soft p-3 text-sm font-bold"><TriangleAlert size={18} className="shrink-0" />{t(n)}</p>
      ))}
      {RECORDS.map(({ k, Icon, name, why, keep, bg, stores }) => {
        const have = stores.some((s) => s in stored);
        const lines = records.filter((r) => stores.includes(r.kind));
        return (
          <div key={k} className={`rounded-[24px] p-3 ${bg}`}>
            <div className="flex items-center gap-3">
              <span className="grid place-items-center h-11 w-11 rounded-full bg-white/80"><Icon size={20} /></span>
              <div className="flex-1 min-w-0"><p className="font-bold text-sm">{t(name)}</p><p className="text-[11px] opacity-70 leading-snug">{t(why)}</p></div>
              {have ? (
                <span className="grid place-items-center h-9 w-9 rounded-full bg-leaf text-white"><Check size={18} /></span>
              ) : (
                <button onClick={() => start(k)} className="min-h-10 rounded-full bg-ink text-white px-3 text-xs font-bold">
                  {open === k ? (lang === "hi" ? "Band" : "Close") : lang === "hi" ? "Jodein" : "Add"}
                </button>
              )}
            </div>

            {have && (
              <div className="mt-2 space-y-1.5">
                {k === "rc" && "rc" in stored && !("challan" in stored) && (
                  <div className="rounded-xl bg-white/75 px-3 py-2">
                    <p className="text-xs font-bold leading-snug">{t({ hi: "E-challan abhi check nahi ho paaye — RTO ka source jawab nahi de raha.", en: "E-challans couldn't be checked — the RTO source isn't answering right now." })}</p>
                    <button onClick={() => { setOpen("rc"); setErr(null); setF({}); setAgree(false); }} className="mt-1 text-[12px] font-bold underline">
                      {lang === "hi" ? "Challan dobara check karein" : "Check challans again"}
                    </button>
                  </div>
                )}
                {lines.map((r) => (
                  <div key={r.kind} className="rounded-xl bg-white/75 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase text-muted">{t(r.title)}</p>
                    {r.lines.map((l, i) => <p key={i} className="text-xs font-bold leading-snug">{t(l)}</p>)}
                  </div>
                ))}
                <div className="flex items-center justify-between px-1">
                  <p className="text-[11px] text-muted">Perfios Hub · live · {lang === "hi" ? "30 din tak" : "kept 30 days"}</p>
                  <button disabled={busy} onClick={() => remove(k)} className="flex items-center gap-1 text-[11px] font-bold text-danger disabled:opacity-40">
                    <Trash2 size={13} /> {lang === "hi" ? "Hatayein" : "Remove"}
                  </button>
                </div>
              </div>
            )}

            {open === k && (!have || (k === "rc" && !("challan" in stored))) && (
              <form className="mt-3 space-y-2 rounded-2xl bg-white/60 p-3" onSubmit={(e) => {
                e.preventDefault();
                if (k === "epf" && otpSent) return run("epf", { otp: f.otp ?? "", uan: f.uan ?? "" });
                if (k === "epf") return run("epf_otp", { uan: f.uan ?? "", mobile: f.mobile ?? "" });
                return run(k, f);
              }}>
                {k === "electricity" && (<>
                  <label className="block"><span className="text-[11px] font-bold uppercase text-muted">{t({ hi: "Bijli board", en: "Electricity board" })}</span>
                    <select value={f.board ?? ""} onChange={(e) => set("board")(e.target.value)} className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 text-sm font-bold">
                      <option value="">{lang === "hi" ? "Chunein" : "Choose"}</option>
                      {ELECTRICITY_BOARDS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                    </select></label>
                  <Field label={{ hi: "Consumer / account number (bill par)", en: "Consumer / account number (on the bill)" }} value={f.consumer_no ?? ""} onChange={set("consumer_no")} />
                  {NEEDS_DISTRICT.has(f.board ?? "") && <Field label={{ hi: "Zila / division (bill par jaisa)", en: "District / division (as on the bill)" }} value={f.district ?? ""} onChange={set("district")} />}
                  {f.board === "KERALA" && <Field label={{ hi: "Bill par registered mobile", en: "Mobile registered on the bill" }} value={f.reg_mobile ?? ""} onChange={set("reg_mobile")} mode="numeric" />}
                </>)}
                {k === "png" && (<>
                  <label className="block"><span className="text-[11px] font-bold uppercase text-muted">{t({ hi: "Gas company", en: "Gas company" })}</span>
                    <select value={f.provider ?? ""} onChange={(e) => set("provider")(e.target.value)} className="mt-1 w-full rounded-xl bg-white px-3 py-2.5 text-sm font-bold">
                      <option value="">{lang === "hi" ? "Chunein" : "Choose"}</option>
                      {GAS_PROVIDERS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                    </select></label>
                  {GAS_PROVIDERS.find(([c]) => c === f.provider)?.[2] !== "bp" && <Field label={{ hi: "Consumer number", en: "Consumer number" }} value={f.consumer_no ?? ""} onChange={set("consumer_no")} />}
                  {["bp", "both"].includes(GAS_PROVIDERS.find(([c]) => c === f.provider)?.[2] ?? "") && <Field label={{ hi: "BP number", en: "BP number" }} value={f.bp_no ?? ""} onChange={set("bp_no")} />}
                </>)}
                {k === "ration" && <Field label={{ hi: "Ration card number", en: "Ration card number" }} value={f.card_no ?? ""} onChange={set("card_no")} />}
                {k === "epf" && !otpSent && (<>
                  <Field label={{ hi: "UAN (12 ank)", en: "UAN (12 digits)" }} value={f.uan ?? ""} onChange={set("uan")} mode="numeric" />
                  <p className="text-[11px] text-muted">{t({ hi: "EPFO aapke registered mobile par OTP bhejega.", en: "EPFO will send an OTP to your registered mobile." })}</p>
                </>)}
                {k === "epf" && otpSent && <Field label={{ hi: "EPFO ka OTP (6 ank)", en: "OTP from EPFO (6 digits)" }} value={f.otp ?? ""} onChange={set("otp")} mode="numeric" />}
                {k === "rc" && <Field label={{ hi: "Gaadi number", en: "Vehicle number" }} value={f.reg_no ?? ""} onChange={set("reg_no")} placeholder="MH04AB1234" />}
                {k === "dl" && (<>
                  <Field label={{ hi: "Licence number", en: "Licence number" }} value={f.dl_no ?? ""} onChange={set("dl_no")} />
                  <Field label={{ hi: "Janm tithi (sirf jaanch ke liye, rakhte nahi)", en: "Date of birth (used to check, never kept)" }} value={f.dob ?? ""} onChange={set("dob")} type="date" />
                </>)}

                {!(k === "epf" && otpSent) && (
                  <label className="flex items-start gap-2 text-[12px] leading-snug">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4" />
                    <span>{t({ hi: "Main DhanYukti ko Perfios ke zariye yeh record dekhne ki anumati deta/deti hoon.", en: "I allow DhanYukti to look up this record through Perfios." })} {t(keep)} {t({ hi: "30 din tak; kabhi bhi hatayein.", en: "Kept up to 30 days; remove any time." })}</span>
                  </label>
                )}
                {err && <p className="text-[12px] font-bold text-danger">{t(err)}</p>}
                <button type="submit" disabled={busy || (!agree && !(k === "epf" && otpSent))}
                  className="w-full min-h-11 rounded-full bg-ink text-white text-sm font-bold disabled:opacity-40">
                  {busy ? "…" : k === "epf" && !otpSent ? (lang === "hi" ? "OTP bhejo" : "Send OTP") : k === "epf" ? (lang === "hi" ? "OTP jaanchein" : "Check OTP") : (lang === "hi" ? "Dekhein aur jodein" : "Look up and add")}
                </button>
              </form>
            )}
          </div>
        );
      })}
      <p className="text-[11px] text-muted px-1">{t({ hi: "Har record ki alag anumati (Value Ledger mein receipt). Sirf zaroori jaankari rakhte hain; source ka poora jawaab nahi.", en: "Separate permission for each record (receipt in your Value Ledger). We keep only what changes a decision, never the full answer." })}</p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Demo households (fictional): replayed, never a live lookup
// ------------------------------------------------------------------------------------------------
type DemoKind = "electricity" | "rc" | "ration" | "epf";
const DEMO: { k: DemoKind; Icon: typeof Zap; name: L; why: L; bg: string }[] = [
  { k: "electricity", Icon: Zap, name: { hi: "Bijli ka bill", en: "Electricity bill" }, why: { hi: "Bill ki pakki tareekh calendar mein", en: "Confirmed bill date in your calendar" }, bg: "bg-haldi-soft" },
  { k: "rc", Icon: Bike, name: { hi: "Gaadi (RC)", en: "Vehicle (RC)" }, why: { hi: "Kaam ki gaadi ka bima kab khatam", en: "When your work vehicle's insurance ends" }, bg: "bg-lav" },
  { k: "ration", Icon: Wheat, name: { hi: "Ration card", en: "Ration card" }, why: { hi: "Sarkari yojana ke liye", en: "For welfare scheme hints" }, bg: "bg-mint" },
  { k: "epf", Icon: PiggyBank, name: { hi: "PF passbook", en: "EPF passbook" }, why: { hi: "Retirement bachat — kharch ke liye nahi", en: "Retirement savings — locked, not spendable" }, bg: "bg-rose" },
];

function DemoEnrich() {
  const { hid, t, lang } = useApp();
  const [res, setRes] = useState<Partial<Record<DemoKind, { used_for: L; mode: string; result: Record<string, unknown> }>>>({});
  const [busy, setBusy] = useState<DemoKind | null>(null);
  const run = async (k: DemoKind) => {
    setBusy(k);
    try { const r = await api.enrich(hid, k); setRes((x) => ({ ...x, [k]: r })); } catch { /* shown as not connected */ } finally { setBusy(null); }
  };
  return (
    <div className="mx-5 lg:mx-0 space-y-2">
      {DEMO.map(({ k, Icon, name, why, bg }) => {
        const r = res[k];
        return (
          <div key={k} className={`rounded-[24px] p-3 ${bg}`}>
            <div className="flex items-center gap-3">
              <span className="grid place-items-center h-11 w-11 rounded-full bg-white/80"><Icon size={20} /></span>
              <div className="flex-1"><p className="font-bold text-sm">{t(name)}</p><p className="text-[11px] opacity-70 leading-snug">{r ? t(r.used_for) : t(why)}</p></div>
              {r ? <span className="grid place-items-center h-9 w-9 rounded-full bg-leaf text-white"><Check size={18} /></span> : (
                <button onClick={() => run(k)} disabled={busy === k} className="min-h-10 rounded-full bg-ink text-white px-3 text-xs font-bold disabled:opacity-50">
                  {busy === k ? "…" : lang === "hi" ? "Haan, jodo" : "Yes, add"}
                </button>
              )}
            </div>
            {r && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {Object.entries(r.result).filter(([, v]) => typeof v !== "object").slice(0, 4).map(([key, v]) => (
                  <div key={key} className="rounded-xl bg-white/70 px-2.5 py-1.5"><p className="text-[11px] uppercase font-bold text-muted truncate">{key.replace(/_/g, " ")}</p><p className="text-xs font-bold truncate">{String(v)}</p></div>
                ))}
                <p className="col-span-2 text-[11px] text-muted">Perfios Hub · {lang === "hi" ? "demo parivaar (replay)" : "demo family (replay)"}</p>
              </div>
            )}
          </div>
        );
      })}
      <p className="text-[11px] text-muted px-1">{t({ hi: "Demo parivaar kaalpanik hai — yeh jaankari replay hai. Apna bank jodne par aapke asli record live dekhe jaate hain.", en: "Demo families are fictional — this is replayed. Link your own bank to look up your real records live." })}</p>
    </div>
  );
}
