/**
 * Review topic detection — picks which topic-specific template sentences a
 * draft should include (fix 4: wait/timing, pricing, accessibility).
 *
 * Like holdCheck, this is deterministic keyword/regex matching: no AI, no
 * network. It only returns booleans. The review text itself is never passed
 * to the reply templates, so nothing from the review is quoted or echoed back.
 *
 * Accessibility deliberately reuses holdCheck's accessibility rule (single
 * source of truth). In the live API an accessibility review is always HELD
 * for a human before any draft is made, so the accessibility sentence only
 * appears if the hold is bypassed (e.g. the eval's draft-only diagnostic) or
 * if the hold rules change in future.
 */
import { holdCheck } from "./holdCheck.js";

// Wait / timing / lateness complaints. Bare "wait" is NOT matched, so
// "can't wait to come back" or "said the tires could wait" don't count.
const WAIT_PATTERNS = [
  /\b(waited|waiting)\b/i,
  /\bwaits? (was|were|is|are|time|times)\b/i,
  /\b(the|a|long|longer|\d+\s?(min|mins|minutes|hr|hrs|hours?)) wait\b(?!\s*(staff|ress|er|list))/i,
  /\b(took forever|took (too |so |way too )?long|delay(ed|s)?|stranded|behind schedule|no[- ]show(ed)?)\b/i,
  /\blonger than (estimated|expected|quoted|promised|planned)\b/i,
  /\b(showed up|show up|came|arrived|running|ran|was|were|\d+\s?(min|mins|minutes|hr|hrs|hours?)) late\b/i,
  /\bran (an hour|\d+\s?(min|mins|minutes|hr|hrs|hours?)|long|over)\b/i,
];

// Pricing / value / billing comments (positive or negative).
const PRICING_PATTERNS = [
  /\b(prices?|priced|pricey|pricing|overpriced|expensive|cheap(er|est)?|affordable|costs?|costly|quoted?|quotes|charged?|charges|bill|billed|billing|fees?|upsell\w*|upsold)\b/i,
  /\$\s?\d/,
];

const any = (patterns, text) => patterns.some((re) => re.test(text));

/**
 * @param {{ reviewText: string, stars?: number }} input
 * @returns {{ wait: boolean, pricing: boolean, accessibility: boolean }}
 */
export function detectTopics({ reviewText, stars }) {
  const text = String(reviewText || "");
  const accessibility = holdCheck({ reviewText: text, stars }).reasons.some(
    (r) => r.code === "accessibility"
  );
  return {
    wait: any(WAIT_PATTERNS, text),
    pricing: any(PRICING_PATTERNS, text),
    accessibility,
  };
}
