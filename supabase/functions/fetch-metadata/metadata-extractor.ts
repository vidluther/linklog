import { parseHTML } from "linkedom";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 5_000_000;
const USER_AGENT = "Dogmatix/1.0 (+https://api.linkblog.in)";
const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 1000;

export interface Metadata {
  title: string | null;
  description: string | null;
}

function truncate(value: string | null, max: number): string | null {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

function validateUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `URL Scheme not allowed(not http or https): ${parsed.protocol}`,
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    throw new Error("Localhost not allowed");
  }

  // Block private/reserved IPv4 ranges
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    if (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    ) {
      throw new Error("Private IP address not allowed");
    }
  }
}

function extractFromDocument(document: Document, url: string): Metadata {
  // Title priority: og:title → <title> → URL hostname
  const ogTitle = document
    .querySelector('meta[property="og:title"]')
    ?.getAttribute("content")
    ?.trim();

  const titleTag = document.querySelector("title")?.textContent?.trim();

  let hostname: string | null = null;
  try {
    hostname = new URL(url).hostname;
  } catch {
    // invalid URL, leave null
  }

  const title = ogTitle || titleTag || hostname;

  // Description priority: og:description → meta description → null
  const ogDescription = document
    .querySelector('meta[property="og:description"]')
    ?.getAttribute("content")
    ?.trim();

  const metaDescription = document
    .querySelector('meta[name="description"]')
    ?.getAttribute("content")
    ?.trim();

  const description = ogDescription || metaDescription || null;

  return {
    title: truncate(title, MAX_TITLE_LENGTH),
    description: truncate(description, MAX_DESCRIPTION_LENGTH),
  };
}

export async function fetchMetadata(url: string): Promise<Metadata> {
  validateUrl(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
      throw new Error("Response too large");
    }

    const html = await response.text();
    const { document } = parseHTML(html);

    return extractFromDocument(document, url);
  } finally {
    clearTimeout(timeout);
  }
}
