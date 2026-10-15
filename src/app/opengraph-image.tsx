import { ImageResponse } from "next/og";

export const alt = "Macroly — scan your plate, get your macros, fix your meal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Link-preview card: warm cream background with the app icon (green plate + leaf).
export default function OpengraphImage() {
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
        <svg width="300" height="300" viewBox="0 0 64 64">
          <rect width="64" height="64" rx="14" fill="#2F9E6B" />
          <circle cx="29" cy="38" r="14" fill="none" stroke="#fff" strokeWidth="6" />
          <path d="M33 22C36 11 46 7 56 10C53 21 43 25 33 22Z" fill="#fff" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>Macroly</div>
          <div style={{ fontSize: 36, lineHeight: 1.3, color: "#7A6C5A" }}>
            Scan your plate. Get your macros. Fix your meal.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
