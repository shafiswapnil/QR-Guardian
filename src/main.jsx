import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import swManager from "./lib/sw-manager.js";

// Register service worker for both development and production
swManager
  .register()
  .then((registered) => {
    if (registered) {
      console.log("Service Worker registered successfully");
    } else {
      console.warn("Service Worker registration failed");
    }
  })
  .catch((error) => {
    console.error("Service Worker registration error:", error);
  });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
