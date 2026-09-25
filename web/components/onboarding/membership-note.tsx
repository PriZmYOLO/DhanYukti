"use client";

import { ShieldCheck } from "lucide-react";

import { useText } from "@/components/onboarding/onboarding-provider";

/** Guide §5: membership is separate from permission to see finances. */
export function MembershipNote() {
  const text = useText();

  return (
    <div className="bg-card flex gap-3 rounded-xl border p-4">
      <ShieldCheck
        aria-hidden
        className="text-primary mt-0.5 size-5 shrink-0"
      />
      <div className="space-y-1">
        <p className="font-medium">{text("membershipTitle")}</p>
        <p className="text-muted-foreground text-sm">
          {text("membershipBody")}
        </p>
      </div>
    </div>
  );
}
