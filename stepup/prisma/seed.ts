/**
 * Development seed. Populates demo studios, instructors, students and classes.
 *
 * Refuses to run against a database that already holds real-looking data
 * unless SEED_FORCE=1 — dropping every table is fine locally and catastrophic
 * in production. Use `npx tsx prisma/reset-demo-data.ts` to clear demo rows
 * from a deployed database instead.
 */
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { BADGE_CATALOG, recordAttendance } from "../src/lib/gamification";
import { zonedDateTimeToUtc, addDaysToDateString } from "../src/lib/time";

const SYD = "Australia/Sydney";
const MEL = "Australia/Melbourne";

const today = new Date().toISOString().slice(0, 10);
const dayOffset = (n: number) => addDaysToDateString(today, n);

/** Local wall-clock time in a zone → UTC instant. */
const at = (offsetDays: number, time: string, tz = SYD) =>
  zonedDateTimeToUtc(dayOffset(offsetDays), time, tz);

async function assertSafeToSeed() {
  if (process.env.SEED_FORCE === "1") return;

  const [users, payments] = await Promise.all([
    db.user.count(),
    db.payment.count({ where: { status: "PAID" } }),
  ]);

  const demoUsers = await db.user.count({
    where: { email: { endsWith: "@stepup.dance" } },
  });

  const looksReal = payments > 0 || (users > 0 && demoUsers === 0);
  if (looksReal) {
    throw new Error(
      `Refusing to seed: found ${users} users and ${payments} completed payments ` +
        `that don't look like demo data. This script deletes everything.\n` +
        `Set SEED_FORCE=1 only if you are certain this database is disposable.`
    );
  }
}

async function main() {
  await assertSafeToSeed();
  console.log("Seeding StepUp…");

  // Order matters: children before parents.
  await db.auditLog.deleteMany();
  await db.processedWebhookEvent.deleteMany();
  await db.payment.deleteMany();
  await db.userBadge.deleteMany();
  await db.booking.deleteMany();
  await db.gamificationProfile.deleteMany();
  await db.danceClass.deleteMany();
  await db.classSeries.deleteMany();
  await db.studio.deleteMany();
  await db.payoutAccount.deleteMany();
  await db.authToken.deleteMany();
  await db.loginAttempt.deleteMany();
  await db.badge.deleteMany();
  await db.user.deleteMany();

  await db.badge.createMany({ data: [...BADGE_CATALOG] });

  const password = await bcrypt.hash("DemoPassw0rd!", 12);
  const verified = new Date();

  const mkUser = (
    email: string,
    name: string,
    role: string,
    extra: Record<string, unknown> = {}
  ) =>
    db.user.create({
      data: {
        email,
        name,
        role,
        passwordHash: password,
        emailVerifiedAt: verified,
        acceptedTermsAt: verified,
        ...extra,
      },
    });

  // ── Hosts ────────────────────────────────────────────────────────────────
  const maria = await mkUser("maria@rhythmroom.dance", "Maria Chen", "STUDIO_OWNER", {
    homeCity: "Sydney",
    timezone: SYD,
    avatarEmoji: "💃",
    avatarColor: "#FC5200",
  });
  const diego = await mkUser("diego@salsacasa.dance", "Diego Alvarez", "STUDIO_OWNER", {
    homeCity: "Sydney",
    timezone: SYD,
    avatarEmoji: "🕺",
    avatarColor: "#E0479E",
  });
  const elena = await mkUser("elena@barrebeyond.dance", "Elena Kaur", "STUDIO_OWNER", {
    homeCity: "Melbourne",
    timezone: MEL,
    avatarEmoji: "🩰",
    avatarColor: "#7C5CFC",
  });

  const jay = await mkUser("jay@stepup.dance", "Jay Okafor", "INSTRUCTOR", {
    homeCity: "Online",
    timezone: SYD,
    displayName: "Jay Okafor Dance",
    bio: "Independent hip hop instructor streaming live sessions worldwide.",
    avatarEmoji: "🎤",
    avatarColor: "#1E90FF",
  });
  const noor = await mkUser("noor@stepup.dance", "Noor Haddad", "INSTRUCTOR", {
    homeCity: "Online",
    timezone: MEL,
    displayName: "Noor Haddad Movement",
    bio: "Contemporary & flow specialist teaching from her home studio.",
    avatarEmoji: "🌊",
    avatarColor: "#12B886",
  });

  const admin = await mkUser("admin@stepup.dance", "Platform Admin", "ADMIN", {
    timezone: SYD,
    avatarEmoji: "🛡️",
    avatarColor: "#495057",
  });

  // ── Students ─────────────────────────────────────────────────────────────
  const students = await Promise.all(
    [
      ["alex@stepup.dance", "Alex Rivera", "Sydney", SYD, "⚡", "#FC5200"],
      ["sam@stepup.dance", "Sam Park", "Sydney", SYD, "🌟", "#F59F00"],
      ["priya@stepup.dance", "Priya Nair", "Melbourne", MEL, "🎀", "#E64980"],
      ["chris@stepup.dance", "Chris Taylor", "Sydney", SYD, "🆕", "#495057"],
      ["jordan@stepup.dance", "Jordan Blake", "Melbourne", MEL, "🔥", "#F03E3E"],
    ].map(([email, name, city, tz, emoji, color]) =>
      mkUser(email, name, "STUDENT", {
        homeCity: city,
        timezone: tz,
        avatarEmoji: emoji,
        avatarColor: color,
        profile: { create: {} },
      })
    )
  );
  const [alex, sam, priya, , jordan] = students;

  // ── Studios ──────────────────────────────────────────────────────────────
  const rhythmRoom = await db.studio.create({
    data: {
      name: "Rhythm Room",
      description: "Sydney's home for hip hop, heels & street styles.",
      city: "Sydney",
      address: "12 Beat St, Surry Hills",
      timezone: SYD,
      emoji: "🏙️",
      ownerId: maria.id,
    },
  });
  const salsaCasa = await db.studio.create({
    data: {
      name: "Salsa Casa",
      description: "Latin dance studio specialising in salsa & bachata.",
      city: "Sydney",
      address: "88 Rhythm Ave, Newtown",
      timezone: SYD,
      emoji: "🌶️",
      ownerId: diego.id,
    },
  });
  const barreBeyond = await db.studio.create({
    data: {
      name: "Barre & Beyond",
      description: "Ballet, contemporary and jazz for all levels.",
      city: "Melbourne",
      address: "5 Grand Jete Ln, Fitzroy",
      timezone: MEL,
      emoji: "🩰",
      ownerId: elena.id,
    },
  });

  // ── Past classes (attendance history for the gamification demo) ──────────
  const past = [
    { title: "Hip Hop Jam", style: "Hip Hop", d: -35, t: "18:00", tz: SYD, host: maria, studio: rhythmRoom, pts: 25, fmt: "IN_PERSON" },
    { title: "Sunrise Contemporary", style: "Contemporary", d: -28, t: "07:00", tz: MEL, host: elena, studio: barreBeyond, pts: 30, fmt: "IN_PERSON" },
    { title: "Salsa Night", style: "Salsa", d: -21, t: "21:00", tz: SYD, host: diego, studio: salsaCasa, pts: 25, fmt: "IN_PERSON" },
    { title: "Contemporary Flow", style: "Flow", d: -14, t: "19:00", tz: MEL, host: noor, studio: null, pts: 20, fmt: "ONLINE" },
    { title: "Jazz Funk Jam", style: "Jazz", d: -7, t: "18:00", tz: MEL, host: elena, studio: barreBeyond, pts: 25, fmt: "IN_PERSON" },
    { title: "Heels Choreo Throwback", style: "Heels", d: -1, t: "18:00", tz: SYD, host: maria, studio: rhythmRoom, pts: 20, fmt: "IN_PERSON" },
    { title: "Ballet Basics", style: "Ballet", d: -3, t: "17:00", tz: MEL, host: elena, studio: barreBeyond, pts: 20, fmt: "IN_PERSON" },
  ];

  const pastClasses = await Promise.all(
    past.map((p) =>
      db.danceClass.create({
        data: {
          title: p.title,
          style: p.style,
          description: `${p.style} class.`,
          format: p.fmt,
          level: "ALL_LEVELS",
          timezone: p.tz,
          startTime: at(p.d, p.t, p.tz),
          durationMin: 60,
          points: p.pts,
          hostId: p.host.id,
          studioId: p.studio?.id ?? null,
          onlineLink: p.fmt === "ONLINE" ? "https://meet.stepup.dance/demo" : null,
        },
      })
    )
  );
  const [pa1, pa2, pa3, pa4, pa5, pa6, pa7] = pastClasses;

  async function attend(userId: string, classId: string, when: Date) {
    const booking = await db.booking.create({ data: { userId, classId } });
    return recordAttendance(booking.id, when);
  }

  // Alex: six consecutive weeks across five styles and three studios.
  await attend(alex.id, pa1.id, at(-35, "19:00"));
  await attend(alex.id, pa2.id, at(-28, "08:00", MEL));
  await attend(alex.id, pa3.id, at(-21, "22:00"));
  await attend(alex.id, pa4.id, at(-14, "20:00", MEL));
  await attend(alex.id, pa5.id, at(-7, "19:00", MEL));
  await attend(alex.id, pa6.id, at(-1, "19:00"));

  // Jordan: three-week streak.
  await attend(jordan.id, pa3.id, at(-21, "22:00"));
  await attend(jordan.id, pa4.id, at(-14, "20:00", MEL));
  await attend(jordan.id, pa5.id, at(-7, "19:00", MEL));

  // Sam: two classes.
  await attend(sam.id, pa4.id, at(-14, "20:00", MEL));
  await attend(sam.id, pa5.id, at(-7, "19:00", MEL));

  // Priya: a single class (first-timer badge only).
  await attend(priya.id, pa7.id, at(-3, "18:00", MEL));

  // Chris: brand new, no history — exercises the empty states.

  // ── Upcoming classes ─────────────────────────────────────────────────────
  const upcoming = [
    { title: "Hip Hop Foundations", style: "Hip Hop", d: 1, t: "18:00", tz: SYD, host: maria, studio: rhythmRoom, cap: 15, pts: 25, fmt: "IN_PERSON", price: 2500 },
    { title: "Salsa Social", style: "Salsa", d: 2, t: "19:00", tz: SYD, host: diego, studio: salsaCasa, cap: 20, pts: 25, fmt: "IN_PERSON", price: 0 },
    { title: "Contemporary Flow", style: "Contemporary", d: 3, t: "18:30", tz: MEL, host: noor, studio: null, cap: 20, pts: 20, fmt: "ONLINE", price: 0 },
    { title: "Hip Hop Live", style: "Hip Hop", d: 4, t: "20:00", tz: SYD, host: jay, studio: null, cap: 30, pts: 20, fmt: "ONLINE", price: 0 },
    { title: "Ballet Barre", style: "Ballet", d: 5, t: "09:00", tz: MEL, host: elena, studio: barreBeyond, cap: 20, pts: 25, fmt: "IN_PERSON", price: 0 },
    { title: "Heels Choreo", style: "Heels", d: 6, t: "19:00", tz: SYD, host: maria, studio: rhythmRoom, cap: 20, pts: 30, fmt: "IN_PERSON", price: 0 },
    { title: "Bachata Basics", style: "Bachata", d: 8, t: "18:00", tz: SYD, host: diego, studio: salsaCasa, cap: 20, pts: 25, fmt: "IN_PERSON", price: 0 },
    { title: "Jazz Funk", style: "Jazz", d: 9, t: "19:30", tz: MEL, host: elena, studio: barreBeyond, cap: 20, pts: 25, fmt: "IN_PERSON", price: 0 },
    { title: "Afrobeats Online", style: "Afrobeats", d: 10, t: "19:00", tz: SYD, host: jay, studio: null, cap: 40, pts: 20, fmt: "ONLINE", price: 0 },
    { title: "Flow & Stretch", style: "Flow", d: 12, t: "18:00", tz: MEL, host: noor, studio: null, cap: 25, pts: 20, fmt: "ONLINE", price: 0 },
  ];

  const created = await Promise.all(
    upcoming.map((u) =>
      db.danceClass.create({
        data: {
          title: u.title,
          style: u.style,
          description: `${u.style} — ${u.fmt === "ONLINE" ? "live online" : "in the studio"}.`,
          format: u.fmt,
          level: "ALL_LEVELS",
          timezone: u.tz,
          startTime: at(u.d, u.t, u.tz),
          durationMin: 60,
          capacity: u.cap,
          points: u.pts,
          // Priced classes need a connected Stripe account, which demo hosts
          // don't have — so seed them free and leave one priced for the UI.
          priceCents: u.price,
          hostId: u.host.id,
          studioId: u.studio?.id ?? null,
          onlineLink: u.fmt === "ONLINE" ? "https://meet.stepup.dance/demo" : null,
        },
      })
    )
  );

  await db.booking.createMany({
    data: [
      { userId: alex.id, classId: created[1].id },
      { userId: alex.id, classId: created[5].id },
      { userId: alex.id, classId: created[8].id },
      { userId: sam.id, classId: created[1].id },
      { userId: priya.id, classId: created[4].id },
    ],
  });

  console.log(`
Seed complete.

  Password for every demo account: DemoPassw0rd!

  Admin        admin@stepup.dance
  Studios      maria@rhythmroom.dance, diego@salsacasa.dance, elena@barrebeyond.dance
  Instructors  jay@stepup.dance, noor@stepup.dance
  Dancers      alex@stepup.dance (rich history), sam@, priya@, chris@ (new), jordan@
  Admin id     ${admin.id}
`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
