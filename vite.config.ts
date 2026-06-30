import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@react95\/core\/Button$/,
        replacement: resolve(
          __dirname,
          "node_modules/@react95/core/dist/esm/Button/Button.mjs",
        ),
      },
      {
        find: /^@react95\/core\/Frame$/,
        replacement: resolve(
          __dirname,
          "node_modules/@react95/core/dist/esm/Frame/Frame.mjs",
        ),
      },
      {
        find: /^@react95\/core\/ProgressBar$/,
        replacement: resolve(
          __dirname,
          "node_modules/@react95/core/dist/esm/ProgressBar/ProgressBar.mjs",
        ),
      },
      {
        find: /^@react95\/core\/TextArea$/,
        replacement: resolve(
          __dirname,
          "node_modules/@react95/core/dist/esm/TextArea/TextArea.mjs",
        ),
      },
      {
        find: /^@react95\/core\/TitleBar$/,
        replacement: resolve(
          __dirname,
          "node_modules/@react95/core/dist/esm/TitleBar/TitleBar.mjs",
        ),
      },
    ],
  },
});
