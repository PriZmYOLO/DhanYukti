"use client";
import { useState } from "react";
import { Check, Download, Trash2, ShieldCheck, Archive } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import { Btn } from "@/components/ui/bits";
import OpenAnumati from "@/components/OpenAnumati";
import { purposeTitle } from "@/components/gov/Dpdp";
import { useApp } from "@/lib/store";
import type {
  DeleteEverythingResult,
  DeletedItem,
} from "@/lib/contracts/delete-everything";
import type { L } from "@/lib/types";

type Phase =
  | { at: "confirm" }
  | { at: "deleting" }
  | { at: "done"; result: DeleteEverythingResult; serverStore: boolean }
  | { at: "error"; message: string };

/** Export or delete everything. */
export default function PrivacyControls() {
  const { data, hid, t, lang } = useApp();
  const [phase, setPhase] = useState<Phase | null>(null);

  const exportData = () => {
    let declared: unknown = [];
    try {
      declared = JSON.parse(localStorage.getItem(`dy.declared.${hid}`) ?? "[]");
    } catch {
      /* ignore */
    }
    const blob = new Blob(
      [
        JSON.stringify(
          { exported_at: new Date().toISOString(), dashboard: data, declared },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dhanyukti-data-${hid}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Server first (this session only), then this phone. Nothing on the phone
  // is cleared if the server couldn't be reached, so a retry still works.
  const wipe = async () => {
    setPhase({ at: "deleting" });
    try {
      const res = await fetch("/api/me/delete", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = await res.json().catch(() => null);
      let result: DeleteEverythingResult;
      let serverStore = true;
      if (res.ok) result = body as DeleteEverythingResult;
      else if (
        res.status === 503 &&
        body?.error?.code === "storage_not_configured"
      ) {
        // This deployment keeps nothing on the server: only the phone has data.
        result = { deleted: [], kept: { kind: "value_ledger", receipts: 0 } };
        serverStore = false;
      } else throw new Error(body?.error?.safe_message ?? `${res.status}`);
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("dy."))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        /* private mode */
      }
      setPhase({ at: "done", result, serverStore });
    } catch {
      setPhase({
        at: "error",
        message: t({
          hi: "DhanYukti ke server tak nahi pahunch paaye. Kuch nahi mitaya gaya — dobara koshish karein.",
          en: "Couldn't reach DhanYukti's server. Nothing was deleted — please try again.",
        }),
      });
    }
  };
  // Full reload on purpose: also clears the in-memory app state.
  const restart = () => {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  };

  const itemText = (d: DeletedItem): L => {
    if (d.kind === "aa_link")
      return {
        hi: `Bank link ${d.ref}: bank data, nikaale gaye tathya aur link`,
        en: `Bank link ${d.ref}: bank data, derived facts and the link`,
      };
    if (d.kind === "dpdp_purpose")
      return {
        hi: `${purposeTitle(d.purpose, "hi")}: consent waapas, data mitaya`,
        en: `${purposeTitle(d.purpose, "en")}: consent withdrawn, data deleted`,
      };
    return {
      hi: `${d.count} report`,
      en: `${d.count} report${d.count === 1 ? "" : "s"}`,
    };
  };

  return (
    <div className="w-full space-y-2">
      <button
        onClick={exportData}
        className="w-full flex items-center gap-3 rounded-[20px] bg-white p-4 min-h-14 shadow-soft font-bold"
      >
        <Download size={18} />
        {lang === "hi" ? "Mera data download karo" : "Download my data"}
      </button>
      <button
        onClick={() => setPhase({ at: "confirm" })}
        className="w-full flex items-center gap-3 rounded-[20px] bg-white p-4 min-h-14 shadow-soft font-bold text-danger"
      >
        <Trash2 size={18} />
        {lang === "hi" ? "Sab kuch mita do" : "Delete everything"}
      </button>
      <p className="flex items-start gap-2 px-1 text-xs text-muted">
        <ShieldCheck size={14} className="shrink-0 mt-0.5" />
        {t({
          hi: "Bank ka khula (decrypted) data aane ke 24 ghante baad mita diya jaata hai. Sirf kuch nikaale gaye tathya rakhe jaate hain — consent band karne tak, zyada se zyada 30 din.",
          en: "Decrypted bank data is deleted 24 hours after it arrives. Only a few derived facts are kept, until you revoke or for at most 30 days.",
        })}
      </p>

      <Sheet
        open={phase !== null}
        onClose={() => {
          if (phase?.at === "done") restart();
          else if (phase?.at !== "deleting") setPhase(null);
        }}
        title={
          <p className="text-xl font-extrabold">
            {phase?.at === "done"
              ? lang === "hi"
                ? "Mita diya"
                : "Deleted"
              : lang === "hi"
                ? "Sab kuch mitayein?"
                : "Delete everything?"}
          </p>
        }
      >
        {(phase?.at === "confirm" ||
          phase?.at === "deleting" ||
          phase?.at === "error") && (
          <div className="space-y-3 text-[14px]">
            <div>
              <p className="font-extrabold">
                {t({
                  hi: "Kya mitega (sirf is phone ke session ka)",
                  en: "What goes (this phone's session only)",
                })}
              </p>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>
                  {t({
                    hi: "Har bank link: bank data, nikaale gaye tathya aur link khud",
                    en: "Every bank link: its bank data, derived facts and the link itself",
                  })}
                </li>
                <li>
                  {t({
                    hi: "DPDP mein di har permission waapas — aur uska data: jawaab, invite, parivaar ki bima profile, sehat ki jaankari, bima tags",
                    en: "Every DPDP permission withdrawn, with its data: answers, invites, family cover profile, health conditions, insurance tags",
                  })}
                </li>
                <li>
                  {t({ hi: "Aapki bheji reports", en: "Reports you filed" })}
                </li>
                <li>
                  {t({
                    hi: "Is phone par DhanYukti ki saari settings aur jawaab",
                    en: "DhanYukti's settings and answers on this phone",
                  })}
                </li>
              </ul>
            </div>
            <div>
              <p className="font-extrabold">
                {t({ hi: "Kya rahega", en: "What stays" })}
              </p>
              <p className="mt-1">
                {t({
                  hi: "Value Ledger ki raseedein. Inmein koi paisa ya bank ki jaankari nahi — yeh saboot hain ki aapne kya waapas liya.",
                  en: "Your Value Ledger receipts. They hold no financial data — they prove what you withdrew.",
                })}
              </p>
              <p className="mt-1">
                {t({
                  hi: "Anumati par consent tab tak khula rahega jab tak aap Anumati app mein band na karein.",
                  en: "Consents at Anumati stay open until you close them in the Anumati app.",
                })}
              </p>
            </div>
            {phase.at === "error" && (
              <p className="font-semibold text-danger">{phase.message}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Btn
                variant="white"
                disabled={phase.at === "deleting"}
                onClick={() => setPhase(null)}
              >
                {lang === "hi" ? "Nahi" : "Cancel"}
              </Btn>
              <Btn
                variant="danger"
                disabled={phase.at === "deleting"}
                onClick={() => void wipe()}
              >
                {phase.at === "deleting"
                  ? lang === "hi"
                    ? "Mita rahe hain…"
                    : "Deleting…"
                  : lang === "hi"
                    ? "Haan, mita do"
                    : "Yes, delete"}
              </Btn>
            </div>
          </div>
        )}
        {phase?.at === "done" && (
          <div className="space-y-3 text-[14px]">
            <ul className="space-y-2">
              {phase.result.deleted.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3"
                >
                  <span className="grid place-items-center h-7 w-7 shrink-0 rounded-full bg-leaf text-white">
                    <Check size={16} />
                  </span>
                  <span className="font-semibold">{t(itemText(d))}</span>
                </li>
              ))}
              {phase.result.deleted.length === 0 && (
                <li className="rounded-2xl bg-white p-3 font-semibold">
                  {phase.serverStore
                    ? t({
                        hi: "Is session ka DhanYukti ke server par kuch bhi save nahi tha.",
                        en: "Nothing was stored on DhanYukti's server for this session.",
                      })
                    : t({
                        hi: "Is deployment mein server par kuch save nahi hota.",
                        en: "This deployment stores nothing on the server.",
                      })}
                </li>
              )}
              <li className="flex items-center gap-3 rounded-2xl bg-white p-3">
                <span className="grid place-items-center h-7 w-7 shrink-0 rounded-full bg-leaf text-white">
                  <Check size={16} />
                </span>
                <span className="font-semibold">
                  {t({
                    hi: "Is phone par DhanYukti ka data",
                    en: "DhanYukti's data on this phone",
                  })}
                </span>
              </li>
            </ul>
            {phase.serverStore && (
              <p className="flex items-start gap-2 rounded-2xl bg-lav/60 p-3">
                <Archive size={16} className="shrink-0 mt-0.5" />
                {t({
                  hi: `Rakha gaya: Value Ledger ki ${phase.result.kept.receipts} raseedein. Inmein koi paisa ya bank ki jaankari nahi; yeh saboot hain ki aapne kya waapas liya.`,
                  en: `Kept: ${phase.result.kept.receipts} Value Ledger receipts. They hold no financial data; they prove what you withdrew.`,
                })}
              </p>
            )}
            <p className="font-semibold">
              {t({
                hi: "Consent poori tarah band karne ke liye Anumati app mein bhi band karein.",
                en: "To end a consent itself, close it in the Anumati app too.",
              })}
            </p>
            <OpenAnumati className="w-full" />
            <Btn variant="ink" className="w-full" onClick={restart}>
              {lang === "hi" ? "Theek hai" : "Done"}
            </Btn>
          </div>
        )}
      </Sheet>
    </div>
  );
}
