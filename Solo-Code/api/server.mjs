/**
 * Vercel serverless entry — TanStack Start SSR (dist/server/server.js).
 */
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { NodeRequest, sendNodeResponse } from "srvx/node";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverEntry = join(root, "dist/server/server.js");

let serverBuild;

export default async function handler(req, res) {
  try {
    if (!serverBuild) {
      const imported = await import(pathToFileURL(serverEntry).href);
      serverBuild = imported.default;
      if (!serverBuild?.fetch) {
        throw new Error(`Invalid server entry at ${serverEntry}`);
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
  } catch (err) {
    console.error("[vercel-server]", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
    }
    res.end("Internal Server Error");
  }
}
