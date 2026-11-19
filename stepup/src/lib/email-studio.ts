/**
 * Emails for the studio admin tools: class messages, venue changes, waitlist
 * offers, no-show notices, pass offers, teacher class lists, WWCC reminders
 * and "enrolments are open". Anything a studio or student typed is escaped.
 */
import { appUrl, emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { formatClassWhenLong } from "@/lib/time";
import { money } from "@/lib/statement";

const e = escapeHtml;

export async function sendClassMessage(p: {
  to: string;
  name: string;
  hostName: string;
  classTitle: string;
  startTime: Date;
  timezone: string;
  body: string;
  replyTo?: string | null;
}) {
  const when = formatClassWhenLong(p.startTime, p.timezone);
  return sendEmail({
    to: p.to,
    replyTo: p.replyTo ?? undefined,
    subject: `${p.classTitle}: a message from ${p.hostName}`,
    html: emailLayout(
      `A message about ${e(p.classTitle)}`,
      `<p>${e(p.hostName)} sent this to everyone booked for <strong>${e(p.classTitle)}</strong>, ${when}:</p>
       <p style="padding:12px 16px;border-left:3px solid #FC5200;background:#fafafa;color:#14151a">${e(p.body)}</p>`,
      { label: "See my schedule", url: appUrl("/schedule") },
    ),
    text: `${p.hostName} sent this to everyone booked for ${p.classTitle}, ${when}:\n\n${p.body}`,
  });
}

export async function sendVenueChanged(p: {
  to: string;
  classTitle: string;
  startTime: Date;
  timezone: string;
  venueName: string;
  address: string;
  classUrl: string;
}) {
  const when = formatClassWhenLong(p.startTime, p.timezone);
  return sendEmail({
    to: p.to,
    subject: `New location: ${p.classTitle}`,
    html: emailLayout(
      "Your class has moved",
      `<p><strong>${e(p.classTitle)}</strong>, ${when}, is now at <strong>${e(p.venueName)}</strong>, ${e(p.address)}.</p>
       <p>Your booking stays as it is. If you can't make the new location, you can cancel free, whatever the usual cancellation policy says.</p>`,
      { label: "See the class", url: p.classUrl },
    ),
    text: `${p.classTitle}, ${when}, is now at ${p.venueName}, ${p.address}.\nYour booking stays. Can't make it? Cancel free: ${p.classUrl}`,
  });
}

export async function sendPlaceOffered(p: {
  to: string;
  classTitle: string;
  startTime: Date;
  timezone: string;
  payUrl: string;
  holdHours: number;
}) {
  const when = formatClassWhenLong(p.startTime, p.timezone);
  return sendEmail({
    to: p.to,
    subject: `A place opened up: ${p.classTitle}`,
    html: emailLayout(
      "A place opened up for you",
      `<p>A place opened in <strong>${e(p.classTitle)}</strong>, ${when}, and you're next on the waitlist.</p>
       <p>It's held for you for ${p.holdHours} hours. Pay to confirm it; after that it goes to the next person.</p>`,
      { label: "Pay and confirm", url: p.payUrl },
    ),
    text: `A place opened in ${p.classTitle}, ${when}. It's held for ${p.holdHours} hours. Pay to confirm: ${p.payUrl}`,
  });
}

export async function sendNoShowNotice(p: {
  to: string;
  name: string;
  studioName: string;
  count: number;
  prepay: boolean;
}) {
  const subject = p.prepay
    ? `Booking at ${p.studioName}: prepay from now on`
    : `A heads-up from ${p.studioName}`;
  const body = p.prepay
    ? `<p>You've missed ${p.count} classes at ${e(p.studioName)} in the last 60 days without cancelling. From now on, bookings there are paid upfront and late cancellations aren't refunded or credited.</p>`
    : `<p>You've missed ${p.count} classes at ${e(p.studioName)} in the last 60 days without cancelling. If it happens a third time, bookings there will need to be paid upfront with no late refunds.</p>
       <p>Can't make a class? Cancel it from your schedule and the place goes to someone else.</p>`;
  return sendEmail({
    to: p.to,
    subject,
    html: emailLayout(`Hi ${e(p.name)}`, body, { label: "See my schedule", url: appUrl("/schedule") }),
    text: `${body.replace(/<[^>]+>/g, "").trim()}\n\n${appUrl("/schedule")}`,
  });
}

export async function sendPassOffer(p: {
  to: string;
  name: string;
  studioName: string;
  message: string;
  passName: string;
  priceCents: number;
  link: string | null;
  replyTo: string | null;
  unsubscribeUrl: string;
}) {
  return sendEmail({
    to: p.to,
    replyTo: p.replyTo ?? undefined,
    unsubscribeUrl: p.unsubscribeUrl,
    subject: `${p.studioName}: ${p.passName}`,
    html: emailLayout(
      `From ${e(p.studioName)}`,
      `<p>Hi ${e(p.name)},</p><p>${e(p.message)}</p>
       <p><strong>${e(p.passName)}</strong> · ${money(p.priceCents)}</p>
       ${p.link ? "" : `<p>Reply to this email and ${e(p.studioName)} will set it up.</p>`}
       <p style="font-size:12px;color:#8b8e9c">You booked a class at ${e(p.studioName)} on StepUp, so they can contact you directly.
       <a href="${p.unsubscribeUrl}">Stop offers from ${e(p.studioName)}</a>.</p>`,
      p.link ? { label: "See the pass", url: p.link } : undefined,
    ),
    text: `Hi ${p.name},\n\n${p.message}\n\n${p.passName} · ${money(p.priceCents)}${p.link ? `\n${p.link}` : `\nReply to this email and ${p.studioName} will set it up.`}\n\nStop offers from ${p.studioName}: ${p.unsubscribeUrl}`,
  });
}

export async function sendTeacherClassList(p: {
  to: string;
  name: string;
  classTitle: string;
  startTime: Date;
  timezone: string;
  booked: number;
  firstTimers: number;
  url: string;
}) {
  const when = formatClassWhenLong(p.startTime, p.timezone);
  return sendEmail({
    to: p.to,
    subject: `Class list: ${p.classTitle}, ${when}`,
    html: emailLayout(
      `${e(p.classTitle)} is in 48 hours`,
      `<p>${p.booked} booked, ${p.firstTimers} of them first-timers. Open the class list on your phone at the door: one tap marks each student attended or no-show.</p>`,
      { label: "Open the class list", url: p.url },
    ),
    text: `${p.classTitle}, ${when}: ${p.booked} booked, ${p.firstTimers} first-timers.\nClass list: ${p.url}`,
  });
}

export async function sendWwccReminder(p: {
  to: string;
  studioName: string;
  teacherName: string;
  number: string;
  expiry: Date;
}) {
  const date = p.expiry.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" });
  return sendEmail({
    to: p.to,
    subject: `Working With Children Check expires ${date}`,
    html: emailLayout(
      "A Working With Children Check is about to expire",
      `<p>${e(p.teacherName)}'s check (${e(p.number)}) expires on <strong>${date}</strong>. Once it does, they can't teach kids' classes at ${e(p.studioName)} on StepUp until a renewed check is verified on the Team tab.</p>`,
      { label: "Open the Team tab", url: appUrl("/studio/team") },
    ),
    text: `${p.teacherName}'s Working With Children Check (${p.number}) expires on ${date}. Renew it and verify it on the Team tab: ${appUrl("/studio/team")}`,
  });
}

export async function sendCourseOpen(p: {
  to: string;
  studioName: string;
  courseTitle: string;
  startsOn: Date;
  timezone: string;
  url: string;
  unsubscribeUrl: string;
}) {
  const when = formatClassWhenLong(p.startsOn, p.timezone);
  return sendEmail({
    to: p.to,
    unsubscribeUrl: p.unsubscribeUrl,
    subject: `Enrolments open: ${p.courseTitle}`,
    html: emailLayout(
      `${e(p.courseTitle)} is open`,
      `<p>You asked ${e(p.studioName)} to tell you when its next course opened. Enrolments for <strong>${e(p.courseTitle)}</strong> are open now. It starts ${when}.</p>
       <p style="font-size:12px;color:#8b8e9c"><a href="${p.unsubscribeUrl}">Stop updates from ${e(p.studioName)}</a>.</p>`,
      { label: "Enrol", url: p.url },
    ),
    text: `Enrolments are open for ${p.courseTitle} at ${p.studioName}. It starts ${when}.\n${p.url}\n\nStop updates: ${p.unsubscribeUrl}`,
  });
}
