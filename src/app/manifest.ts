import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Macroly",
    short_name: "Macroly",
    description: "Track your meals, protein, calories and macros.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fbf8f2",
    theme_color: "#2f9e6b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
