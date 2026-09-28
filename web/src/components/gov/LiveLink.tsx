"use client";
import { DEFAULT_FI_TYPES, fiTypeList } from "@/lib/aa/fi-types";
import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Landmark, ShieldOff, Loader2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { gov, paise } from "@/lib/gov";
import { inr } from "@/lib/format";
import type { L } from "@/lib/types";
import type { ConsentStatus, LinkActivity, SourceLink } from "@/lib/provisional/h03/types";

const STATUS: Record<ConsentStatus, L & { cls: string }> = {
  requested: { hi: "Request bani", en: "Requested", cls: "bg-white/15" },
  awaiting_approval: { hi: "Manzoori ka intezaar", en: "Waiting for approval", cls: "bg-amber-soft text-[#9a5f00]" },
  active: { hi: "Chalu", en: "Active", cls: "bg-mint text-leaf" },
  denied: { hi: "Mana kiya", en: "Declined", cls: "bg-danger-soft text-danger" },
  expired: { hi: "Khatam", en: "Expired", cls: "bg-white/15" },
  revoked: { hi: "Band kiya", en: "Revoked", cls: "bg-danger-soft text-danger" },
  paused: { hi: "Pata nahi", en: "Status not known", cls: "bg-white/15" },
  failed: { hi: "Pata nahi", en: "Status not known", cls: "bg-white/15" },
};

const EVENT: Record<LinkActivity["event"], L> = {
  requested: { hi: "Aapne request banayi", en: "You made the request" },
  sent_to_aa: { hi: "Anumati ko bheja", en: "Sent to Anumati" },
  approved: { hi: "Aapne Anumati par manzoor kiya", en: "You approved at Anumati" },
  declined: { hi: "Mana kiya", en: "Declined" },
  data_ready: { hi: "Bank ne data bheja", en: "Bank sent the data" },
  fetched: { hi: "Data khola aur padha", en: "Data decrypted and read" },
  fetch_failed: { hi: "Data nahi aaya", en: "Data didn't arrive" },
  decrypt_failed: { hi: "Data khul nahi paaya", en: "Couldn't decrypt" },
  revoked: { hi: "Band kiya — data mitaya", en: "Revoked — data deleted" },
  expired: { hi: "Consent khatam", en: "Consent expired" },
  paused: { hi: "Ruka", en: "Paused" },
  consent_failed: { hi: "Consent fail", en: "Consent failed" },
};

/** Poll one live link until it settles (active + import finished, or ended). */
export function useLivePoll(linkId: string | null, onSettled?: (l: SourceLink) => void) {
  const [link, setLink] = useState<SourceLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const settledRef = useRef(false);
  const cb = useRef(onSettled);
  useEffect(() => { cb.current = onSettled; });
  useEffect(() => {
    if (!linkId) return;
    settledRef.current = false;
    let alive = true;
    const tick = async () => {
      try {
        const l = await gov.link(linkId);
        if (!alive) return;
        setLink(l); setError(null);
        const done = (l.consent.status === "active" && ["complete", "partial", "failed"].includes(l.import.status)) || ["denied", "revoked", "expired"].includes(l.consent.status);
        if (done && !settledRef.current) { settledRef.current = true; cb.current?.(l); }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : "error"); }
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(id); };
  }, [linkId]);
  return { link, error, setLink };
}

export default function LiveLinkCard({ link, onChange, redirectUrl }: { link: SourceLink; onChange?: (l: SourceLink) => void; redirectUrl?: string | null }) {
  const { t, lang } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const st = STATUS[link.consent.status];
  const revoke = async () => {
    setBusy(true);
    try { onChange?.(await gov.revokeLink(link.link_id)); } finally { setBusy(false); setConfirm(false); }
  };
  return (
    <div className="rounded-[28px] bg-ink text-white p-4 relative overflow-hidden">
      <div className="absolute right-0 top-0 h-full w-2 bg-[repeating-linear-gradient(0deg,#F7C548_0_8px,transparent_8px_14px)] opacity-60" />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="rounded-full bg-haldi text-ink text-[11px] font-extrabold px-2.5 py-1">AA · Anumati {link.is_sandbox ? "UAT" : ""}</span>
        <span className={`rounded-full text-[11px] font-extrabold px-2.5 py-1 ${st.cls}`}>{t(st)}</span>
        <span className="ml-auto text-[11px] font-bold text-haldi">LIVE</span>
      </div>
      <p className="mt-2 text-sm font-semibold">{link.source_label}</p>
      <p className="text-[11px] text-white/60">
        {lang === "hi" ? "Maksad" : "Purpose"}: {lang === "hi" ? "Aggregated statement (103)" : "Aggregated statement (code 103)"} · {link.terms.history_months} {lang === "hi" ? "mahine" : "months"} · {lang === "hi" ? "ek baar fetch" : "fetched once"}
      </p>
      <p className="text-[11px] text-white/60">
        {lang === "hi" ? "Kya share kiya" : "Shared"}: {fiTypeList(link.fi_types ?? DEFAULT_FI_TYPES, lang)}
      </p>
      <p className="text-[11px] text-white/60">
        {lang === "hi" ? "Parivaar ke hisaab mein" : "Household calculation"}: {link.grants.household_computation ? "✓" : "✗"} · {lang === "hi" ? "Alert/salah" : "Alerts & actions"}: {link.grants.alerts_and_actions ? "✓" : "✗"} · {lang === "hi" ? "Kaun dekhe" : "Who sees"}: {link.grants.viewer_scope === "only_me" ? (lang === "hi" ? "sirf main" : "only me") : (lang === "hi" ? "ghar ke bade" : "household adults")}
      </p>

      {link.import.accounts.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {link.import.accounts.map((a) => (
            <div key={a.account_id} className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-[13px]">
              <Landmark size={16} className="text-haldi shrink-0" />
              <span className="flex-1 truncate">{a.account_label}</span>
              <span className="font-bold num">{a.balance ? inr(paise(a.balance)) : a.status === "processing" ? "…" : "—"}</span>
            </div>
          ))}
        </div>
      )}

      {link.consent.status === "awaiting_approval" && redirectUrl && (
        <a href={redirectUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 min-h-12 rounded-[18px] bg-haldi text-ink font-bold">
          <ExternalLink size={18} />{lang === "hi" ? "Anumati kholein (naya tab)" : "Open Anumati (new tab)"}
        </a>
      )}
      {(link.consent.status === "awaiting_approval" || (link.consent.status === "active" && link.import.status === "processing")) && (
        <p className="mt-2 flex items-center gap-2 text-xs text-white/70"><Loader2 size={14} className="animate-spin" />
          {link.consent.status === "awaiting_approval" ? t({ hi: "Anumati par manzoor karne ka intezaar…", en: "Waiting for you to approve at Anumati…" }) : t({ hi: "Bank se data aa raha hai…", en: "Data arriving from the bank…" })}
        </p>
      )}

      {(link.activity?.length ?? 0) > 0 && (
        <details className="mt-3 text-[12px]">
          <summary className="cursor-pointer font-bold text-white/80">{lang === "hi" ? "Kya hua (trail)" : "What happened"}</summary>
          <ol className="mt-2 space-y-1">
            {link.activity!.map((a, i) => (
              <li key={i} className="flex items-center gap-2"><Check size={12} className="text-haldi shrink-0" />
                <span className="flex-1">{t(EVENT[a.event])}{a.ref ? ` · ${a.ref}` : ""}</span>
                <span className="text-white/50 num">{new Date(a.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ol>
        </details>
      )}

      {(link.consent.status === "active" || link.consent.status === "paused") && (
        !confirm ? (
          <button onClick={() => setConfirm(true)} className="mt-3 w-full min-h-12 rounded-[18px] bg-white/10 border border-white/20 font-bold flex items-center justify-center gap-2">
            <ShieldOff size={18} />{lang === "hi" ? "Consent band karein" : "Revoke consent"}
          </button>
        ) : (
          <div className="mt-3 rounded-[18px] bg-white/10 p-3 text-[13px]">
            <p>{t({ hi: "DhanYukti ki copy turant mitegi aur aage ka data mana hoga. Anumati par consent khatam karne ke liye Anumati app bhi kholein.", en: "DhanYukti's copy is deleted now and late data is refused. To end the consent at the AA too, also end it in the Anumati app." })}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => setConfirm(false)} className="min-h-11 rounded-[14px] bg-white/15 font-bold">{lang === "hi" ? "Nahi" : "Cancel"}</button>
              <button disabled={busy} onClick={revoke} className="min-h-11 rounded-[14px] bg-danger font-bold disabled:opacity-50">{lang === "hi" ? "Haan, band" : "Yes, revoke"}</button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
