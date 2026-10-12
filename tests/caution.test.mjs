// Low-star caution flag: every drafted 1–2★ reply carries caution: true.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cautionFor, CAUTION_TITLE } from "../lib/caution.js";
import { loadRoute } from "./loadRoute.mjs";

const { call } = loadRoute();
const base = { businessName: "Maple Street Bakery", tone: "professional" };

test("cautionFor flags 1–2★ only", () => {
  assert.equal(cautionFor(1).caution, true);
  assert.equal(cautionFor(2).caution, true);
  for (const s of [3, 4, 5]) assert.equal(cautionFor(s).caution, false);
  assert.equal(CAUTION_TITLE, "Read carefully before posting");
  assert.match(cautionFor(1).cautionMessage, /carefully/);
});

test("API returns caution: true on every 1–2★ draft, in every tone", async () => {
  for (const stars of [1, 2]) {
    for (const tone of ["professional", "friendly", "apologetic"]) {
      const res = await call({ ...base, tone, stars, reviewText: "Service was slow and the staff seemed distracted." });
      assert.equal(res.status, 200);
      assert.equal(res.body.status, "ok", "low-star review without hold triggers must still be drafted (no blanket hold)");
      assert.equal(typeof res.body.reply, "string");
      assert.ok(res.body.reply.length > 0);
      assert.equal(res.body.caution, true, `stars=${stars} tone=${tone}`);
      assert.equal(res.body.cautionTitle, "Read carefully before posting");
      assert.equal(typeof res.body.cautionMessage, "string");
    }
  }
});

test("API returns caution: false on 3–5★ drafts", async () => {
  for (const stars of [3, 4, 5]) {
    const res = await call({ ...base, stars, reviewText: "Lovely croissants and friendly staff." });
    assert.equal(res.body.status, "ok");
    assert.equal(res.body.caution, false, `stars=${stars}`);
    assert.equal(res.body.cautionMessage, undefined);
  }
});

test("held reviews still return needs_human with no draft (caution does not replace the hold)", async () => {
  const res = await call({ ...base, stars: 1, reviewText: "No ramp, my wheelchair could not get in." });
  assert.equal(res.body.status, "needs_human");
  assert.equal(res.body.reply, undefined);
  assert.equal(res.body.caution, undefined);
});

test("validation errors are unchanged", async () => {
  const res = await call({ ...base, stars: 0, reviewText: "x" });
  assert.equal(res.status, 400);
});
