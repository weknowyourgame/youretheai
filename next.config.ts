import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react95/core/Button": resolve(
        __dirname,
        "node_modules/@react95/core/dist/esm/Button/Button.mjs",
      ),
      "@react95/core/Frame": resolve(
        __dirname,
        "node_modules/@react95/core/dist/esm/Frame/Frame.mjs",
      ),
      "@react95/core/ProgressBar": resolve(
        __dirname,
        "node_modules/@react95/core/dist/esm/ProgressBar/ProgressBar.mjs",
      ),
      "@react95/core/TextArea": resolve(
        __dirname,
        "node_modules/@react95/core/dist/esm/TextArea/TextArea.mjs",
      ),
      "@react95/core/TitleBar": resolve(
        __dirname,
        "node_modules/@react95/core/dist/esm/TitleBar/TitleBar.mjs",
      ),
    };

    return config;
  },
};

export default nextConfig;
