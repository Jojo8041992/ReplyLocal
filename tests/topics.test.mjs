// Fix 4: wait / pricing / accessibility topic detection and templates.
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectTopics } from "../lib/reviewTopics.js";
import { holdCheck } from "../lib/holdCheck.js";
import { loadRoute } from "./loadRoute.mjs";

const { buildReply, call } = loadRoute();
const t = (reviewText, stars = 3) => detectTopics({ reviewText, stars });

// Same checks the eval scorer uses (replylocal-eval/score.js).
const ACK_WAIT = /\b(wait|delay|late|on[- ]time|timing|schedule)\b/i;
const WAIT_OVERPROMISE = /\b(never wait|no wait|guaranteed (wait|on[- ]time)|always on time|won't wait again)\b/i;
const ADDRESSES_PRICE = /\b(price|pricing|cost|bill|billing|quote|charge|fee)\b/i;
const DISCOUNT = /\b(discount|coupon|comp(ed|limentary)?|free meal|on the house|% off|price match)\b/i;
const ACCESS_ACK = /\b(accessib|wheelchair|ramp|ada|disability|disabilit|accommodat)\b/i; // verbatim from score.js
const OFFLINE = /\b(contact us|reach out|offline|privately|connect with us|discuss this offline)\b/i;
const FAULT = /isn['’]t the standard we hold|make it right|make things right|fell short|our (fault|mistake)|we messed up|didn['’]t meet/i;
const REMEDY = /\b(refund|reimburse|money back|credit|free|discount|won['’]t happen again|never happen again|resolve|fix (this|it)|correct)\b/i;

test("detects wait/timing complaints", () => {
  assert.ok(t("Waited 2 hrs past my appointment.", 1).wait);
  assert.ok(t("Took forever. Hostess lost our reservation.", 2).wait);
  assert.ok(t("Jess showed up 45 min late.", 1).wait);
  assert.ok(t("Appointment ran an hour over with no warning.", 2).wait);
  assert.ok(t("Waited longer than estimated.").wait);
  assert.ok(t("Only ding: 20 min wait. Still recommend!", 4).wait);
  assert.equal(t("Can't wait to come back!", 5).wait, false);
  assert.equal(t("Honest about what I needed vs what could wait.", 4).wait, false);
});

test("detects pricing comments", () => {
  assert.ok(t("Pricey for a trim tho").pricing);
  assert.ok(t("Expected more for $140.").pricing);
  assert.ok(t("Slightly more than quoted but explained why.", 4).pricing);
  assert.ok(t("Overpriced for what I got.", 2).pricing);
  assert.equal(t("Great haircut, friendly staff.", 5).pricing, false);
});

test("accessibility topic mirrors holdCheck's accessibility rule", () => {
  for (const text of ["No ADA parking near the entrance", "Hard for my mom's walker", "Clean and accessible, elevator works"]) {
    const held = holdCheck({ reviewText: text, stars: 2 }).reasons.some((r) => r.code === "accessibility");
    assert.equal(t(text, 2).accessibility, held, text);
  }
});

test("topic templates pass the eval checks and stay safe, all stars and tones", () => {
  const combos = [
    { wait: true }, { pricing: true }, { accessibility: true },
    { wait: true, pricing: true }, { accessibility: true, wait: true, pricing: true },
  ];
  for (let i = 0; i < 30; i++) {
    for (const stars of [1, 2, 3, 4, 5]) {
      for (const tone of ["professional", "friendly", "apologetic"]) {
        for (const c of combos) {
          const topics = { wait: false, pricing: false, accessibility: false, ...c };
          const r = buildReply({ businessName: "Test Co", stars, tone, topics });
          assert.ok(r.length <= 480, r);
          assert.ok(!r.endsWith("…"), `truncated: ${r}`);
          assert.doesNotMatch(r, FAULT, r);
          assert.doesNotMatch(r, REMEDY, r);
          assert.doesNotMatch(r, DISCOUNT, r);
          assert.doesNotMatch(r, WAIT_OVERPROMISE, r);
          if (topics.accessibility) {
            assert.match(r, ACCESS_ACK, r);
            assert.match(r, OFFLINE, r);
          }
          if (topics.wait && !topics.accessibility) assert.match(r, ACK_WAIT, r);
          if (topics.pricing && !topics.accessibility && !topics.wait) assert.match(r, ADDRESSES_PRICE, r);
        }
      }
    }
  }
});

test("drafts never quote the review", async () => {
  const reviewText = "Waited 55 minutes and the $19 salad was overpriced at Corner Bistro";
  for (let i = 0; i < 20; i++) {
    const res = await call({ businessName: "Test Co", stars: 2, tone: "professional", reviewText });
    assert.equal(res.body.status, "ok");
    for (const frag of ["55", "$19", "salad", "Corner Bistro", "overpriced"]) {
      assert.ok(!res.body.reply.includes(frag), `echoed "${frag}": ${res.body.reply}`);
    }
  }
});

test("accessibility reviews are still held by holdCheck in the API", async () => {
  const res = await call({ businessName: "Test Co", stars: 4, tone: "professional", reviewText: "Great food but the wheelchair ramp was blocked." });
  assert.equal(res.body.status, "needs_human");
  assert.ok(res.body.reasons.some((r) => r.code === "accessibility"));
});
