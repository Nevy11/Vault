import type { IncomingMessage, ServerResponse } from "http";
// @ts-expect-error -- server is generated during build
import server from "../dist/server/server.js";

function getRequestUrl(req: IncomingMessage) {
  const protocol = (req.headers["x-forwarded-proto"] as string) || "https";
  const host = req.headers.host as string;
  const url = `${protocol}://${host}${req.url}`;
  return url;
}

function toRequest(req: IncomingMessage) {
  const url = getRequestUrl(req);
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers || {})) {
    if (typeof value === "string") {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    }
  }

  return new Request(url, {
    method: req.method,
    headers,
    // @ts-expect-error -- req is compatible with BodyInit in this context
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
  });
}

async function sendResponse(res: ServerResponse, response: Response) {
  const body = await response.arrayBuffer();

  res.writeHead(response.status);
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (body.byteLength > 0) {
    res.end(Buffer.from(body));
  } else {
    res.end();
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const request = toRequest(req);
    const response = await (
      server as { fetch: (req: Request, env: unknown, ctx: unknown) => Promise<Response> }
    ).fetch(request, {}, {});
    await sendResponse(res, response);
  } catch (error: unknown) {
    console.error(error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
}
