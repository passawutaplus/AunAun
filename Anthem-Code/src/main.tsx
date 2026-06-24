import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installCspReporter } from "./lib/cspReporter";
import { initErrorMonitoring } from "./lib/errorMonitoring";
import { registerPwa } from "./lib/pwa";

installCspReporter();
void initErrorMonitoring();
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
