import Image from "next/image";
import SignInButton from "./SignInButton";

export const HEADLINE = "Snap. Scan. Improve.";

const MACROS = [
  { label: "Protein", value: "18g" },
  { label: "Carbs", value: "62g" },
  { label: "Fat", value: "11g" },
  { label: "Fibre", value: "6g" },
];

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const STEPS = [
  {
    title: "Snap your plate",
    body: "Photo your meal, any cuisine",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    ),
  },
  {
    title: "AI reads the macros",
    body: "Protein, carbs, fat, fibre in seconds",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
        <path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z" />
      </svg>
    ),
  },
  {
    title: "Get suggestions",
    body: "See exactly what to add or swap",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M9 18h6M10 21h4" />
        <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
      </svg>
    ),
  },
];

// Revealed after the zoom through the "O" (and shown in normal flow for
// reduced-motion / no-JS visitors): copy + coach bubble on the left, phone
// mockup on the right, then a "how it works" row.
export default function Content() {
  return (
    <div className="macroly-panel">
      <div className="macroly-top">
        <div className="macroly-copy">
          <h1 className="macroly-h1">{HEADLINE}</h1>
          <p className="macroly-lede">
            Point your camera at any meal — Macroly reads the nutrition in seconds.
          </p>
          <aside className="macroly-bubble">
            <span className="macroly-bubble-tag">AI suggestion</span>
            <p>
              Your dal tadka has 18g protein. Add 50g paneer to reach your 90g daily goal.
            </p>
          </aside>
        </div>

        <figure className="macroly-phone-wrap">
          <div
            className="macroly-phone"
            role="img"
            aria-label="Example: a thali photo with the meal card Dal tadka and 2 roti, 480 kilocalories, 18 grams protein, 62 grams carbs, 11 grams fat, 6 grams fibre"
          >
            <div className="macroly-shot" aria-hidden="true">
              <Image src="/images/thali.jpg" alt="" fill sizes="280px" className="macroly-shot-img" />
            </div>
            <div className="macroly-card" aria-hidden="true">
              <span className="macroly-card-name">Dal tadka + 2 roti</span>
              <span className="macroly-card-kcal">
                480 <small>kcal</small>
              </span>
              <ul className="macroly-pills">
                {MACROS.map((m) => (
                  <li key={m.label}>
                    <span>{m.label}</span>
                    <strong>{m.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <figcaption className="macroly-credit">Photo: Unsplash</figcaption>
        </figure>
      </div>

      <section className="macroly-how" aria-labelledby="macroly-how-title">
        <h2 id="macroly-how-title" className="macroly-how-title">How it works</h2>
        <ol className="macroly-steps">
          {STEPS.map((s) => (
            <li key={s.title}>
              <span className="macroly-step-icon">{s.icon}</span>
              <strong>{s.title}</strong>
              <span>{s.body}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

// Opening frame, over the clipped scene: a short line and the sign-in button.
export function Front() {
  return (
    <div className="macroly-front">
      <p className="macroly-sub">Your plate, decoded.</p>
      <SignInButton tone="paper" />
    </div>
  );
}
