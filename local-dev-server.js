const http = require("http");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const root = __dirname;
const port = Number(process.env.PORT || 8888);

function loadEnv() {
  const envPath = path.join(root, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");

    if (index === -1) {
      continue;
    }

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function send(res, statusCode, headers, body) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function notFound(res) {
  send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function runFunction(functionName, req, res) {
  const functionPath = path.join(root, "netlify", "functions", `${functionName}.js`);
  const mod = require(functionPath);
  const body = await readBody(req);
  const result = await mod.handler({
    httpMethod: req.method,
    headers: req.headers,
    body
  });

  send(
    res,
    result.statusCode || 200,
    result.headers || { "Content-Type": "application/json; charset=utf-8" },
    result.body || ""
  );
}

function staticPath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  const filePath = pathname === "/" ? path.join(root, "index.html") : path.join(root, pathname);
  const resolved = path.resolve(filePath);

  if (!resolved.startsWith(root)) {
    return "";
  }

  return resolved;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  return (
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon"
    }[ext] || "application/octet-stream"
  );
}

loadEnv();

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/upload-url")) {
      await runFunction("upload-url", req, res);
      return;
    }

    if (req.url.startsWith("/api/submit")) {
      await runFunction("submit", req, res);
      return;
    }

    const filePath = staticPath(req.url);

    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      notFound(res);
      return;
    }

    send(res, 200, { "Content-Type": contentType(filePath) }, fs.readFileSync(filePath));
  } catch (error) {
    console.error(error);
    send(
      res,
      500,
      { "Content-Type": "application/json; charset=utf-8" },
      JSON.stringify({ message: "Local server error." })
    );
  }
});

server.listen(port, () => {
  console.log(`Local dev server ready on http://localhost:${port}`);
  console.log("Press Ctrl+C to stop.");
});
