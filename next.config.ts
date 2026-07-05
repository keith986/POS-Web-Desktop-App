import type { NextConfig } from "next";

module.exports = {
  async headers() {
    return [
      {
        source : "/sw.js",
        headers: [
          {keys: "Cache-Control", value: "no-cache, no-store, must-revalidate"},
        ]
      }
    ]
  }
}

const nextConfig: NextConfig = {
  /* config options here */
};


export default nextConfig;
