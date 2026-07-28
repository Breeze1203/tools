import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { installDevBridge } from "./devBridge";
import "./styles/global.css";

installDevBridge();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
