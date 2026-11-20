import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  allowedDevOrigins: ["172.31.*.*", "10.*.*.*", "localhost", "127.0.0.1"],

  async headers() {
    return [
      {
        source: "/wallpapers/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${process.env.BACKEND_URL ?? "http://127.0.0.1:4000"}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
