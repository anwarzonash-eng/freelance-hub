import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
