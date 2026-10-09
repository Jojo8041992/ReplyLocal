import { NextResponse } from "next/server";
import { holdCheck } from "../../../lib/holdCheck";
import { detectTopics } from "../../../lib/reviewTopics";
import { cautionFor } from "../../../lib/caution";

const TONES = new Set(["professional", "friendly", "apologetic"]);

function clampReply(text, max = 480) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 200 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Topic sentences (fix 4). Each one names the topic (wait / pricing /
// accessibility) WITHOUT quoting the review, admitting fault, promising a
// refund, discount, or fix, or guaranteeing future timing.
const TOPIC_SENTENCES = {
  // Acknowledge only; the offline route comes from the 1–2★ closer, or from
  // accessibilityRoute below on 3–5★ (whose closers invite a return visit).
  // No statements about legal (e.g. ADA) compliance.
  accessibility: [
    `We take accessibility concerns seriously, including any barrier for guests with a disability, and a manager would like to hear more about your visit.`,
    `Making our space work for guests with a disability matters to us, and a manager would like to follow up with you personally.`,
    `Access for guests with a disability is important to us, and a manager would like to speak with you about this accessibility concern.`,
  ],
  accessibilityRoute: [
    `Please contact us directly so we can talk with you about it.`,
    `Please reach out to us privately at your convenience.`,
  ],
  waitLow: [
    `We understand that waiting is frustrating, and we've shared your comments about the wait with our team.`,
    `Your note about the wait and the timing of your visit has been passed along to the people who manage our schedule.`,
    `We hear your concern about the wait, and we've shared it with the team responsible for scheduling.`,
  ],
  wait: [
    `Your comments about the wait and timing of your visit have been shared with our team.`,
    `We've passed your note about the wait along to our team, since timing matters on every visit.`,
    `Your comments about the wait are helpful, and we've shared them with the people who manage our schedule.`,
  ],
  pricingLow: [
    `We understand pricing matters, and if you have questions about your bill we'd be glad to walk through it with you directly.`,
    `We're happy to go over any questions about our pricing with you privately.`,
    `Your comments about pricing have been shared with our team, and we're happy to explain how our prices are set.`,
  ],
  pricing: [
    `Your comments on pricing and value are helpful to our team.`,
    `We're always happy to explain how our pricing works.`,
    `Your feedback on pricing and value has been shared with our team.`,
  ],
};

const APOLOGY_PREFIX = `We're sorry any part of your visit wasn't perfect, and `;

function topicMiddle(topics, stars) {
  if (!topics) return null;
  const low = stars <= 2;
  const parts = [];
  if (topics.accessibility) {
    let a = pick(TOPIC_SENTENCES.accessibility);
    if (!low) a += ` ${pick(TOPIC_SENTENCES.accessibilityRoute)}`;
    parts.push(a);
  }
  if (topics.wait) parts.push(pick(low ? TOPIC_SENTENCES.waitLow : TOPIC_SENTENCES.wait));
  if (topics.pricing) parts.push(pick(low ? TOPIC_SENTENCES.pricingLow : TOPIC_SENTENCES.pricing));
  return parts.length ? parts : null;
}

// Note: templates never quote or echo the review text back. Echoing can
// repeat medical claims, competitor names, or pricing claims in public.
// buildReply only receives topic booleans (from detectTopics), never the text.
function buildReply({ businessName, stars, tone, topics }) {
  const name = businessName.trim();

  const greetFriendly = [
    `Thank you so much for taking the time to share your experience with ${name}!`,
    `We're grateful you chose ${name} and left this review.`,
    `Your feedback means a lot to everyone at ${name}.`,
  ];
  const greetPro = [
    `Thank you for reviewing ${name}.`,
    `We appreciate you taking the time to share your experience with ${name}.`,
    `Thank you for your thoughtful feedback regarding ${name}.`,
  ];
  // Apologetic tone: sympathy only. Never concede that something went wrong
  // ("fell short", "didn't meet expectations") — that reads as admitting fault.
  const greetApology = [
    `We're sorry to hear about your experience with ${name}.`,
    `Thank you for bringing this to our attention at ${name}.`,
    `We're sorry to hear you were disappointed with your visit to ${name}.`,
  ];
  // 1–2★ in professional/friendly tone: neutral acknowledgement, no apology.
  const greetLowNeutral = [
    `Thank you for sharing your feedback about ${name}.`,
    `We appreciate you taking the time to tell us about your visit to ${name}.`,
    `Thank you for taking the time to leave a review for ${name}.`,
  ];

  let opener;
  if (tone === "apologetic") {
    opener = pick(greetApology);
  } else if (stars <= 2) {
    opener = pick(greetLowNeutral);
  } else if (tone === "friendly") {
    opener = pick(greetFriendly);
  } else {
    opener = pick(greetPro);
  }

  let middle;
  let closer;

  if (stars >= 5) {
    middle = pick([
      `We're thrilled to hear you enjoyed your visit.`,
      `Hearing feedback like yours keeps our team motivated every day.`,
      `We're so glad we could make a positive impression.`,
    ]);
    closer = pick([
      `We'd love to welcome you back again soon.`,
      `Please stop by again — we can't wait to see you.`,
      `Thanks again, and we hope to serve you again soon!`,
    ]);
  } else if (stars >= 3) {
    middle = pick([
      `We're glad there were bright spots, and we're listening carefully to how we can do even better.`,
      `Your comments help us improve while we keep delivering what you liked.`,
      `We appreciate the balanced feedback — it helps us grow.`,
    ]);
    closer = pick([
      `We hope you'll give us another chance to earn a glowing review next time.`,
      `Please reach out anytime if there's something we can improve for your next visit.`,
      `We look forward to serving you again and exceeding expectations.`,
    ]);
  } else {
    // 1–2★: neutral acknowledgement + invitation to talk offline. No line may
    // admit fault, apologize for a specific failure, or promise a remedy
    // ("make it right", "resolve this", "correct course", refunds, etc.).
    middle = pick([
      `We take all feedback seriously and would like to understand more about your visit.`,
      `Your experience matters to us, and we'd like to hear more about what happened from your perspective.`,
      `We've shared your comments with our team.`,
    ]);
    closer = pick([
      `Please contact us directly so we can discuss this offline.`,
      `Please reach out to us privately so we can talk this through.`,
      `We invite you to connect with us offline at your convenience.`,
    ]);
  }

  // Fix 4: if the review is about a wait, pricing, or accessibility, use
  // topic sentences instead of the generic middle line. If several topics
  // would push the reply past Google's ~500 chars, drop the last-listed
  // (lowest-priority) topic so the closer is never truncated.
  const topicParts = topicMiddle(topics, stars);
  if (topicParts) {
    const apologyPrefixLen =
      tone === "apologetic" && stars >= 3 ? APOLOGY_PREFIX.length : 0;
    const fixedLen = opener.length + closer.length + 2 + apologyPrefixLen;
    while (
      topicParts.length > 1 &&
      fixedLen + topicParts.join(" ").length > 480
    ) {
      topicParts.pop();
    }
    middle = topicParts.join(" ");
  }

  if (tone === "apologetic" && stars >= 3) {
    middle = `${APOLOGY_PREFIX}${middle
      .charAt(0)
      .toLowerCase()}${middle.slice(1)}`;
  }

  return clampReply(`${opener} ${middle} ${closer}`);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const businessName =
      typeof body.businessName === "string" ? body.businessName : "";
    const reviewText =
      typeof body.reviewText === "string" ? body.reviewText : "";
    const stars = Number(body.stars);
    const toneRaw =
      typeof body.tone === "string" ? body.tone.toLowerCase() : "professional";
    const tone = TONES.has(toneRaw) ? toneRaw : "professional";

    if (!businessName.trim()) {
      return NextResponse.json(
        { error: "Business name is required." },
        { status: 400 }
      );
    }
    if (!reviewText.trim()) {
      return NextResponse.json(
        { error: "Review text is required." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return NextResponse.json(
        { error: "Stars must be an integer from 1 to 5." },
        { status: 400 }
      );
    }

    // Hold/flag check runs BEFORE drafting. Held reviews get no draft at all.
    const check = holdCheck({ reviewText, stars });
    if (check.hold) {
      return NextResponse.json({
        status: "needs_human",
        reasons: check.reasons,
        guidance: check.guidance,
      });
    }

    const topics = detectTopics({ reviewText, stars });
    const reply = buildReply({ businessName, stars, tone, topics });
    // Every 1–2★ draft carries caution: true so the UI shows a
    // "Read carefully before posting" banner. Not a hold.
    return NextResponse.json({ status: "ok", reply, ...cautionFor(stars) });
  } catch {
    return NextResponse.json(
      { error: "Could not generate a reply. Please try again." },
      { status: 400 }
    );
  }
}
