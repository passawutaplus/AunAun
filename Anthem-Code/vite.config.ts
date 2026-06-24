import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";

// Anthem-Code in AunAun is a junction → F:\So1o\AnthemCode (formerly "Anthem Code").
function resolveProjectRoot() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "src", "main.tsx"))) {
    return fs.realpathSync.native(cwd);
  }
  return fs.realpathSync.native(__dirname);
}

const projectRoot = resolveProjectRoot();
const viteCacheDir = path.resolve(projectRoot, "..", ".vite-cache", "anthem-code");

// https://vitejs.dev/config/
export default defineConfig({
  root: projectRoot,
  cacheDir: viteCacheDir,
  server: {
    host: "::",
    port: Number(process.env.PORT ?? 8080),
    fs: {
      allow: [projectRoot, path.resolve(projectRoot, "..")],
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.join(projectRoot, "src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts")) return "recharts";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack")) return "tanstack";
          if (id.includes("lucide-react")) return "lucide";
        },
      },
    },
  },
});
