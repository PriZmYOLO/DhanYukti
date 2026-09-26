/**
 * ============================================================
 *  DEMO — NOT AUTHORISATION
 * ============================================================
 *
 * Development stand-in for the owner-only view. Each fixture module is
 * loaded with `import()` only in the tab of the member it belongs to (by how
 * they entered the household), so another member's browser never downloads
 * it. A real adapter asks the backend, which releases private items to the
 * owner's session only. No network calls and no invented API routes.
 */
import { onboardingPort } from "@/lib/provisional/h01";
import type {
  OwnPrivateView,
  PrivateViewPort,
} from "@/lib/provisional/h03/private-view";

export const demoPrivateViewAdapter: PrivateViewPort = {
  implementation: "demo",

  async getOwnPrivateView(): Promise<OwnPrivateView> {
    const { session, membership } = await onboardingPort.loadSnapshot();
    if (!session) throw new Error("No demo session in this tab.");
    if (!membership) return { status: "no_household" };
    try {
      if (membership.joined_via === "created") {
        const { createdMemberPrivateView } =
          await import("@/lib/provisional/h03/demo-private/created-member");
        return createdMemberPrivateView;
      }
      const { invitedMemberPrivateView } =
        await import("@/lib/provisional/h03/demo-private/invited-member");
      return invitedMemberPrivateView;
    } catch {
      return {
        status: "unavailable",
        reason: "Your private items couldn't be loaded. Nothing is assumed.",
      };
    }
  },
};
