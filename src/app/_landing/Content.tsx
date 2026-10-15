import SignInButton from "./SignInButton";
import { signInWithGoogle } from "./actions";

export const HEADLINE = "Snap your plate. Get your macros.";

const MACROS = [
  { label: "Protein", value: "18g" },
  { label: "Carbs", value: "62g" },
  { label: "Fat", value: "11g" },
  { label: "Fibre", value: "6g" },
];

// Revealed after the zoom through the "O" (and shown in normal flow for
// reduced-motion / no-JS visitors): copy on the left, phone mockup on the right.
export default function Content() {
  return (
    <div className="macroly-panel">
      <div className="macroly-copy">
        <h1 className="macroly-h1">{HEADLINE}</h1>
        <p className="macroly-lede">
          Point your camera at any meal — Macroly reads the nutrition in seconds.
        </p>
        <form action={signInWithGoogle}>
          <button type="submit" className="macroly-cta">
            Try it free <span aria-hidden="true">→</span>
          </button>
        </form>
      </div>

      <div className="macroly-phone" role="img" aria-label="Example meal card: Dal tadka and 2 roti, 480 kilocalories, 18 grams protein, 62 grams carbs, 11 grams fat, 6 grams fibre">
        <div className="macroly-phone-notch" aria-hidden="true" />
        <div className="macroly-card" aria-hidden="true">
          <span className="macroly-card-tag">Scanned meal</span>
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
