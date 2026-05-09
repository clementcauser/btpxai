import type { NextConfig } from "next";
import "./lib/env";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "imapflow", "nodemailer"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
