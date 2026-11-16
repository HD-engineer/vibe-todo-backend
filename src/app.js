const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { handleTodoRoutes } = require("../routhers/todos");

const publicDirectory = path.join(__dirname, "..", "public");
const staticFiles = new Map([
  ["/", { file: "index.html", type: "text/html; charset=utf-8" }],
  ["/styles.css", { file: "styles.css", type: "text/css; charset=utf-8" }],
  ["/app.js", { file: "app.js", type: "text/javascript; charset=utf-8" }],
]);

function createApp({ database, getDatabase } = {}) {
  return http.createServer(async (request, response) => {
    try {
      const { pathname } = new URL(request.url, "http://localhost");
      const staticFile = request.method === "GET" && staticFiles.get(pathname);

      if (staticFile) {
        const content = await fs.readFile(path.join(publicDirectory, staticFile.file));
        response.writeHead(200, { "Content-Type": staticFile.type });
        response.end(content);
        return;
      }

      response.setHeader("Content-Type", "application/json; charset=utf-8");

      if (request.method === "GET" && request.url === "/health") {
        response.writeHead(200);
        response.end(JSON.stringify({ status: "ok" }));
        return;
      }

      const activeDatabase = getDatabase ? getDatabase() : database;

      if (await handleTodoRoutes(request, response, activeDatabase)) {
        return;
      }

      response.writeHead(404);
      response.end(JSON.stringify({ message: "Not Found" }));
    } catch (error) {
      console.error("요청 처리 실패:", error.message);
      response.writeHead(500);
      response.end(JSON.stringify({ message: "서버 오류가 발생했습니다." }));
    }
  });
}

module.exports = { createApp };
