const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../client");
const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];
  const normalizedPath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.join(root, decodeURIComponent(normalizedPath));

  if (!filePath.startsWith(root)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }

    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(`Server error: ${readErr.message}`);
        return;
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Static server listening on http://localhost:${port}`);
});
