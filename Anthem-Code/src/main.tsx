import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installCspReporter } from "./lib/cspReporter";
import { initErrorMonitoring } from "./lib/errorMonitoring";
import { loadBrandFonts } from "./lib/loadBrandFonts";
import { registerPwa } from "./lib/pwa";

installCspReporter();
void initErrorMonitoring();
loadBrandFonts();
registerPwa();

const initialUrl = `${window.location.origin}${window.location.pathname}`;
document.head
  .querySelectorAll<HTMLMetaElement>('meta[property="og:url"]')
  .forEach((meta) => meta.setAttribute("content", initialUrl));
document.head
  .querySelectorAll<HTMLLinkElement>('link[rel="canonical"]')
  .forEach((link) => {
    link.href = initialUrl;
  });

createRoot(document.getElementById("root")!).render(<App />);
