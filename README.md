# ReplyLocal

**AI-assisted Google review replies for local businesses.**

Paste a customer review, your business name, and a star rating — get a polished reply you can copy and post. Free to use, no sign-up required for week 1.

## Week-1 scope

- Public landing page with a simple reply generator
- Rule/template-based replies (no paid AI API keys required)
- Star-aware tone: thank & invite (5★), acknowledge & invite (3–4★), apologize & invite offline (1–2★)
- Optional tone: professional, friendly, or apologetic
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
  "reply": "Thank you so much for the kind words! ..."
}
```

## License

Private to the owner unless otherwise noted.
