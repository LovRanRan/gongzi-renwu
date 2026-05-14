const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const rootDir = __dirname;
const port = Number(process.env.PORT || 3000);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function send(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, headers);
  response.end(body);
}

async function resolveFile(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  let filePath = path.resolve(rootDir, relativePath);

  if (!filePath.startsWith(rootDir + path.sep) && filePath !== rootDir) {
    return null;
  }

  const stat = await fs.stat(filePath);
  if (stat.isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  return filePath;
}

const server = http.createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, "方法不支持", { Allow: "GET, HEAD" });
    return;
  }

  try {
    const filePath = await resolveFile(request.url || "/");
    if (!filePath) {
      send(response, 403, "禁止访问");
      return;
    }

    const body = request.method === "HEAD" ? "" : await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    send(response, 200, body, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      send(response, 404, "页面不存在");
      return;
    }

    send(response, 500, "服务器错误");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`工资任务已启动：http://0.0.0.0:${port}`);
});
