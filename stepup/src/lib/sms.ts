import { logError, logInfo } from "@/lib/logger";

/**
 * Text messages, through Twilio when it's set up. Like email without a Resend
 * key, an unconfigured SMS sender logs the message instead of failing, so
 * local development and previews work without a phone number. Pages say
 * "by SMS" only when `smsConfigured()` is true.
 */
export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER,
  );
}

/** StepUp's number as people would read it, e.g. "0480 000 123". */
export function smsNumberLabel(): string | null {
  const n = process.env.TWILIO_FROM_NUMBER;
  if (!n) return null;
  const local = n.replace(/^\+61/, "0").replace(/\D/g, "");
  return local.length === 10 ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : n;
}

/** "0412 345 678" → "+61412345678". Null for anything that isn't an AU mobile. */
export function toE164(mobile: string | null | undefined): string | null {
  if (!mobile) return null;
  const digits = mobile.replace(/\D/g, "");
  if (/^04\d{8}$/.test(digits)) return `+61${digits.slice(1)}`;
  if (/^614\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

export async function sendSms(to: string | null | undefined, body: string): Promise<boolean> {
  const e164 = toE164(to);
  if (!e164) return false;
  if (!smsConfigured()) {
    logInfo("sms.stub", { to: e164.slice(0, 6) + "…", preview: body.slice(0, 160) });
    return false;
  }
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: e164, From: process.env.TWILIO_FROM_NUMBER!, Body: body.slice(0, 640) }),
  });
  if (!res.ok) {
    logError("sms.sendFailed", new Error(`Twilio ${res.status}: ${await res.text().catch(() => "")}`));
    return false;
  }
  return true;
}
