import { optOutFromLink } from "@/lib/opt-out";

/**
 * One-click unsubscribe (RFC 8058): mail apps POST here straight from the
 * List-Unsubscribe header. A GET (someone opening the header link) goes to
 * the page, which asks first.
 */
function params(req: Request) {
  const u = new URL(req.url).searchParams;
  return { u: u.get("u") ?? "", s: u.get("s") ?? "", sig: u.get("sig") ?? "" };
}

export async function POST(req: Request) {
  const { u, s, sig } = params(req);
  const ok = await optOutFromLink(u, s, sig);
  return new Response(ok ? "Unsubscribed." : "This link isn't valid.", { status: ok ? 200 : 400 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  url.pathname = "/unsubscribe";
  return Response.redirect(url, 303);
}
