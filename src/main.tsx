import React from "react";
import { createRoot } from "react-dom/client";
import "../node_modules/@react95/core/dist/esm/GlobalStyle/GlobalStyle.css.ts.vanilla.css";
import "../node_modules/@react95/core/dist/esm/themes/win95.css.ts.vanilla.css";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
