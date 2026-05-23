import server from "../src/server";

function getRequestUrl(req: any) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const url = `${protocol}://${host}${req.url}`;
  return url;
}

function toRequest(req: any) {
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
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
  });
}

async function sendResponse(res: any, response: Response) {
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

export default async function handler(req: any, res: any) {
  try {
    const request = toRequest(req);
    const response = await server.fetch(request, {}, {});
    await sendResponse(res, response);
  } catch (error: any) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
}
