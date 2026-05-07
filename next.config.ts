import type { NextConfig } from "next";
import "./lib/env";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  webpack: (config, { nextRuntime, webpack }) => {
    if (nextRuntime === "edge") {
      // Transitive deps (e.g. ws via @supabase/realtime-js) reference __dirname
      // at module evaluation time. The Edge Runtime has no __dirname global, so
      // we polyfill it at the webpack level before the bundle runs.
      config.plugins.push(
        new webpack.DefinePlugin({
          __dirname: JSON.stringify("/"),
          __filename: JSON.stringify("/middleware.js"),
        })
      );
      // Prevent optional native addons from ws from being bundled in Edge
      config.resolve.alias = {
        ...config.resolve.alias,
        bufferutil: false,
        "utf-8-validate": false,
      };
    }
    return config;
  },
};

export default nextConfig;
