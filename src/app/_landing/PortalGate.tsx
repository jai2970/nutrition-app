"use client";

import { useEffect, useState, type ReactNode } from "react";
import GlyphPortal from "@/components/ui/glyph-portal";

// GlyphPortal freezes its font when it mounts and goes static if the face is
// missing, so we wait for Outfit before mounting it. Until then (and without
// JS) visitors see the same words as a plain stacked page.
export default function PortalGate({
  fontFamily,
  front,
  children,
}: {
  fontFamily: string;
  front: ReactNode;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  // next/font gives "'Outfit', 'Outfit Fallback'"; the fallback face never
  // reports as loaded, which would make GlyphPortal drop to its static mode.
  const family = fontFamily.split(",")[0].trim();

  useEffect(() => {
    let live = true;
    const go = () => live && setReady(true);
    const timer = setTimeout(go, 1500);
    document.fonts
      .load(`700 100px ${family}`, "MACROLY")
      .then(() => {
        clearTimeout(timer);
        go();
      })
      .catch(go);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [family]);

  if (!ready) {
    return (
      <div className="macroly-portal macroly-static">
        <div className="macroly-static-hero">
          <span className="macroly-static-word" style={{ fontFamily }}>MACROLY</span>
          {front}
        </div>
        <div className="macroly-static-body">{children}</div>
      </div>
    );
  }

  return (
    <GlyphPortal
      className="macroly-portal"
      word="MACROLY"
      focusChar="O"
      interactive={false}
      fontFamily={family}
      fontWeight={700}
      enterLabel="Scroll to enter"
      front={front}
      style={{ fontFamily: family }}
    >
      {children}
    </GlyphPortal>
  );
}
