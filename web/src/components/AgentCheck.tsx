"use client";
import { useState } from "react";
import { BadgeCheck, ShieldAlert, UserSearch } from "lucide-react";
import { useApp } from "@/lib/store";
import { api, MeError } from "@/lib/api";
import { ensureSession } from "@/lib/session";
import type { AgentRecord } from "@/lib/types";

/**
 * "Is this insurance agent real?" — checks the agent's PAN against the IRDAI
 * agent register through Perfios Hub. Nothing is stored: the answer is shown
 * once, here, and dropped.
 */
export default function AgentCheck() {
  const { t, lang } = useApp();
  const [pan, setPan] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ found: boolean; any_active: boolean; records: AgentRecord[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ok = /^[A-Z]{5}\d{4}[A-Z]$/.test(pan.trim().toUpperCase());

  const check = async () => {
    setBusy(true); setErr(null); setRes(null);
    try {
      await ensureSession();
      const r = await api.hubLookup("agent", { pan: pan.trim().toUpperCase() }, false);
      setRes(r.agent ?? { found: false, any_active: false, records: [] });
    } catch (e) {
      const code = e instanceof MeError ? e.code : "";
      setErr(code === "not_found"
        ? t({ hi: "Is PAN par IRDAI register mein koi agent nahi mila. Policy lene se pehle ruk jaayein.", en: "No agent with this PAN in the IRDAI register. Pause before buying through them." })
        : code === "hub_not_configured"
          ? t({ hi: "Is deployment par yeh jaanch abhi judi nahi hai.", en: "This check isn't connected on this deployment yet." })
          : e instanceof MeError ? e.safe : t({ hi: "Jaanch nahi hui. Dobara koshish karein.", en: "The check didn't work. Please try again." }));
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-5 lg:mx-0 rounded-[24px] bg-white p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center h-11 w-11 rounded-full bg-lav"><UserSearch size={20} /></span>
        <div className="flex-1"><p className="font-bold text-sm">{t({ hi: "Bima agent asli hai?", en: "Is this insurance agent real?" })}</p>
          <p className="text-[11px] text-muted leading-snug">{t({ hi: "Agent ka PAN daalein — IRDAI register se jaanch (Perfios Hub). Hum kuch nahi rakhte.", en: "Enter the agent's PAN — checked against the IRDAI register (Perfios Hub). We store nothing." })}</p></div>
      </div>
      <div className="mt-3 flex gap-2">
        <input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} maxLength={10} placeholder="ABCDE1234F" autoComplete="off"
          className="flex-1 min-w-0 rounded-xl bg-cream px-3 py-2.5 text-sm font-bold tracking-wider outline-none" />
        <button onClick={check} disabled={!ok || busy} className="min-h-11 rounded-full bg-ink px-4 text-sm font-bold text-white disabled:opacity-40">
          {busy ? "…" : lang === "hi" ? "Jaanchein" : "Check"}
        </button>
      </div>
      {err && <p className="mt-2 text-[12px] font-bold text-danger">{err}</p>}
      {res && (
        <div className="mt-3 space-y-1.5">
          {res.records.map((a, i) => (
            <div key={i} className={`rounded-xl px-3 py-2 ${a.active ? "bg-mint" : "bg-rose"}`}>
              <p className="flex items-center gap-1.5 text-sm font-bold">{a.active ? <BadgeCheck size={16} /> : <ShieldAlert size={16} />}{a.name || "—"}</p>
              <p className="text-[12px]">{a.insurer} · {a.insurer_type}</p>
              <p className="text-[12px] font-bold">{a.status}</p>
            </div>
          ))}
          <p className="text-[11px] text-muted">{res.any_active
            ? t({ hi: "Kisi ek bima company ke saath active hai. Policy usi company ki hai ya nahi, yeh bhi dekhein.", en: "Active with at least one insurer. Check the policy is from that insurer." })
            : t({ hi: "Koi active agency nahi — is agent se policy na lein.", en: "No active agency — don't buy a policy through this agent." })}</p>
        </div>
      )}
    </div>
  );
}
