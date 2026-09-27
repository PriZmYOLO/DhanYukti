"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, ShieldCheck, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { HelpLink } from "@/components/ui/bits";

/**
 * Replay-mode stand-in for the Account Aggregator approval screen.
 * In live mode the user is redirected to Anumati's real sandbox URL instead.
 */
export default function AnumatiSim() {
  const router = useRouter();
  const { t, lang } = useApp();
  const [handle, setHandle] = useState(""); const [mobile, setMobile] = useState("");
  const [accts, setAccts] = useState([true, true]);
  const [otp, setOtp] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { const p = new URLSearchParams(location.search); setHandle(p.get("handle") ?? ""); setMobile(p.get("mobile") ?? ""); }, []);

  const approve = async () => {
    setBusy(true);
    try { await api.aaApproveSandbox(handle); } catch { /* live mode handles this at Anumati */ }
    const ret = new URLSearchParams(location.search).get("return");
    if (ret?.startsWith("/app")) { try { await api.aaFetch(handle); } catch { /* shown on return */ } router.replace(ret); return; }
    router.replace(`/?step=connect&handle=${encodeURIComponent(handle)}`);
  };

  return (
    <div className="min-h-full bg-[#F4F6FA]">
      <div className="bg-white border-b border-black/5 px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#9a5f00] bg-amber-soft rounded-full w-fit px-3 py-1">SANDBOX SIMULATION · replay mode</div>
        <p className="mt-3 text-lg font-extrabold">Anumati — Account Aggregator</p>
        <p className="text-xs text-muted">RBI-licensed consent manager · {mobile ? `+91 ${mobile.slice(0, 2)}xxxxxx${mobile.slice(-2)}` : ""}</p>
      </div>
      <div className="p-5 space-y-4">
        <div className="rounded-2xl bg-white p-4">
          <p className="text-sm"><b>DhanYukti</b> {t({ hi: "aapke data ke liye consent maang raha hai", en: "is requesting consent for your data" })}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
            <dt className="text-muted">Purpose</dt><dd className="font-semibold">Personal finance management</dd>
            <dt className="text-muted">FI types</dt><dd className="font-semibold">DEPOSIT, RECURRING_DEPOSIT, INSURANCE_POLICIES</dd>
            <dt className="text-muted">Range</dt><dd className="font-semibold">Last 6 months</dd>
            <dt className="text-muted">Frequency</dt><dd className="font-semibold">Monthly (periodic)</dd>
            <dt className="text-muted">Valid till</dt><dd className="font-semibold">90 days</dd>
            <dt className="text-muted">Data life</dt><dd className="font-semibold">1 day</dd>
          </dl>
          <p className="mt-2 text-[11px] font-mono text-muted truncate">{handle}</p>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-sm font-bold mb-2">{lang === "hi" ? "Mile khaate" : "Accounts discovered"}</p>
          {[["Test Bank · Savings", "XXXX4821"], ["Test Bank · RD", "XXXX9034"]].map(([n, m], i) => (
            <button key={m} onClick={() => setAccts(accts.map((a, k) => (k === i ? !a : a)))} className="w-full flex items-center gap-3 py-2.5 border-t border-black/5 first:border-0">
              <span className="grid place-items-center h-10 w-10 rounded-xl bg-[#E8EEFF]"><Landmark size={18} /></span>
              <span className="flex-1 text-left"><span className="block text-sm font-semibold">{n}</span><span className="text-xs text-muted">{m}</span></span>
              <span className={`grid place-items-center h-6 w-6 rounded-md ${accts[i] ? "bg-ink text-white" : "border-2 border-black/20"}`}>{accts[i] && <Check size={14} />}</span>
            </button>
          ))}
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-sm font-bold mb-2">OTP <span className="text-muted font-normal text-xs">(sandbox: any 6 digits)</span></p>
          <input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="w-full tracking-[0.5em] text-center text-2xl font-bold rounded-xl bg-[#F4F6FA] p-3 outline-none" placeholder="••••••" />
        </div>
        <HelpLink compact />
        <div className="flex items-center gap-2 text-xs text-muted"><ShieldCheck size={16} />{t({ hi: "Aadhaar se khaate nahi dhoondhe jaate", en: "Accounts are never discovered using Aadhaar" })}</div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => router.replace("/?step=consent")} className="min-h-13 rounded-xl bg-white font-bold border border-black/10">{lang === "hi" ? "Mana karein" : "Reject"}</button>
          <button disabled={otp.length !== 6 || !accts.some(Boolean) || busy} onClick={approve} className="min-h-13 rounded-xl bg-ink text-white font-bold disabled:opacity-40">{lang === "hi" ? "Manzoor karein" : "Approve"}</button>
        </div>
      </div>
    </div>
  );
}
