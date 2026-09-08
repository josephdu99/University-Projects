import { formatClassWhenLong } from "@/lib/time";
import { logInfo, logError } from "@/lib/logger";

const FROM = process.env.EMAIL_FROM ?? "StepUp <onboarding@resend.dev>";

export function appUrl(path = "") {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}${path}`;
}

type Email = { to: string; subject: string; html: string; text: string };

/**
 * Sends mail via Resend when RESEND_API_KEY is set; otherwise logs the message.
 *
 * Logging rather than throwing keeps local development and preview deploys
 * usable without an email account — you can copy the verification link
 * straight out of the console.
 */
async function send(email: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    logInfo("email.stub", {
      to: email.to,
      subject: email.subject,
      preview: email.text.slice(0, 400),
    });
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logError("email.sendFailed", new Error(`Resend ${res.status}: ${body}`), {
      to: email.to,
      subject: email.subject,
    });
    throw new Error("Failed to send email");
  }
}

function layout(heading: string, body: string, cta?: { label: string; url: string }) {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f5f8;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#14151a">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
    <p style="margin:0 0 24px;font-size:20px;font-weight:800">🕺 StepUp</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${heading}</h1>
    <div style="font-size:15px;line-height:1.6;color:#565968">${body}</div>
    ${
      cta
        ? `<p style="margin:28px 0 0"><a href="${cta.url}" style="display:inline-block;background:#FC5200;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">${cta.label}</a></p>
           <p style="margin:16px 0 0;font-size:12px;color:#8b8e9c;word-break:break-all">Or paste this link into your browser:<br>${cta.url}</p>`
        : ""
    }
  </div>
</body></html>`;
}

export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  token: string;
}) {
  const url = appUrl(`/verify-email?token=${params.token}`);
  return send({
    to: params.to,
    subject: "Confirm your StepUp email",
    html: layout(
      `Welcome, ${params.name}!`,
      "<p>Confirm your email address to finish setting up your StepUp account.</p><p>This link expires in 24 hours.</p>",
      { label: "Confirm email", url }
    ),
    text: `Welcome to StepUp, ${params.name}!\n\nConfirm your email: ${url}\n\nThis link expires in 24 hours.`,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  token: string;
}) {
  const url = appUrl(`/reset-password?token=${params.token}`);
  return send({
    to: params.to,
    subject: "Reset your StepUp password",
    html: layout(
      "Reset your password",
      "<p>We received a request to reset your StepUp password. This link expires in 1 hour.</p><p>If you didn't ask for this, you can safely ignore this email, your password won't change.</p>",
      { label: "Reset password", url }
    ),
    text: `Reset your StepUp password: ${url}\n\nThis link expires in 1 hour. If you didn't request it, ignore this email.`,
  });
}

export async function sendBookingConfirmation(params: {
  to: string;
  name: string;
  classTitle: string;
  startTime: Date;
  timezone: string;
}) {
  const when = formatClassWhenLong(params.startTime, params.timezone);
  return send({
    to: params.to,
    subject: `You're booked: ${params.classTitle}`,
    html: layout(
      "See you on the floor 💃",
      `<p>You're booked into <strong>${params.classTitle}</strong>.</p><p><strong>${when}</strong></p>`,
      { label: "View my schedule", url: appUrl("/schedule") }
    ),
    text: `You're booked into ${params.classTitle}.\n${when}\n\n${appUrl("/schedule")}`,
  });
}

export async function sendClassCancelled(params: {
  to: string;
  name: string;
  classTitle: string;
  startTime: Date;
  timezone: string;
  reason?: string;
  refunded?: boolean;
}) {
  const when = formatClassWhenLong(params.startTime, params.timezone);
  return send({
    to: params.to,
    subject: `Cancelled: ${params.classTitle}`,
    html: layout(
      "A class you booked was cancelled",
      `<p><strong>${params.classTitle}</strong> on ${when} has been cancelled by the host.</p>
       ${params.reason ? `<p>Reason: ${params.reason}</p>` : ""}
       ${params.refunded ? "<p>Your payment has been refunded in full.</p>" : ""}`,
      { label: "Find another class", url: appUrl("/discover") }
    ),
    text: `${params.classTitle} on ${when} was cancelled.${
      params.reason ? `\nReason: ${params.reason}` : ""
    }${params.refunded ? "\nYour payment has been refunded." : ""}`,
  });
}

export async function sendWaitlistPromoted(params: {
  to: string;
  name: string;
  classTitle: string;
  startTime: Date;
  timezone: string;
}) {
  const when = formatClassWhenLong(params.startTime, params.timezone);
  return send({
    to: params.to,
    subject: `A spot opened up: ${params.classTitle}`,
    html: layout(
      "You're off the waitlist 🎉",
      `<p>A spot opened up in <strong>${params.classTitle}</strong> and it's yours.</p><p><strong>${when}</strong></p>`,
      { label: "View my schedule", url: appUrl("/schedule") }
    ),
    text: `You're off the waitlist for ${params.classTitle}.\n${when}\n\n${appUrl("/schedule")}`,
  });
}
