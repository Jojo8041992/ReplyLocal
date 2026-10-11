"use client";

import { useState } from "react";

export default function HomePage() {
  const [businessName, setBusinessName] = useState("");
  const [stars, setStars] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [tone, setTone] = useState("professional");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  // Set when the API says this review needs a person, not a draft.
  const [hold, setHold] = useState(null);

  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    setCopied(false);
    setLoading(true);
    setReply("");
    setHold(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, stars, reviewText, tone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }
      if (data.status === "needs_human") {
        setHold({
          reasons: Array.isArray(data.reasons) ? data.reasons : [],
          guidance: data.guidance || "",
        });
        return;
      }
      setReply(data.reply || "");
    } catch (err) {
      setError(err.message || "Could not generate a reply.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!reply) return;
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard. Select the text and copy manually.");
    }
  }

  return (
    <main className="page">
      <header className="header">
        <div className="logo">
          <span className="logo-mark" aria-hidden="true">
            R
          </span>
          ReplyLocal
        </div>
        <h1>Reply to Google reviews in seconds</h1>
        <p className="subtitle">
          Built for local businesses. Paste a customer review, pick a star
          rating, and get a polished reply you can copy and post — free, no
          sign-up.
        </p>
        <span className="badge">Week 1 · Free public tool</span>
      </header>

      <section className="card">
        <form className="form-grid" onSubmit={handleGenerate}>
          <div>
            <label htmlFor="businessName">Business name</label>
            <input
              id="businessName"
              type="text"
              placeholder="e.g. Maple Street Bakery"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              maxLength={120}
              autoComplete="organization"
            />
          </div>

          <div>
            <label>
              Star rating <span className="hint">(1–5)</span>
            </label>
            <div className="stars" role="group" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`star-btn${stars === n ? " active" : ""}`}
                  onClick={() => setStars(n)}
                  aria-pressed={stars === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  {n}★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="reviewText">Customer review</label>
            <textarea
              id="reviewText"
              placeholder="Paste the Google review text here…"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              required
              maxLength={4000}
            />
          </div>

          <div className="row-2">
            <div>
              <label htmlFor="tone">Tone (optional)</label>
              <select
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="apologetic">Apologetic</option>
              </select>
            </div>
            <div className="actions" style={{ alignItems: "end" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: "100%" }}
              >
                {loading ? "Generating…" : "Generate reply"}
              </button>
            </div>
          </div>
        </form>

        {error ? <div className="error">{error}</div> : null}

        {hold ? (
          <div className="hold-panel" role="alert">
            <h2 className="hold-title">Needs a human</h2>
            <p>
              We didn&apos;t draft a reply for this review. It mentions
              something an owner or manager should read and answer personally:
            </p>
            <ul className="hold-reasons">
              {hold.reasons.map((r) => (
                <li key={r.code}>
                  <strong>{r.label}</strong>
                  {r.guidance ? <span> — {r.guidance}</span> : null}
                </li>
              ))}
            </ul>
            <p className="hold-note">
              Take your time, check the facts privately, and avoid admitting
              fault, promising refunds, or discussing health details in public.
            </p>
          </div>
        ) : null}

        <div className="output" hidden={!!hold}>
          <div className="output-label">
            <label htmlFor="replyOutput" style={{ marginBottom: 0 }}>
              Your reply
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCopy}
              disabled={!reply}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div
            id="replyOutput"
            className="reply-box"
            role="textbox"
            aria-readonly="true"
          >
            {reply ||
              "Your generated reply will appear here. Keep it under ~500 characters for Google."}
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>
          Replies are template-based for week 1 — no account or API key needed.
          Google Business Profile connection coming later.
        </p>
      </footer>
    </main>
  );
}
