import { ImageResponse } from "next/og";

export const alt = "Nutrition Tracker — log meals, hit your protein";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Link-preview card in the app's own palette: warm cream, coral protein ring.
export default function OpengraphImage() {
  const R = 120;
  const C = 2 * Math.PI * R;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 72,
          background: "#FBF8F2",
          color: "#1B1510",
        }}
      >
        <svg width="340" height="340" viewBox="0 0 340 340">
          <circle cx="170" cy="170" r={R} fill="none" stroke="#FBE3DA" strokeWidth="36" />
          <circle
            cx="170"
            cy="170"
            r={R}
            fill="none"
            stroke="#E8542E"
            strokeWidth="36"
            strokeLinecap="round"
            strokeDasharray={`${C * 0.72} ${C}`}
            transform="rotate(-90 170 170)"
          />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>Nutrition Tracker</div>
          <div style={{ fontSize: 36, lineHeight: 1.3, color: "#7A6C5A" }}>
            Log meals from a photo or a sentence. Hit your protein.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
