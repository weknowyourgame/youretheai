import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
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
      "@react95/core/Modal": resolve(
        __dirname,
        "node_modules/@react95/core/dist/esm/Modal/Modal.mjs",
      ),
      "@react95/core/Alert": resolve(
        __dirname,
        "node_modules/@react95/core/dist/esm/Alert/Alert.mjs",
      ),
      "@react95/core/Tooltip": resolve(
        __dirname,
        "node_modules/@react95/core/dist/esm/Tooltip/Tooltip.mjs",
      ),
      "@react95/core/Dropdown": resolve(
        __dirname,
        "node_modules/@react95/core/dist/esm/Dropdown/Dropdown.mjs",
      ),
      "@react95/core/List": resolve(
        __dirname,
        "node_modules/@react95/core/dist/esm/List/List.mjs",
      ),
      "@react95/core/TaskBar": resolve(
        __dirname,
        "node_modules/@react95/core/dist/esm/TaskBar/TaskBar.mjs",
      ),
      "@react95/core/Cursor": resolve(
        __dirname,
        "node_modules/@react95/core/dist/esm/Cursor/Cursor.css.mjs",
      ),
      [resolve(
        __dirname,
        "node_modules/@react95/core/dist/esm/List/List.css.mjs",
      )]: resolve(__dirname, "app/_lib/react95-list-css.ts"),
      "@react95/icons": resolve(__dirname, "app/_lib/react95-icons.tsx"),
    };

    return config;
  },
};

export default nextConfig;
