// Unit tests for lib/holdCheck.js — run with `npm test` (Node's built-in runner).
import { test } from "node:test";
import assert from "node:assert/strict";
import { holdCheck } from "../lib/holdCheck.js";

const codes = (text, stars = 1) =>
  holdCheck({ reviewText: text, stars }).reasons.map((r) => r.code);

test("holds liability / injury / damage / legal reviews", () => {
  assert.ok(codes("Tech broke my AC and flooded the basement").includes("liability"));
  assert.ok(codes("Got food poisoning here. Calling my lawyer.").includes("liability"));
  assert.ok(codes("Trainer pushed me until I tore my shoulder").includes("liability"));
});

test("holds medical / health reviews", () => {
  assert.ok(codes("My tooth is infected after the visit").includes("medical"));
  assert.ok(codes("Filling was quick. Still a bit sensitive — normal?", 3).includes("medical"));
});

test("holds refund / chargeback / billing disputes", () => {
  assert.ok(codes("I want my money back").includes("refund"));
  assert.ok(codes("Filing a chargeback with my bank").includes("refund"));
  assert.ok(codes("Charged a fee that wasnt disclosed", 2).includes("refund"));
});

test("holds accessibility concerns", () => {
  assert.ok(codes("No ramp, my wheelchair could not get in").includes("accessibility"));
  assert.ok(codes("No ADA parking near the entrance", 2).includes("accessibility"));
  assert.ok(codes("They refused my service dog").includes("accessibility"));
});

test("flags suspicious / fake / extortion / spam", () => {
  assert.ok(codes("I'll change my review if you give me a free meal").includes("suspicious"));
  assert.ok(codes("Fake reviews everywhere. Going to Luxe Cuts.").includes("suspicious"));
  assert.ok(codes("Great deals at www.example.com", 5).includes("suspicious"));
  assert.ok(codes("BEST GYM EVER INVENTED!!!!!!", 5).includes("suspicious"));
  assert.ok(codes("xkcdqwrtzpl mnbvcxzlkj hgfdsapoiu", 1).includes("suspicious"));
});

test("competitor mention only flags as an attack on 1–2★ reviews", () => {
  assert.ok(codes("Harbor Grill is way safer.", 1).includes("suspicious"));
  assert.equal(codes("Nothing special compared to Pearl Family Dentistry.", 3).length, 0);
  assert.equal(codes("They beat QuickLube Plus on price AND quality.", 5).length, 0);
});

test("ordinary reviews are NOT held", () => {
  for (const [text, stars] of [
    ["Maya is a miracle worker. Already booked next month!", 5],
    ["Dr. Kim made my root canal totally painless.", 5],
    ["Marcus diagnosed fast and had us cool again same day.", 4],
    ["Clean, welcoming, and accessible — elevator and wide lanes.", 5],
    ["Decent pasta. Wait was ~25 min on a Saturday.", 3],
    ["Pricey for a trim tho", 3],
  ]) {
    const r = holdCheck({ reviewText: text, stars });
    assert.equal(r.hold, false, `unexpected hold for: ${text} -> ${JSON.stringify(r.reasons)}`);
  }
});

test("held result has structured reasons and guidance", () => {
  const r = holdCheck({ reviewText: "Refund NOW or I'm calling a lawyer", stars: 1 });
  assert.equal(r.hold, true);
  assert.ok(r.reasons.length >= 2);
  for (const reason of r.reasons) {
    assert.equal(typeof reason.code, "string");
    assert.equal(typeof reason.label, "string");
    assert.ok(Array.isArray(reason.matches) && reason.matches.length > 0);
    assert.equal(typeof reason.guidance, "string");
  }
  assert.match(r.guidance, /doesn't draft/);
});
