import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["cheerio"],
  images: { remotePatterns: [{ protocol: "https", hostname: "www.google.com" }] },
};
export default config;
