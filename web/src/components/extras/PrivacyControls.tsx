"use client";
import { useState } from "react";
import { Download, Trash2, ShieldCheck } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import { Btn } from "@/components/ui/bits";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";

/** Export or delete everything. */
export default function PrivacyControls() {
  const { data, hid, t, lang } = useApp();
  const [confirm, setConfirm] = useState(false);

  const exportData = () => {
    let declared: unknown = [];
    try { declared = JSON.parse(localStorage.getItem(`dy.declared.${hid}`) ?? "[]"); } catch { /* ignore */ }
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), dashboard: data, declared }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `dhanyukti-data-${hid}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const wipe = async () => {
    try { await api.reset(); } catch { /* offline */ }
    try { Object.keys(localStorage).filter((k) => k.startsWith("dy.")).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
    // Full reload on purpose: also clears the in-memory app state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  };

  return (
    <div className="w-full space-y-2">
      <button onClick={exportData} className="w-full flex items-center gap-3 rounded-[20px] bg-white p-4 min-h-14 shadow-soft font-bold"><Download size={18} />{lang === "hi" ? "Mera data download karo" : "Download my data"}</button>
      <button onClick={() => setConfirm(true)} className="w-full flex items-center gap-3 rounded-[20px] bg-white p-4 min-h-14 shadow-soft font-bold text-danger"><Trash2 size={18} />{lang === "hi" ? "Sab kuch mita do" : "Delete everything"}</button>
      <p className="flex items-center gap-2 px-1 text-xs text-muted"><ShieldCheck size={14} />{t({ hi: "Raw bank data 24 ghante mein mita diya jaata hai", en: "Raw bank data is deleted within 24 hours" })}</p>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title={<p className="text-xl font-extrabold">{lang === "hi" ? "Pakka?" : "Are you sure?"}</p>}>
        <p className="text-[15px]">{t({ hi: "Consent band hoga aur aapki profile mita di jayegi.", en: "Consents are revoked and your profile is deleted." })}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Btn variant="white" onClick={() => setConfirm(false)}>{lang === "hi" ? "Nahi" : "Cancel"}</Btn>
          <Btn variant="danger" onClick={() => void wipe()}>{lang === "hi" ? "Haan, mita do" : "Yes, delete"}</Btn>
        </div>
      </Sheet>
    </div>
  );
}
