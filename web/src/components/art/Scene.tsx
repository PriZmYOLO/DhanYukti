/** Small colourful scene icons for action cards. */
export type SceneKind = "school" | "shield" | "loan" | "jar" | "bolt" | "heart" | "grow" | "alert" | "phone" | "lock" | "bank";

export default function Scene({ kind, size = 72 }: { kind: SceneKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden>
      {kind === "school" && (<g>
        <circle cx="40" cy="42" r="34" fill="#F7C548" opacity=".25" />
        <path d="M14 36 40 18l26 18z" fill="#D96C3F" />
        <rect x="18" y="36" width="44" height="28" rx="2" fill="#FFF7EA" />
        <rect x="35" y="48" width="10" height="16" rx="1" fill="#2E2A6B" />
        <rect x="22" y="42" width="8" height="8" rx="1" fill="#7FB4F0" /><rect x="50" y="42" width="8" height="8" rx="1" fill="#7FB4F0" />
        <circle cx="40" cy="31" r="4" fill="#fff" stroke="#2E2A6B" strokeWidth="1.5" /><path d="M40 29v2.5l1.6 1" stroke="#2E2A6B" strokeWidth="1.2" />
        <path d="M40 10v8" stroke="#2E2A6B" strokeWidth="2" /><path d="M40 10h9l-2 3 2 3h-9" fill="#E0473E" />
      </g>)}
      {kind === "shield" && (<g>
        <circle cx="40" cy="42" r="34" fill="#BFE8D2" opacity=".6" />
        <path d="M40 12 62 20v18c0 15-10 25-22 30-12-5-22-15-22-30V20z" fill="#1F8A5B" />
        <path d="M40 18 57 24v14c0 11-7 19-17 24z" fill="#2FA877" />
        <path d="m30 40 7 7 14-15" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>)}
      {kind === "loan" && (<g>
        <circle cx="40" cy="42" r="34" fill="#FDE0DC" />
        <rect x="18" y="16" width="30" height="50" rx="6" fill="#2E2A6B" /><rect x="21" y="22" width="24" height="36" rx="2" fill="#fff" />
        <text x="33" y="44" textAnchor="middle" fontSize="16" fontWeight="800" fill="#E0473E">₹</text>
        <circle cx="56" cy="50" r="14" fill="#E0473E" /><path d="M56 42v10" stroke="#fff" strokeWidth="4" strokeLinecap="round" /><circle cx="56" cy="57" r="2.2" fill="#fff" />
      </g>)}
      {kind === "jar" && (<g>
        <circle cx="40" cy="42" r="34" fill="#F9D9C7" />
        <ellipse cx="40" cy="48" rx="20" ry="18" fill="#D96C3F" /><rect x="30" y="24" width="20" height="8" rx="3" fill="#B9552C" />
        <rect x="35" y="27" width="10" height="2.5" rx="1" fill="#17153b" />
        <circle cx="40" cy="14" r="7" fill="#F7C548" stroke="#C98F10" /><text x="40" y="17.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#7a5500">₹</text>
        <path d="M27 44c2-5 6-7 9-8" stroke="#fff" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>)}
      {kind === "bolt" && (<g>
        <circle cx="40" cy="42" r="34" fill="#FFF1C2" />
        <path d="M44 10 22 44h14l-4 26 24-36H42z" fill="#F7C548" stroke="#D9A21F" strokeWidth="2" strokeLinejoin="round" />
      </g>)}
      {kind === "heart" && (<g>
        <circle cx="40" cy="42" r="34" fill="#F7C6D6" />
        <path d="M40 64S16 50 16 32c0-8 6-14 13-14 5 0 9 3 11 7 2-4 6-7 11-7 7 0 13 6 13 14 0 18-24 32-24 32z" fill="#D6457A" />
        <path d="M24 38h9l3-6 5 12 3-6h12" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>)}
      {kind === "grow" && (<g>
        <circle cx="40" cy="42" r="34" fill="#BFE8D2" />
        <rect x="16" y="50" width="10" height="16" rx="2" fill="#2E2A6B" /><rect x="30" y="40" width="10" height="26" rx="2" fill="#2E2A6B" /><rect x="44" y="30" width="10" height="36" rx="2" fill="#1F8A5B" />
        <path d="M58 14c-10 0-14 6-14 14 8 0 14-4 14-14z" fill="#2FA877" /><path d="M49 26c3-4 6-7 9-12" stroke="#1F8A5B" strokeWidth="2" />
      </g>)}
      {kind === "alert" && (<g>
        <circle cx="40" cy="42" r="34" fill="#FDEBC8" />
        <path d="M40 14 68 62H12z" fill="#E89B1C" strokeLinejoin="round" /><path d="M40 30v16" stroke="#fff" strokeWidth="5" strokeLinecap="round" /><circle cx="40" cy="54" r="3" fill="#fff" />
      </g>)}
      {kind === "phone" && (<g>
        <circle cx="40" cy="42" r="34" fill="#ECE7FB" />
        <rect x="24" y="12" width="32" height="56" rx="7" fill="#17153b" /><rect x="27" y="18" width="26" height="42" rx="3" fill="#F7C548" />
        <path d="M33 38l5 5 9-10" stroke="#17153b" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>)}
      {kind === "lock" && (<g>
        <circle cx="40" cy="42" r="34" fill="#ECE7FB" />
        <path d="M28 36v-8a12 12 0 0 1 24 0v8" stroke="#2E2A6B" strokeWidth="6" fill="none" />
        <rect x="20" y="34" width="40" height="32" rx="8" fill="#2E2A6B" /><circle cx="40" cy="48" r="5" fill="#F7C548" /><rect x="38" y="50" width="4" height="9" rx="2" fill="#F7C548" />
      </g>)}
      {kind === "bank" && (<g>
        <circle cx="40" cy="42" r="34" fill="#D8E4FF" />
        <path d="M14 30 40 14l26 16z" fill="#2E2A6B" /><rect x="16" y="30" width="48" height="5" fill="#2E2A6B" />
        {[20, 32, 44, 56].map((x) => <rect key={x} x={x} y="37" width="5" height="20" rx="1" fill="#fff" stroke="#2E2A6B" strokeWidth="1.5" />)}
        <rect x="14" y="58" width="52" height="7" rx="2" fill="#2E2A6B" />
      </g>)}
    </svg>
  );
}
