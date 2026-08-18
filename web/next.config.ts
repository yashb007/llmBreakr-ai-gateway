import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: {
    dirs: ["src"],
  },
  output: "standalone",
  // Root package.json's dev script (run from repo root) makes Next.js see
  // two lockfiles and guess the workspace root — pin it to web/ explicitly.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
