/**
 * Hold / flag check — runs BEFORE any reply is drafted.
 *
 * Some reviews should never get an auto-drafted public reply: a person needs
 * to read them first. This module is intentionally simple and deterministic:
 * plain keyword / regex rules, no AI, no network. Same input -> same result.
 *
 * Usage:
 *   const result = holdCheck({ reviewText, stars });
 *   if (result.hold) { ...show "Needs a human", do NOT draft... }
 *
 * It is deliberately conservative: a false "needs a human" costs the owner a
 * minute; a bad auto-drafted reply to an injury or refund claim can cost far
 * more. When adding rules, prefer specific phrases over single common words
 * so ordinary happy reviews keep getting drafts.
 *
 * Notes on the regexes:
 * - Reviews often drop apostrophes ("dont", "Im", "wasnt"), so patterns use
 *   `['’]?` where it matters.
 * - Short all-caps acronyms (ER, ADA) are matched case-sensitively so words
 *   like "er" or "Ada" don't trigger a hold.
 */

const APOS = "['’]?";

/**
 * Each category: a stable `code`, a human `label` (shown in the UI), the
 * patterns that trigger it, and `guidance` telling the owner what to consider.
 */
const CATEGORIES = [
  {
    code: "liability",
    label: "Possible injury, damage, safety, or legal claim",
    patterns: [
      // Physical injury
      /\b(injur(y|ies|ed)|hurt|hurts|tore|torn|sprain(ed)?|fractur(e|ed)|concussion|stitches)\b/i,
      // Property damage
      /\b(damage[sd]?|ruin(ed|s)?|flood(ed|ing)?|destroy(ed)?|broke (my|our)|broken (my|our))\b/i,
      // Accidents / safety / negligence
      /\b(accident|unsafe|dangerous|hazard(ous)?|negligen(t|ce)|liab(le|ility))\b/i,
      // Legal / regulatory threats and accusations
      /\b(lawsuit|sue|suing|sued|lawyer|attorney|legal action|court|small claims|police)\b/i,
      /\b(scam|fraud(ulent)?|rip[- ]?off|discriminat\w*|better business bureau|attorney general)\b/i,
      /\bBBB\b/,
      // Food safety
      /\b(food poisoning|poison(ed|ing)?|sick|vomit\w*|threw up|undercooked|cockroach(es)?|roach(es)?|mold(y)?)\b/i,
      /\b(hair|bug|glass|plastic) in (my|the|our)\b/i,
    ],
    guidance:
      "Don't admit fault, guess at the cause, or discuss specifics in public. " +
      "Check the facts internally and consider talking to your insurer or legal " +
      "advisor first. If you reply, keep it short and neutral and invite the " +
      "reviewer to contact you directly.",
  },
  {
    code: "medical",
    label: "Medical or health issue",
    patterns: [
      /\b(infect(ed|ion|ions)?|bleed(ing)?|bled|burn(ed|s|t)?|blister(s|ed)?|rash|swollen|swelling)\b/i,
      /\b(allergic|allerg(y|ies)|reaction|headaches?|migraines?|nause(a|ous)|dizzy|faint(ed)?|pain|painful|numbness)\b/i,
      // (Not bare "diagnos*": "diagnostic fee" / "diagnosed fast" are normal in auto/HVAC reviews.)
      /\b(emergency room|hospital(i[sz]ed)?|urgent care|doctor|dermatologist|diagnosed (me |him |her |them )?with|misdiagnos\w*|prescri\w*|medication)\b/i,
      /\bER\b/,
      // Health-outcome claims (also common in fake praise)
      /\b(cure[sd]?|curing|healed)\b/i,
      // Health conditions
      /\b(chronic|anxiety|depression|diabetes|cancer|pregnan\w*)\b/i,
      // Lingering symptoms after a procedure ("still a bit sensitive")
      /\bstill (a (bit|little) |kind of |really |so )?(hurts?|sore|sensitive|swollen|bleeding|numb|aching|in pain)\b/i,
    ],
    guidance:
      "Don't discuss symptoms, diagnoses, treatment, or results in public. In " +
      "healthcare settings, don't even confirm the person was a patient — " +
      "privacy rules may apply. Keep any public reply generic and move the " +
      "conversation offline.",
  },
  {
    code: "refund",
    label: "Refund, chargeback, compensation, or billing dispute",
    patterns: [
      /\b(refund(s|ed)?|charge ?backs?|money back|reimburs\w*|compensat\w*|comp(ed|'d|’d)|dispute (the |a )?charge|overcharg\w*|hidden fees?)\b/i,
      new RegExp(`\\b(wasn${APOS}t|was not|weren${APOS}t|not|never) disclosed\\b`, "i"),
    ],
    guidance:
      "Don't promise or mention refunds, credits, or compensation in a public " +
      "reply. Look up the transaction and your policy first, then handle the " +
      "request privately.",
  },
  {
    code: "accessibility",
    label: "Accessibility concern",
    patterns: [
      /\b(wheelchairs?|ramps?|disab(led|ility|ilities)|handicap(ped)?|service (animal|dog)|guide dog|walker|mobility|accessibility|inaccessible|not accessible|hearing aid|sign language|visually impaired)\b/i,
      /\bADA\b/,
    ],
    guidance:
      "Accessibility concerns deserve a specific, personal response from an " +
      "owner or manager. Find out what happened, acknowledge the concern " +
      "without arguing, and offer a direct contact. Avoid public statements " +
      "about legal (e.g. ADA) compliance.",
  },
  {
    code: "suspicious",
    label: "Possibly fake, spam, extortion, or a competitor attack",
    patterns: [
      // Accusations of fake reviews, or paid reviews
      /\bfake (reviews?|accounts?|profiles?)\b/i,
      /\b(paid|bought) (for )?reviews\b/i,
      // Extortion: "I'll change my review if...", "remove this review unless..."
      /\b(change|update|remove|delete|take down|edit|raise)\b.{0,20}\breview\b.{0,25}\b(if|unless|once|when)\b/i,
      /\bunless (you|they)\b/i,
      new RegExp(`\\bor (else|i${APOS}ll|i${APOS}m|i will|i am)\\b`, "i"),
      // Threats aimed at the business
      /\b(expose you|ruin your business|make you pay|shut you down)\b/i,
      // Links, handles, promo spam
      /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|biz|info|xyz)\b|\bpromo code\b|\bDM me\b|\bclick here\b)/i,
      // Over-the-top praise typical of fake reviews
      /!{4,}/,
      /\b(in the (universe|galaxy)|ever invented)\b/i,
    ],
    // Extra checks that aren't a single regex (see below).
    extra: [looksLikeGibberish, looksLikeCompetitorAttack],
    guidance:
      "This review may be fake, spam, an extortion attempt, or a competitor " +
      "attack. Don't respond to threats or offer anything in exchange for " +
      "changing a review. Consider reporting it through Google Business " +
      "Profile; if you do reply, keep it brief and factual.",
  },
];

/**
 * Gibberish: long text with almost no vowels, or a single absurdly long
 * "word". Catches keyboard-mash spam without flagging emoji-heavy reviews.
 */
function looksLikeGibberish(text) {
  const letters = text.match(/[a-z]/gi) || [];
  if (letters.length >= 12) {
    const vowels = letters.filter((c) => /[aeiouy]/i.test(c)).length;
    if (vowels / letters.length < 0.2) return "mostly consonants (gibberish)";
  }
  if (/\b[a-z]{25,}\b/i.test(text)) return "very long nonsense word";
  return null;
}

/**
 * Competitor attack: a NEGATIVE review (1–2★) that steers readers to another
 * named business ("Going to Luxe Cuts", "Harbor Grill is way safer"). Positive
 * comparisons on 3–5★ reviews are left alone so they still get a draft.
 */
function looksLikeCompetitorAttack(text, stars) {
  if (!(stars <= 2)) return null;
  const name = "[A-Z][\\w&'’]+(?:\\s+[A-Z][\\w&'’]+)*";
  const goingTo = new RegExp(
    `\\b(?:[Gg]oing|[Gg]o|[Ss]witching|[Ss]witched|[Gg]one)\\s+(?:back\\s+)?to\\s+(?:the\\s+)?${name}`
  );
  const comparison = new RegExp(
    `\\b${name}\\s+(?:is|are|was|does it|did it|would)\\b[^.!?]{0,25}\\b(?:better|safer|cheaper|more reliable|never)\\b`
  );
  const m = text.match(goingTo) || text.match(comparison);
  return m ? `steers readers to another business: "${m[0]}"` : null;
}

/**
 * @param {{ reviewText: string, stars?: number }} input
 * @returns {{ hold: boolean, reasons: Array<{code: string, label: string, matches: string[], guidance: string}>, guidance: string }}
 */
export function holdCheck({ reviewText, stars }) {
  const text = String(reviewText || "");
  const reasons = [];

  for (const cat of CATEGORIES) {
    const matches = [];
    for (const re of cat.patterns) {
      const m = text.match(re);
      if (m) matches.push(m[0]);
    }
    for (const fn of cat.extra || []) {
      const hit = fn(text, stars);
      if (hit) matches.push(hit);
    }
    if (matches.length) {
      reasons.push({
        code: cat.code,
        label: cat.label,
        matches: [...new Set(matches)],
        guidance: cat.guidance,
      });
    }
  }

  const guidance = reasons.length
    ? "ReplyLocal doesn't draft replies for reviews like this. Read it " +
      "yourself (or have a manager read it) before responding. " +
      reasons.map((r) => r.guidance).join(" ")
    : "";

  return { hold: reasons.length > 0, reasons, guidance };
}
