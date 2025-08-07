import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import swManager from "./lib/sw-manager.js";

// Register service worker
if (import.meta.env.PROD) {
  swManager.register().then((registered) => {
    if (registered) {
      console.log("Service Worker registered successfully");
    } else {
      console.warn("Service Worker registration failed");
    }
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
