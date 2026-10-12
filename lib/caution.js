/**
 * Low-star caution flag. Every drafted reply to a 1–2★ review is returned
 * with caution: true so the UI shows a "Read carefully before posting" banner
 * above the draft. This is NOT a hold: the draft is still produced (holds are
 * decided only by lib/holdCheck.js).
 */
export const CAUTION_TITLE = "Read carefully before posting";
export const CAUTION_MESSAGE =
  "This is a reply to a 1–2★ review. Read the review and this draft carefully " +
  "before posting. Check the facts privately, and don't admit fault, promise " +
  "refunds or fixes, or repeat details from the review in public.";

/**
 * @param {number} stars
 * @returns {{ caution: boolean, cautionTitle?: string, cautionMessage?: string }}
 */
export function cautionFor(stars) {
  if (Number(stars) <= 2) {
    return { caution: true, cautionTitle: CAUTION_TITLE, cautionMessage: CAUTION_MESSAGE };
  }
  return { caution: false };
}
