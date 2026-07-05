import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  /* config options here */
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
};


export default nextConfig;
