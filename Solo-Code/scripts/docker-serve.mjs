/**
 * Production Node HTTP server for TanStack Start SSR output (dist/server).
 */
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { NodeRequest, sendNodeResponse } from "srvx/node";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverEntry = join(root, "dist/server/server.js");

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

let serverBuild;

const server = createServer((req, res) => {
  (async () => {
    if (!serverBuild) {
      const imported = await import(pathToFileURL(serverEntry).href);
      serverBuild = imported.default;
      if (!serverBuild?.fetch) {
        throw new Error(
          `Invalid server entry at ${serverEntry} — expected default export with fetch()`,
        );
      }
    }

    const nodeReq = new NodeRequest({ req, res });
    const webRes = await serverBuild.fetch(nodeReq);

    if (webRes.headers.get("content-type")?.startsWith("text/html")) {
      res.setHeader("content-encoding", "identity");
    }

    res.setHeaders(webRes.headers);
    res.writeHead(webRes.status, webRes.statusText);
    await sendNodeResponse(res, webRes);
  })().catch((err) => {
    console.error("[docker-serve]", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
    }
    res.end("Internal Server Error");
  });
});

server.listen(port, host, () => {
  console.log(`So1o Freelancer listening on http://${host}:${port}`);
});
