import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this project so the parent-directory
  // pnpm-lock.yaml at ~/pnpm-lock.yaml doesn't accidentally win during build.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
