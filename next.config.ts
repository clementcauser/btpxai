import type { NextConfig } from "next";
import "./lib/env";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  turbopack: {
    // bufferutil and utf-8-validate are optional native addons for `ws`
    // (pulled in via @supabase/realtime-js). They use __dirname at module
    // evaluation time, which does not exist in the Edge Runtime. Alias them
    // to an empty stub so the middleware bundle never loads their native code.
    resolveAlias: {
      bufferutil: "./lib/edge-stub.js",
      "utf-8-validate": "./lib/edge-stub.js",
    },
  },
};

export default nextConfig;
