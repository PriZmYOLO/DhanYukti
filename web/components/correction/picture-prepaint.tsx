import {
  DEMO_CORRECTIONS_KEY,
  DEMO_SESSION_KEY,
} from "@/lib/provisional/h07/demo-keys";

/**
 * DEMO ONLY — delete with the demo adapters.
 *
 * The server can't see the demo's sessionStorage, so after a demo revoke or
 * accepted correction it still sends Home's unchanged fixture figures. This
 * inline script runs before those figures are parsed: if this tab's demo
 * member is "recalculating", it marks <html> so CSS hides the gated content
 * until React has swapped in the recalculation notice (usePictureStatus then
 * removes the mark). It only reads the two demo keys and never throws.
 *
 * With a real backend, loadHomeView() returns the recalculating release
 * itself and this component goes away.
 */
const script = `try{var s=JSON.parse(sessionStorage.getItem(${JSON.stringify(
  DEMO_SESSION_KEY,
)})||"null"),c=JSON.parse(sessionStorage.getItem(${JSON.stringify(
  DEMO_CORRECTIONS_KEY,
)})||"null"),m=s&&s.snapshot&&s.snapshot.session&&s.snapshot.session.member_id;if(m&&c&&c.member_id===m&&c.picture&&c.picture.status==="recalculating")document.documentElement.dataset.demoPicture="recalculating"}catch(e){}`;

export function PicturePrepaint() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
