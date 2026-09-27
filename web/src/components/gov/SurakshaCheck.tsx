"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, ShieldCheck, Tag, Link2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { gov, paise, pickLink } from "@/lib/gov";
import { inr, day } from "@/lib/format";
import { KINDS_BY_LICENCE, MEMBER_GROUPS, type CoverKind, type DetectedPolicy, type MemberGroup } from "@/lib/contracts/insurance-cover";
import type { SchemeCheckResult, SchemeFinding } from "@/lib/contracts/scheme-check";
import type { SourceLink } from "@/lib/provisional/h03/types";
import type { L } from "@/lib/types";

const SCHEME: Record<SchemeFinding["scheme"], L> = {
  pmjjby: { hi: "PMJJBY · jeevan bima", en: "PMJJBY · life cover" },
  pmsby: { hi: "PMSBY · durghatna bima", en: "PMSBY · accident cover" },
};
const FSTATUS: Record<SchemeFinding["status"], L & { cls: string }> = {
  premium_seen: { hi: "Premium kat raha hai ✓", en: "Premium being paid ✓", cls: "bg-mint text-leaf" },
  not_seen: { hi: "Is khaate se premium nahi dikha", en: "No premium from this account", cls: "bg-amber-soft text-[#9a5f00]" },
  outside_age: { hi: "Umar seema se bahar", en: "Outside the age band", cls: "bg-lav text-muted" },
  unknown: { hi: "Data se pata nahi chalta", en: "The data can't tell", cls: "bg-lav text-muted" },
};
const GROUP: Record<MemberGroup, L> = {
  self: { hi: "Main", en: "Me" }, spouse: { hi: "Pati/Patni", en: "Spouse" }, children: { hi: "Bachche", en: "Children" },
  parents: { hi: "Maa-pitaji", en: "Parents" }, other: { hi: "Aur", en: "Other" },
};
const KIND: Record<CoverKind, L> = {
  health: { hi: "Health", en: "Health" }, life: { hi: "Jeevan", en: "Life" }, motor: { hi: "Gaadi", en: "Motor" },
  accident: { hi: "Durghatna", en: "Accident" }, home: { hi: "Ghar", en: "Home" }, other: { hi: "Aur", en: "Other" },
};
const FREQ: Record<DetectedPolicy["frequency"], L> = {
  monthly: { hi: "har mahine", en: "monthly" }, quarterly: { hi: "har 3 mahine", en: "quarterly" },
  half_yearly: { hi: "har 6 mahine", en: "half-yearly" }, yearly: { hi: "har saal", en: "yearly" },
};

/**
 * Jan Suraksha check + private cover seen, from the member's own live
 * Account Aggregator data. Public before private; facts only, no product.
 * Unknown is never shown as "not enrolled".
 */
export default function SurakshaCheck() {
  const { t, lang } = useApp();
  const router = useRouter();
  const [link, setLink] = useState<SourceLink | null | undefined>(undefined);
  const [check, setCheck] = useState<SchemeCheckResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = async () => {
    try {
      const l = pickLink(await gov.links());
      setLink(l);
      if (l) setCheck(await gov.schemeCheck(l.link_id));
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); setLink(null); }
  };
  useEffect(() => { void load(); }, []);

  const head = (
    <div className="flex items-center gap-2">
      <span className="grid place-items-center h-10 w-10 rounded-full bg-haldi"><ShieldCheck size={20} /></span>
      <div className="flex-1">
        <p className="font-extrabold leading-tight">{t({ hi: "Sarkari bima check", en: "Government insurance check" })}</p>
        <p className="text-[11px] text-muted">{t({ hi: "Aapke bank data se · Anumati AA · pehle sarkari, phir private", en: "From your bank data · Anumati AA · public before private" })}</p>
      </div>
      {link?.is_sandbox && <span className="rounded-full bg-lav px-2 py-0.5 text-[10px] font-bold">UAT</span>}
    </div>
  );

  if (link === undefined) return <div className="mx-5 lg:mx-0 skeleton rounded-[28px] h-32" />;

  if (!link || link.consent.status !== "active") return (
    <div className="mx-5 lg:mx-0 rounded-[28px] bg-white p-4 shadow-soft">
      {head}
      <p className="mt-3 text-[14px]">{link?.consent.status === "awaiting_approval"
        ? t({ hi: "Anumati par manzoori baaki hai. Manzoor hote hi yahan PMJJBY/PMSBY aur aapka private bima dikhega.", en: "Approval at Anumati is pending. Once approved, PMJJBY/PMSBY and your private cover show here." })
        : t({ hi: "Live bank link nahi hai. Anumati se jodne par hum dekhenge ki PMJJBY/PMSBY ka premium kat raha hai ya nahi, aur kaunsa private bima chal raha hai.", en: "No live bank link yet. Link via Anumati and we'll check whether PMJJBY/PMSBY premiums are being paid and which private cover is running." })}</p>
      {err && <p className="mt-2 text-xs text-danger">{err}</p>}
      <button onClick={() => router.push("/?step=consent")} className="mt-3 w-full min-h-12 rounded-[18px] bg-ink text-white font-bold flex items-center justify-center gap-2"><Link2 size={16} />{t({ hi: "Bank jodein (Anumati)", en: "Link bank (Anumati)" })}</button>
    </div>
  );

  if (!check || check.status !== "ready") return (
    <div className="mx-5 lg:mx-0 rounded-[28px] bg-white p-4 shadow-soft">
      {head}
      <p className="mt-3 text-[14px]">
        {check?.status === "not_allowed" ? t({ hi: "Is bank link ke liye aapne 'Alert aur salah' band rakha tha, isliye check nahi chala. Naya link banate waqt use chalu karein.", en: "You kept “Alerts & suggestions” off for this bank link, so the check didn't run. Turn it on when you link again." })
          : check?.status === "unavailable" ? check.safe_message
          : t({ hi: "Bank ka data abhi aa raha hai…", en: "Bank data is still arriving…" })}
      </p>
      {check?.status === "no_data" && <button onClick={() => void load()} className="mt-2 rounded-full bg-lav px-4 min-h-10 text-xs font-bold">{lang === "hi" ? "Dobara dekhein" : "Check again"}</button>}
    </div>
  );

  const ec = check.existing_cover;
  return (
    <div className="mx-5 lg:mx-0 rounded-[28px] bg-white p-4 shadow-soft">
      {head}
      <p className="mt-2 text-[11px] text-muted">{t({ hi: "Data", en: "Data" })}: {check.data_from ? day(check.data_from) : "?"} – {check.data_to ? day(check.data_to) : "?"}{check.holder_age != null ? ` · ${lang === "hi" ? "umar" : "age"} ${check.holder_age}` : ""}{check.renewal_window_checked ? ` · ${lang === "hi" ? "renewal window dekhi" : "renewal window checked"}` : ` · ${lang === "hi" ? "renewal window data mein nahi" : "renewal window not in data"}`}</p>
      <div className="mt-3 space-y-2">
        {check.findings.map((f) => (
          <div key={f.scheme} className="rounded-[18px] bg-lav/40 p-3">
            <p className="font-bold text-[14px]">{t(SCHEME[f.scheme])}</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${FSTATUS[f.status].cls}`}>{t(FSTATUS[f.status])}</span>
            <p className="text-[12px] text-muted mt-0.5">{inr(paise(f.annual_premium))}/{lang === "hi" ? "saal" : "yr"} → {inr(paise(f.cover))} cover · {lang === "hi" ? "judne ki umar" : "join age"} {f.join_age[0]}–{f.join_age[1]}</p>
            {f.evidence && <p className="text-[12px] mt-1"><span className="rounded bg-white px-1.5 text-[10px] font-bold">AA</span> {day(f.evidence.date)} · {inr(paise(f.evidence.amount))} · {f.evidence.account_label}</p>}
            {f.status === "not_seen" && <p className="text-[11px] text-muted mt-1">{t({ hi: "Ho sakta hai kisi aur khaate se kat raha ho — bank se poochh lein.", en: "It may be paid from another account — check with your bank." })}</p>}
          </div>
        ))}
      </div>
      {check.suggest.length > 0 ? (
        <div className="mt-3 rounded-[18px] bg-haldi-soft p-3 text-[13px]">
          <p className="font-bold">{t({ hi: "Pehla kadam (sarkari):", en: "First step (public):" })} {check.suggest.map((s) => s.toUpperCase()).join(" + ")}</p>
          <p className="mt-0.5">{t({ hi: `Kul ${inr(paise(check.suggest_total_premium))}/saal mein ${inr(paise(check.suggest_total_cover))} cover. Bank branch, bank mitra ya net banking se; premium auto-debit hota hai. DhanYukti ko ₹0 milta hai.`, en: `${inr(paise(check.suggest_total_premium))}/year in total for ${inr(paise(check.suggest_total_cover))} of cover. At your branch, a bank mitra or net banking; premium is auto-debited. DhanYukti earns ₹0.` })}</p>
        </div>
      ) : check.findings.some((f) => f.status === "premium_seen") ? (
        <p className="mt-3 rounded-[18px] bg-mint/60 p-3 text-[13px]">{t({ hi: `Agla auto-debit ${day(check.next_renewal_by)} tak — khaate mein itna paisa rakhein.`, en: `Next auto-debit by ${day(check.next_renewal_by)} — keep enough in the account.` })}</p>
      ) : null}

      {ec && (
        <div className="mt-4">
          <p className="font-extrabold text-[14px] flex items-center gap-1.5"><Landmark size={15} />{t({ hi: "Private bima jo chal raha hai", en: "Private cover being paid" })}</p>
          {ec.policies.length === 0 ? <p className="text-[13px] text-muted mt-1">{t({ hi: "Is data mein koi private premium nahi dikha.", en: "No private premiums in this data." })}</p> : (
            <div className="mt-2 space-y-2">
              {ec.policies.map((p) => <PolicyRow key={p.policy_key} p={p} linkId={link.link_id} tagging={ec.tagging_allowed} onSaved={() => void load()} />)}
              <p className="text-[11px] text-muted">{ec.summary.policies_found} {t({ hi: "policy mili", en: "policies found" })} · {ec.summary.policies_tagged} {t({ hi: "par aapne bataya kiske liye", en: "tagged by you" })}{ec.summary.yearly_premiums_total ? ` · ${inr(paise(ec.summary.yearly_premiums_total))}/${lang === "hi" ? "saal" : "yr"}` : ""}</p>
            </div>
          )}
          {!ec.tagging_allowed && ec.policies.length > 0 && (
            <button onClick={() => gov.setDpdp("insurance_tags", "grant").then(() => load())} className="mt-2 w-full min-h-11 rounded-[16px] bg-lav font-bold text-[13px] flex items-center justify-center gap-1.5"><Tag size={14} />{t({ hi: "Batayein kaunsa bima kiske liye (consent)", en: "Tell us who each policy covers (consent)" })}</button>
          )}
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted">{t({ hi: "Sirf tathya, koi product ya salah nahi. Company ka naam aapko pehchaanne ke liye hai — bima engine ko nahi jaata.", en: "Facts only — no product, no advice. Insurer names are for you to recognise; the cover engine never receives them." })}</p>
    </div>
  );
}

function PolicyRow({ p, linkId, tagging, onSaved }: { p: DetectedPolicy; linkId: string; tagging: boolean; onSaved: () => void }) {
  const { t, lang } = useApp();
  const [edit, setEdit] = useState(false);
  const [covers, setCovers] = useState<MemberGroup[]>(p.tags?.covers ?? []);
  const [kind, setKind] = useState<CoverKind | null>(p.tags?.kind ?? null);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    if (!kind || !covers.length) { setErr(t({ hi: "Kiske liye aur kis tarah ka, dono chunein", en: "Choose who and what kind" })); return; }
    try { await gov.tagPolicy(linkId, p.policy_key, covers, kind); setEdit(false); onSaved(); } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
  };
  return (
    <div className="rounded-[18px] bg-lav/40 p-3 text-[13px]">
      <div className="flex items-center gap-2">
        <p className="flex-1 font-bold">{p.insurer}</p>
        <span className="text-[12px] font-bold num">{inr(paise(p.yearly_premium))}/{lang === "hi" ? "saal" : "yr"}</span>
      </div>
      <p className="text-[11px] text-muted">{t(FREQ[p.frequency])} · {p.payments_seen} {lang === "hi" ? "baar dikha" : "payments seen"} · {lang === "hi" ? "aakhri" : "last"} {day(p.last_paid.date)} · {p.account_label}</p>
      {p.tags && !edit && <p className="mt-1 text-[12px]"><b>{t(KIND[p.tags.kind])}</b> · {p.tags.covers.map((g) => t(GROUP[g])).join(", ")}</p>}
      {tagging && !edit && <button onClick={() => setEdit(true)} className="mt-1 text-[12px] font-bold text-clay">{p.tags ? (lang === "hi" ? "Badlein" : "Change") : (lang === "hi" ? "Kiske liye hai?" : "Who does it cover?")}</button>}
      {edit && (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-1.5">{MEMBER_GROUPS.map((g) => <button key={g} onClick={() => setCovers(covers.includes(g) ? covers.filter((x) => x !== g) : [...covers, g])} className={`rounded-full px-2.5 min-h-8 text-[12px] font-bold ${covers.includes(g) ? "bg-leaf text-white" : "bg-white"}`}>{t(GROUP[g])}</button>)}</div>
          <div className="flex flex-wrap gap-1.5">{KINDS_BY_LICENCE[p.licence].map((k) => <button key={k} onClick={() => setKind(k)} className={`rounded-full px-2.5 min-h-8 text-[12px] font-bold ${kind === k ? "bg-ink text-white" : "bg-white"}`}>{t(KIND[k])}</button>)}</div>
          {err && <p className="text-[12px] text-danger">{err}</p>}
          <div className="flex gap-2"><button onClick={() => setEdit(false)} className="rounded-full bg-white px-4 min-h-9 text-xs font-bold">{lang === "hi" ? "Rehne dein" : "Cancel"}</button><button onClick={save} className="rounded-full bg-ink text-white px-4 min-h-9 text-xs font-bold">{lang === "hi" ? "Save" : "Save"}</button></div>
        </div>
      )}
    </div>
  );
}
