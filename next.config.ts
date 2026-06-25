import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  
};

module.exports = {
  allowedDevOrigins: ['54.232.189.113'],
}

export default nextConfig;
