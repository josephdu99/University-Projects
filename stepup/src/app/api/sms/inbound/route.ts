import { appUrl } from "@/lib/email";
import { handleInboundText, validTwilioSignature } from "@/lib/text-inbound";
import { checkRateLimit } from "@/lib/rate-limit";
import { logError, logWarn } from "@/lib/logger";

export const dynamic = "force-dynamic";

function twiml(message: string) {
  const esc = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${esc}</Message></Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

/**
 * Teachers' texts to StepUp's number (Twilio's "A message comes in" webhook).
 * Only requests signed with our Twilio auth token are read. Every command is
 * confirmed by a YES before anything changes.
 */
export async function POST(req: Request) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return new Response("Texting isn't set up.", { status: 503 });
  const form = await req.formData();
  const fields: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") fields[k] = v;
  const signature = req.headers.get("x-twilio-signature") ?? "";
  if (!validTwilioSignature(appUrl("/api/sms/inbound"), fields, signature, token)) {
    logWarn("sms.inbound.badSignature");
    return new Response("Forbidden", { status: 403 });
  }
  const from = fields.From ?? "";
  const limit = await checkRateLimit(`sms-in:${from}`, 30, 60 * 60_000);
  if (!limit.allowed) return twiml("Too many texts. Try again in a while.");
  try {
    return twiml(await handleInboundText(from, fields.Body ?? ""));
  } catch (err) {
    logError("sms.inbound", err);
    return twiml("Something went wrong on our side. Nothing changed. Try again, or use the app.");
  }
}
