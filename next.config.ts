import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Pin the file-tracing root to THIS app dir. Two lockfiles exist (this dir +
  // the parent repo), so Next otherwise infers the parent as the workspace root,
  // which breaks serverless output-file tracing on Vercel (→ runtime 500s).
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.s3.eu-north-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "blog.cypexsoft.com",
      },
      {
        protocol: "https",
        hostname: "leewopbookkeeping.com",
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
