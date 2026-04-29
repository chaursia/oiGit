import type { IncomingMessage, ServerResponse } from "http";
import { getGitHubStats } from "../server/github";
import {
  generateStatsSVG,
  generateLanguagesSVG,
  generateStreakSVG,
  generateTrophiesSVG,
  generateOverviewSVG,
  generateHeatmapSVG,
  generateTopReposSVG,
} from "../server/svg-generator";
import { githubUsernameSchema } from "../shared/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function errorSVG(message: string): string {
  return `<svg width="495" height="120" xmlns="http://www.w3.org/2000/svg">
  <rect width="495" height="120" rx="4.5" fill="#0d1117" stroke="#f85149"/>
  <text x="247" y="55" text-anchor="middle" font-family="monospace" font-size="13" fill="#f85149">⚠ ${message}</text>
  <text x="247" y="80" text-anchor="middle" font-family="monospace" font-size="11" fill="#8b949e">Oi Git — oigit.app</text>
</svg>`.trim();
}

function getBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}

function parseUrl(req: IncomingMessage) {
  const base = `http://${req.headers.host ?? "localhost"}`;
  return new URL(req.url ?? "/", base);
}

function sendJSON(res: ServerResponse, status: number, body: object) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

function sendSVG(res: ServerResponse, status: number, svg: string) {
  res.writeHead(status, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=1800, stale-while-revalidate=300",
    "Content-Length": Buffer.byteLength(svg),
  });
  res.end(svg);
}

// ── Main handler (Vercel serverless entry point) ───────────────────────────────

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  const url = parseUrl(req);
  const pathname = url.pathname;

  // ── Route: GET /api/user/:username ── JSON stats for the dashboard
  const userMatch = pathname.match(/^\/api\/user\/([^/]+)$/);
  if (userMatch) {
    const raw = decodeURIComponent(userMatch[1]);
    const parsed = githubUsernameSchema.safeParse(raw);
    if (!parsed.success) {
      return sendJSON(res, 400, {
        error: parsed.error.errors[0]?.message ?? "Invalid username",
      });
    }

    try {
      const stats = await getGitHubStats(parsed.data);
      return sendJSON(res, 200, stats);
    } catch (err: any) {
      if (err.message === "User not found") {
        return sendJSON(res, 404, { error: "GitHub user not found" });
      }
      if (err.message?.startsWith("GitHub API rate limit")) {
        return sendJSON(res, 429, { error: err.message });
      }
      return sendJSON(res, 500, { error: "Failed to fetch GitHub stats" });
    }
  }

  // ── Route: GET /api ── SVG embed
  if (pathname === "/api" || pathname === "/api/") {
    const username = url.searchParams.get("username") ?? "";
    const type = url.searchParams.get("type") ?? "stats";
    const theme = url.searchParams.get("theme") ?? undefined;

    const parsed = githubUsernameSchema.safeParse(username);
    if (!parsed.success) {
      return sendSVG(
        res,
        400,
        errorSVG(parsed.error.errors[0]?.message ?? "Invalid username")
      );
    }

    try {
      const stats = await getGitHubStats(parsed.data);
      const opts = { theme };

      let svg: string;
      switch (type) {
        case "languages":
          svg = generateLanguagesSVG(stats, opts);
          break;
        case "streak":
          svg = generateStreakSVG(stats, opts);
          break;
        case "trophies":
          svg = generateTrophiesSVG(stats, opts);
          break;
        case "overview":
          svg = generateOverviewSVG(stats, opts);
          break;
        case "heatmap":
          svg = generateHeatmapSVG(stats, opts);
          break;
        case "repos":
          svg = generateTopReposSVG(stats, opts);
          break;
        case "stats":
        default:
          svg = generateStatsSVG(stats, opts);
          break;
      }

      return sendSVG(res, 200, svg);
    } catch (err: any) {
      const isNotFound = err.message === "User not found";
      const isRateLimit = err.message?.startsWith("GitHub API rate limit");
      const msg = isNotFound
        ? "User not found"
        : isRateLimit
        ? "Rate limit — try later"
        : "Failed to fetch stats";
      return sendSVG(res, isNotFound ? 404 : isRateLimit ? 429 : 500, errorSVG(msg));
    }
  }

  // ── Fallback 404 ─────────────────────────────────────────────────────────────
  sendJSON(res, 404, { error: "Not found" });
}
