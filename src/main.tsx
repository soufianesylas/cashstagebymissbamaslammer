import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { captureRedirectAuthError } from "./lib/authDebug";

// Record OAuth/email-link errors from the redirect URL before supabase-js
// strips the hash, so /auth-debug can show the last failure.
captureRedirectAuthError();

document.documentElement.classList.add("dark");
createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
