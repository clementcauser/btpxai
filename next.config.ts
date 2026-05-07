import type { NextConfig } from "next";
import "./lib/env";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  experimental: {
    // Run middleware in Node.js runtime instead of Edge Runtime.
    // Next.js 16 / Turbopack injects __dirname references in the Edge bundle
    // even for minimal middleware, causing MIDDLEWARE_INVOCATION_FAILED.
    // Node.js runtime has __dirname natively and supports all packages.
    nodeMiddleware: true,
  },
};

export default nextConfig;
