import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Skip image optimization — all images are external (loremflickr, etc.)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
