import SignInButton from "./SignInButton";

const POINTS = [
  { title: "Scan a photo", body: "Snap your plate. No typing, no searching a food list." },
  { title: "See your macros", body: "Protein, carbs, fat and calories, worked out for you." },
  { title: "Get a better plate", body: "Simple swaps that move the meal toward your targets." },
];

export const HEADLINE = "Scan your plate. Get your macros. Fix your meal.";

// Revealed after the zoom through the "O" (and shown in normal flow for
// reduced-motion / no-JS visitors).
export default function Content() {
  return (
    <div className="macroly-content">
      <h1 className="macroly-h1">{HEADLINE}</h1>
      <ul className="macroly-points">
        {POINTS.map((p, i) => (
          <li key={p.title}>
            <span className="macroly-num" aria-hidden="true">0{i + 1}</span>
            <span className="macroly-point-title">{p.title}</span>
            <span className="macroly-point-body">{p.body}</span>
          </li>
        ))}
      </ul>
      <SignInButton tone="field" />
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
