import type { AvatarKind } from "@/lib/types";

const BG: Record<AvatarKind, string> = {
  woman: "#F7C6D6", man: "#BFE8D2", girl: "#FFF1C2", boy: "#D8E4FF", elder_woman: "#ECE7FB", elder_man: "#F9D9C7",
};

/** Flat illustrated family faces. */
export default function Avatar({ kind, size = 48, ring }: { kind: AvatarKind; size?: number; ring?: boolean }) {
  const skin = kind.startsWith("elder") ? "#C98B5E" : kind === "girl" || kind === "boy" ? "#D99A6C" : "#C88255";
  const hair = kind.startsWith("elder") ? "#E8E4EE" : "#1F1633";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={ring ? "rounded-full ring-4 ring-white" : "rounded-full"}>
      <circle cx="32" cy="32" r="32" fill={BG[kind]} />
      {/* shoulders */}
      <path d="M10 64c2-12 11-18 22-18s20 6 22 18z" fill={kind === "woman" || kind === "elder_woman" ? "#D6457A" : kind === "girl" ? "#E58457" : kind === "man" ? "#2E2A6B" : "#1F8A5B"} />
      {kind === "elder_woman" && <path d="M12 64c0-14 8-24 20-26 12 2 20 12 20 26" fill="#fff" opacity=".55" />}
      <rect x="28" y="38" width="8" height="8" rx="3" fill={skin} />
      {/* back hair */}
      {(kind === "woman" || kind === "elder_woman") && <circle cx="32" cy="14" r="7" fill={hair} />}
      {kind === "girl" && <><path d="M17 28c-2 8-1 16 2 20" stroke={hair} strokeWidth="5" strokeLinecap="round" /><path d="M47 28c2 8 1 16-2 20" stroke={hair} strokeWidth="5" strokeLinecap="round" /><circle cx="19" cy="48" r="2.5" fill="#D6457A" /><circle cx="45" cy="48" r="2.5" fill="#D6457A" /></>}
      <ellipse cx="32" cy="28" rx="13" ry="14" fill={skin} />
      {/* front hair */}
      {kind === "woman" || kind === "elder_woman" ? <path d="M19 27c0-10 6-15 13-15s13 5 13 15c-4-5-8-7-13-7s-9 2-13 7z" fill={hair} />
        : kind === "girl" ? <path d="M19 26c0-9 6-13 13-13s13 4 13 13c-3-4-8-6-13-6s-10 2-13 6z" fill={hair} />
        : kind === "boy" ? <path d="M19 25c-1-8 5-13 13-13 7 0 13 4 13 12l-3-3-3 3-3-4-4 4-3-4-4 4-3-3z" fill={hair} />
        : <path d="M19 25c0-8 6-12 13-12s13 4 13 12c-3-3-7-4-13-4s-10 1-13 4z" fill={hair} />}
      {/* eyes */}
      <circle cx="27" cy="29" r="1.6" fill="#17153b" /><circle cx="37" cy="29" r="1.6" fill="#17153b" />
      {kind.startsWith("elder") && <g stroke="#17153b" strokeWidth="1.2" fill="none"><circle cx="27" cy="29" r="4" /><circle cx="37" cy="29" r="4" /><path d="M31 29h2" /></g>}
      {/* smile */}
      <path d="M28 35q4 3 8 0" stroke="#7a3b22" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {kind === "man" && <path d="M27 33q5-2 10 0" stroke={hair} strokeWidth="2.4" strokeLinecap="round" />}
      {kind === "elder_man" && <path d="M27 33q5-2 10 0" stroke="#d8d4de" strokeWidth="2.4" strokeLinecap="round" />}
      {(kind === "woman" || kind === "elder_woman") && <circle cx="32" cy="22.5" r="1.4" fill="#E0473E" />}
      {kind === "woman" && <><circle cx="19.5" cy="32" r="1.6" fill="#F7C548" /><circle cx="44.5" cy="32" r="1.6" fill="#F7C548" /></>}
    </svg>
  );
}
