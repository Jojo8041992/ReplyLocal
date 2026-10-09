// Test helper: load app/api/generate/route.js without Next.js. The route's
// imports are swapped for the real lib modules plus a tiny NextResponse
// stand-in (same approach as the eval harness), so POST runs end to end.
import { readFileSync } from "node:fs";
import { holdCheck } from "../lib/holdCheck.js";
import { detectTopics } from "../lib/reviewTopics.js";
import { cautionFor } from "../lib/caution.js";

export function loadRoute() {
  let src = readFileSync(new URL("../app/api/generate/route.js", import.meta.url), "utf8");
  src = src.replace(/^import\s+.*?;\s*$/gm, "");
  src = src.replace(/^export\s+async\s+function\s+POST/m, "async function POST");
  const NextResponse = {
    json: (body, init) => ({ body, status: (init && init.status) || 200 }),
  };
  const factory = new Function(
    "NextResponse",
    "holdCheck",
    "detectTopics",
    "cautionFor",
    `${src}\nreturn { POST, buildReply };`
  );
  const { POST, buildReply } = factory(NextResponse, holdCheck, detectTopics, cautionFor);
  const call = async (payload) => POST({ json: async () => payload });
  return { POST, buildReply, call };
}
