import { createServer } from "vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const junctionRoot = path.resolve(appRoot, "..", "AunAun", "Anthem-Code");

function pickDevRoot() {
  const candidates = [process.cwd(), junctionRoot, appRoot].filter(
    (dir, index, all) => all.indexOf(dir) === index,
  );

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "src", "main.tsx"))) {
      // Node 24 + Vite: run from the physical path, not the AunAun junction.
      return fs.realpathSync.native(dir);
    }
  }

  return fs.realpathSync.native(appRoot);
}

const devRoot = pickDevRoot();
process.chdir(devRoot);

const server = await createServer({
  configFile: path.join(devRoot, "vite.config.ts"),
});

await server.listen();
server.printUrls();

const shutdown = async () => {
  await server.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
