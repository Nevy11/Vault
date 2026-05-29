import { Request as ExpressRequest, Response as ExpressResponse } from "express";
// @ts-expect-error -- server is generated during build
import server from "../dist/server/index.js";

function getRequestUrl(req: ExpressRequest) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const url = `${protocol}://${host}${req.url}`;
  return url;
}

function toRequest(req: ExpressRequest) {
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

async function sendResponse(res: ExpressResponse, response: Response) {
  const body = await response.arrayBuffer();

  res.status(response.status);
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      res.setHeader(key, response.headers.get(key) ?? "");
    } else {
      res.setHeader(key, value);
    }
  });

  if (body.byteLength > 0) {
    res.end(Buffer.from(body));
  } else {
    res.end();
  }
}

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
  try {
    const request = toRequest(req);
    const response = await (
      server as { fetch: (req: Request, env: unknown, ctx: unknown) => Promise<Response> }
    ).fetch(request, {}, {});
    await sendResponse(res, response);
  } catch (error: unknown) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
}
