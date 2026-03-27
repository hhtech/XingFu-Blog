import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";

const rootDir = path.join(process.cwd(), "dist");
const port = Number(process.argv[2] || process.env.PORT || 4321);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function safePathname(urlPathname) {
  const decoded = decodeURIComponent(urlPathname.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[\\/])+/, "");
  return normalized.replace(/^[/\\]+/, "");
}

async function resolveFile(urlPathname) {
  const relativePath = safePathname(urlPathname);
  let targetPath = path.join(rootDir, relativePath);

  try {
    const stat = await fs.stat(targetPath);
    if (stat.isDirectory()) {
      targetPath = path.join(targetPath, "index.html");
    }
  } catch {
    if (!path.extname(targetPath)) {
      targetPath = path.join(targetPath, "index.html");
    }
  }

  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(path.resolve(rootDir))) {
    return null;
  }

  try {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) return null;
    return resolved;
  } catch {
    return null;
  }
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
  const filePath = await resolveFile(requestUrl.pathname);

  if (!filePath) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": mimeTypes.get(extension) || "application/octet-stream",
    "Cache-Control": "no-cache",
  });

  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${rootDir} at http://127.0.0.1:${port}/`);
});
