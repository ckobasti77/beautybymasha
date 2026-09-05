import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nadređena fascikla ima svoj package-lock.json — Turbopack bi ga inače prijavljivao.
  turbopack: { root: __dirname },
  images: {
    formats: ["image/avif"],
    remotePatterns: [
      { protocol: "https", hostname: "**.convex.cloud" },
      { protocol: "https", hostname: "**.convex.site" },
    ],
  },
};

export default nextConfig;
