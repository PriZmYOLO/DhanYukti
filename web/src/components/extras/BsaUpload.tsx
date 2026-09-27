"use client";
import { useRef, useState } from "react";
import { FileUp, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";

type Step = "idle" | "uploading" | "analysing" | "done";

/** Fallback when the bank isn't on AA: upload a statement PDF to Perfios BSA. */
export default function BsaUpload() {
  const { t, lang } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [res, setRes] = useState<{ report_id: string; mode: string } | null>(null);
  const [name, setName] = useState("");

  const upload = async (f: File) => {
    setName(f.name); setStep("uploading");
    let r: { report_id: string; mode: string };
    try { r = await api.bsaUpload(f); } catch { r = { report_id: `bsa_demo_${Date.now().toString(36)}`, mode: "demo (offline)" }; }
    setStep("analysing"); await new Promise((x) => setTimeout(x, 1200));
    setRes(r); setStep("done");
  };
  const steps: { k: Step; l: { hi: string; en: string } }[] = [
    { k: "uploading", l: { hi: "Upload", en: "Upload" } },
    { k: "analysing", l: { hi: "Perfios jaanch", en: "Perfios analysis" } },
    { k: "done", l: { hi: "Taiyaar", en: "Ready" } },
  ];
  const order: Step[] = ["idle", "uploading", "analysing", "done"];
  return (
    <div className="w-full rounded-[24px] bg-white p-4 shadow-soft">
      <p className="font-extrabold">{t({ hi: "Bank statement PDF", en: "Bank statement PDF" })}</p>
      <p className="text-xs text-muted">{t({ hi: "Sirf tab jab bank AA par nahi hai", en: "Only if your bank isn't on AA" })}</p>
      <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
      {step === "idle" ? (
        <button onClick={() => input.current?.click()} className="mt-3 w-full min-h-12 rounded-[16px] border-2 border-dashed border-ink/20 font-bold flex items-center justify-center gap-2"><FileUp size={18} />{lang === "hi" ? "PDF chunein" : "Choose PDF"}</button>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted truncate">{name}</p>
          {steps.map((s) => {
            const on = order.indexOf(step) >= order.indexOf(s.k);
            return <div key={s.k} className="flex items-center gap-2 text-sm"><span className={`grid place-items-center h-6 w-6 rounded-full ${on ? "bg-leaf text-white" : "bg-lav"}`}>{on && <Check size={14} />}</span>{t(s.l)}</div>;
          })}
          {res && <p className="text-[11px] text-muted">Report {res.report_id} · {res.mode}</p>}
        </div>
      )}
    </div>
  );
}
