import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1mb, which a photo upload (sent as FormData) easily
      // exceeds. Our own check in parseMealPhoto caps files at 8MB; this
      // needs enough headroom above that plus multipart framing overhead
      // so that check actually runs (and shows a friendly message) instead
      // of Next's own hard cutoff rejecting the request first.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
