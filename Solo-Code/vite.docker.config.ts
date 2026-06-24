/**
 * Vite config for Docker / Node SSR builds (no Cloudflare Worker bundle).
 * Use: npm run build:docker
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const viteEnv = loadEnv(mode, root, "VITE_");
  const define: Record<string, string> = {};
  for (const [key, value] of Object.entries(viteEnv)) {
    define[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define,
    plugins: [
      tailwindcss(),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart(),
      react(),
    ],
    resolve: {
      alias: { "@": path.resolve(root, "src") },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    server: {
      host: true,
      port: Number(process.env.PORT ?? 8080),
      strictPort: true,
    },
    preview: {
      host: true,
      port: Number(process.env.PORT ?? 3000),
    },
  };
});
