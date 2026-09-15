import { NextResponse } from "next/server";

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

function buildReply({ businessName, stars, reviewText, tone }) {
  const name = businessName.trim();
  const review = reviewText.trim().replace(/\s+/g, " ");
  const snippet =
    review.length > 80 ? `${review.slice(0, 77).trim()}…` : review;

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
  const greetApology = [
    `We're truly sorry your experience with ${name} fell short.`,
    `Thank you for bringing this to our attention at ${name}.`,
    `We apologize that your visit to ${name} didn't meet expectations.`,
  ];

  let opener;
  if (tone === "apologetic" || stars <= 2) {
    opener = pick(greetApology);
  } else if (tone === "friendly") {
    opener = pick(greetFriendly);
  } else {
    opener = pick(greetPro);
  }

  let middle;
  let closer;

  if (stars >= 5) {
    middle = pick([
      `We're thrilled to hear you enjoyed your visit${
        snippet ? ` — especially notes like “${snippet}”` : ""
      }.`,
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
    middle = pick([
      `That isn't the standard we hold ourselves to, and we'd like the chance to make it right.`,
      `We're reviewing what happened so we can correct course quickly.`,
      `Your experience matters, and we take concerns like this seriously.`,
    ]);
    closer = pick([
      `Please contact us directly so we can discuss this offline and make things right.`,
      `Reach out to us privately and we'll work with you to resolve this.`,
      `We invite you to connect with us offline — we'd value the opportunity to rebuild your trust.`,
    ]);
  }

  if (tone === "apologetic" && stars >= 3) {
    middle = `We're sorry any part of your visit wasn't perfect, and ${middle
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

    const reply = buildReply({ businessName, stars, reviewText, tone });
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Could not generate a reply. Please try again." },
      { status: 400 }
    );
  }
}
