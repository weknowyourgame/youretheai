import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("error", (_error, _request, response) => {
            if (!response.headersSent) {
              response.writeHead(503, {
                "Content-Type": "application/json",
              });
            }

            response.end(
              JSON.stringify({
                error: "api_unavailable",
                message:
                  "Prompt Panic API is not running. Start it with npm run dev.",
              }),
            );
          });
        },
      },
    },
  },
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
