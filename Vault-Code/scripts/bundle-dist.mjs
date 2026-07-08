import { build } from "esbuild";
import { readFile, rm, writeFile } from "node:fs/promises";

const distCss = "dist/styles.css";

await build({
  entryPoints: ["dist/app.js"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  minify: true,
  legalComments: "none",
  splitting: true,
  outdir: "dist",
  chunkNames: "chunks/[name]-[hash]",
  allowOverwrite: true,
  logLevel: "info",
});

const css = await readFile(distCss, "utf8");
const minCss = (
  await build({
    stdin: { contents: css, loader: "css" },
    write: false,
    minify: true,
    legalComments: "none",
  })
).outputFiles[0].text;
await writeFile(distCss, minCss);

await rm("dist/modules", { recursive: true, force: true });
console.log("bundled dist/app.js (+ chunks) and minified styles.css");
