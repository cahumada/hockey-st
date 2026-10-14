import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [new URL("https://lh3.googleusercontent.com/**")],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
