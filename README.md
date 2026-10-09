# ReplyLocal

**AI-assisted Google review replies for local businesses.**

Paste a customer review, your business name, and a star rating — get a polished reply you can copy and post. Free to use, no sign-up required for week 1.

## Week-1 scope

- Public landing page with a simple reply generator
- Rule/template-based replies (no paid AI API keys required)
- Star-aware tone: thank & invite (5★), acknowledge & invite (3–4★), neutral acknowledgement & invite offline (1–2★)
- "Needs a human" hold: reviews mentioning injury/damage/legal issues, health, refunds, accessibility, or that look fake/spammy get no draft (see `lib/holdCheck.js`)
- Optional tone: professional, friendly, or apologetic
- "Read carefully before posting" caution banner on every 1–2★ draft
- Topic-aware sentences for wait/timing, pricing, and accessibility reviews
- Copy-to-clipboard output

**Not included yet:** Google Business Profile OAuth, auto-posting, analytics, or team accounts.

## Later roadmap

- Connect Google Business Profile (OAuth)
- Pull open reviews and draft replies in one place
- Optional AI model upgrade for more natural phrasing
- Business profiles and saved reply history

## Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import** `Jojo8041992/ReplyLocal` as a **new** project (do not reuse an existing Clearcut project)
3. Framework preset: Next.js — leave defaults
4. Deploy — no environment variables required for week 1

Or from the CLI:

```bash
npx vercel
```

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

`POST /api/generate`

```json
{
  "businessName": "Joe's Coffee",
  "stars": 5,
  "reviewText": "Great coffee and friendly staff!",
  "tone": "friendly"
}
```

Response:

```json
{
  "status": "ok",
  "reply": "Thank you so much for the kind words! ...",
  "caution": false
}
```

Every drafted reply to a 1–2★ review comes back with `"caution": true` (plus `cautionTitle` / `cautionMessage`), and the page shows a **"Read carefully before posting"** banner above the draft. This is a warning, not a hold: the draft is still returned.

Replies to reviews about a **wait**, **pricing**, or **accessibility** use topic-specific sentences (see `lib/reviewTopics.js`) that acknowledge the topic without quoting the review, admitting fault, or promising refunds, discounts, or fixes. Accessibility reviews are still held for a human by `lib/holdCheck.js`, so the accessibility sentence only appears if that hold is bypassed.

If the review needs a person instead of a draft:

```json
{
  "status": "needs_human",
  "reasons": [{ "code": "refund", "label": "Refund, chargeback, compensation, or billing dispute", "matches": ["refund"], "guidance": "..." }],
  "guidance": "ReplyLocal doesn't draft replies for reviews like this. ..."
}
```

## License

Private to the owner unless otherwise noted.
