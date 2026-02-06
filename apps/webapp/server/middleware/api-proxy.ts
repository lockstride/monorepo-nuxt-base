import { H3Event, defineEventHandler, getRequestURL, proxyRequest } from "h3";

export default defineEventHandler(async (event: H3Event) => {
  const url = getRequestURL(event);
  if (!url.pathname.startsWith("/api/")) {
    return;
  }

  const interopApiDomain = process.env.INTEROP_API_DOMAIN || "http://127.0.0.1";
  const interopApiPort = process.env.INTEROP_API_PORT || "3001";

  const targetBase = `${interopApiDomain}:${interopApiPort}`;
  const targetUrl = `${targetBase}${url.pathname}${url.search}`;

  return proxyRequest(event, targetUrl);
});
