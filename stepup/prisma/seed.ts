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
  // Studio admin tools (flow v6.4).
  await db.textCommand.deleteMany();
  await db.classMessage.deleteMany();
  await db.walkIn.deleteMany();
  await db.passOfferRecipient.deleteMany();
  await db.passOffer.deleteMany();
  await db.studioPass.deleteMany();
  await db.studioOptOut.deleteMany();
  await db.studioCredit.deleteMany();
  await db.termsAcceptance.deleteMany();
  await db.studioTerms.deleteMany();
  await db.document.deleteMany();
  await db.courseInterest.deleteMany();
  await db.payment.deleteMany();
  await db.userBadge.deleteMany();
  await db.booking.deleteMany();
  await db.enrolment.deleteMany();
  await db.gamificationProfile.deleteMany();
  await db.danceClass.deleteMany();
  await db.classSeries.deleteMany();
  await db.studioMember.deleteMany();
  await db.studioPhoto.deleteMany();
  await db.venue.deleteMany();
  await db.levelName.deleteMany();
  await db.classTemplate.deleteMany();
  await db.studio.deleteMany();
  await db.image.deleteMany();
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
        // Demo dancers are on the leaderboard so it has something to show.
        // Real accounts start opted out — see the User model.
        leaderboardOptIn: true,
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
      suburb: "Surry Hills",
      styles: ["Hip Hop", "Heels", "Salsa"],
      arrive: "Green door between the bakery and the bottle shop. Up one flight.",
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
      suburb: "Newtown",
      styles: ["Salsa", "Bachata"],
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
      styles: ["Ballet", "Contemporary", "Jazz"],
      timezone: MEL,
      emoji: "🩰",
      ownerId: elena.id,
    },
  });

  // Each studio's account holder is the first on its team, as sign-up does.
  for (const [studio, owner] of [
    [rhythmRoom, maria],
    [salsaCasa, diego],
    [barreBeyond, elena],
  ] as const) {
    await db.studioMember.create({
      data: {
        studioId: studio.id,
        userId: owner.id,
        name: owner.name,
        contact: owner.email,
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });
  }

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
          description: `${u.style}, ${u.fmt === "ONLINE" ? "live online" : "in the studio"}.`,
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


  // ── Salsa Casa runs the full studio toolkit (flow v6.4) ───────────────────
  // A partner class with per-role caps and a follows waitlist, a free trial,
  // a course opening soon, past classes with attendance, no-shows and a
  // walk-in, terms students have accepted, a pass, a saved venue, mapped
  // levels, a template, a teacher with a verified Working With Children
  // Check, and this month's bookings on the statement.
  await db.studio.update({
    where: { id: salsaCasa.id },
    data: {
      cancelPolicy: "STANDARD",
      payoutDay: "THU",
      description: "Latin dance studio in Newtown. Salsa and bachata for people who've never danced, taught by people who remember what that's like.",
      profileApprovedAt: new Date(),
      healthFormUrl: "https://example.com/salsa-casa-health-form",
    },
  });
  const maya = await mkUser("maya@salsacasa.dance", "Maya Torres", "INSTRUCTOR", {
    homeCity: "Sydney",
    timezone: SYD,
    phone: "0412000111",
    avatarColor: "#E0479E",
  });
  const mayaMember = await db.studioMember.create({
    data: {
      studioId: salsaCasa.id,
      userId: maya.id,
      name: "Maya Torres",
      contact: maya.email,
      role: "TEACHER",
      status: "ACTIVE",
      joinedAt: new Date(),
      wwccNumber: "WWC1234567E",
      wwccExpiry: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000),
      wwccVerifiedAt: new Date(),
      wwccVerifiedById: diego.id,
    },
  });
  await db.studioMember.create({
    data: {
      studioId: salsaCasa.id,
      name: "Tom Reyes",
      contact: "0412000222",
      role: "MANAGER",
      status: "INVITED",
      inviteCode: "SALSA-DEMO-7Q",
      inviteExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  });
  const hall = await db.venue.create({
    data: { studioId: salsaCasa.id, name: "Newtown Hall", address: "1 Bedford St, Newtown", suburb: "Newtown" },
  });
  await db.levelName.createMany({
    data: [
      { studioId: salsaCasa.id, name: "Level 1", scale: "ABSOLUTE_BEGINNER" },
      { studioId: salsaCasa.id, name: "Level 2", scale: "IMPROVER" },
    ],
  });
  await db.classTemplate.create({
    data: {
      studioId: salsaCasa.id,
      style: "Salsa",
      scale: "BEGINNER",
      description: "Salsa On1 for beginners. The basic, a right turn and how to lead or follow it, slowly, then to music.",
      wear: "Anything comfy. Shoes that turn, or socks.",
      plan: "0–15 min: the basic on your own. 15–40 min: one turn with a partner. 40–60 min: put it to music.",
    },
  });
  const terms = await db.studioTerms.create({
    data: { studioId: salsaCasa.id, version: 1, mode: "TEMPLATE", publishedAt: at(-30, "10:00") },
  });
  const pass = await db.studioPass.create({
    data: { studioId: salsaCasa.id, name: "10-class pass", priceCents: 18000 },
  });

  // More dancers, booked as guests would be: name, email, mobile.
  const guestNames = ["Lena Park", "Omar Said", "Ruby Chen", "Tom Hale", "Ivy Moss", "Ben Cole", "Zara Ali", "Kai Wong", "Nina Ross", "Leo Grant"];
  const guests = [];
  for (const [i, name] of guestNames.entries()) {
    guests.push(
      await db.user.create({
        data: {
          email: `${name.split(" ")[0].toLowerCase()}@guest.stepup.dance`,
          name,
          role: "STUDENT",
          timezone: SYD,
          phone: `04120003${String(i).padStart(2, "0")}`,
          profile: { create: {} },
        },
      }),
    );
  }

  const casaClass = (data: Record<string, unknown>) =>
    db.danceClass.create({
      data: {
        style: "Salsa",
        format: "IN_PERSON",
        level: "BEGINNER",
        timezone: SYD,
        durationMin: 60,
        capacity: 20,
        stepupSpots: 8,
        points: 25,
        hostId: diego.id,
        studioId: salsaCasa.id,
        teacherMemberId: mayaMember.id,
        location: "88 Rhythm Ave, Newtown",
        suburb: "Newtown",
        music: "latin",
        description: "Salsa On1 for beginners. The basic, a right turn and how to lead or follow it.",
        ...data,
      } as never,
    });

  // Partner class tomorrow: 4 leads, 6/6 follows, two follows waiting.
  const partner = await casaClass({
    title: "Bachata Partnerwork",
    style: "Bachata",
    startTime: at(1, "19:30"),
    capacity: 16,
    stepupSpots: 12,
    partner: "ROTATE",
    partnerRule: "CAPS",
    leadCap: 6,
    followCap: 6,
  });
  const roles = ["LEAD", "LEAD", "LEAD", "LEAD", "FOLLOW", "FOLLOW", "FOLLOW", "FOLLOW", "FOLLOW", "FOLLOW"];
  for (const [i, role] of roles.entries()) {
    await db.booking.create({
      data: { userId: guests[i].id, classId: partner.id, role, note: i === 0 ? "First time ever, coming with Omar" : null },
    });
  }
  await db.booking.createMany({
    data: [
      { userId: alex.id, classId: partner.id, role: "FOLLOW", status: "WAITLISTED", waitlistPosition: 1 },
      { userId: jordan.id, classId: partner.id, role: "FOLLOW", status: "WAITLISTED", waitlistPosition: 2 },
    ],
  });
  await db.classMessage.create({
    data: { classId: partner.id, senderId: diego.id, body: "Heads up: we're in Studio B tonight.", recipients: 10, channels: "EMAIL" },
  });

  // A free trial and a paid drop-in this week.
  await casaClass({ title: "Free Salsa Trial", startTime: at(3, "18:30"), listing: "TRIAL", level: "ABSOLUTE_BEGINNER" });
  const dropIn = await casaClass({ title: "Salsa Foundations", startTime: at(4, "19:00"), priceCents: 2500, venueId: hall.id, location: "1 Bedford St, Newtown" });

  // An 8-week course that opens in 10 days.
  const courseStart = at(10, "19:00");
  const course = await db.classSeries.create({
    data: {
      title: "Salsa Beginners Course",
      style: "Salsa",
      description: "Eight weeks from your first basic to dancing a full song socially.",
      format: "IN_PERSON",
      level: "BEGINNER",
      location: "88 Rhythm Ave, Newtown",
      suburb: "Newtown",
      timezone: SYD,
      durationMin: 60,
      capacity: 20,
      stepupSpots: 10,
      priceCents: 0,
      listing: "COURSE",
      music: "latin",
      partner: "ROTATE",
      hostId: diego.id,
      studioId: salsaCasa.id,
      teacherMemberId: mayaMember.id,
      dayOfWeek: courseStart.getUTCDay(),
      localTime: "19:00",
      frequency: "WEEKLY",
      startsOn: courseStart,
      endsOn: at(10 + 7 * 7, "19:00"),
      courseWeeks: 8,
      coursePriceCents: 16000,
    } as never,
  });
  for (let w = 0; w < 8; w++) {
    await casaClass({
      title: "Salsa Beginners Course",
      startTime: at(10 + 7 * w, "19:00"),
      listing: "COURSE",
      seriesId: course.id,
      capacity: 20,
      stepupSpots: 10,
    });
  }

  // Two past classes with attendance, a no-show and a walk-in, and the
  // payments that show on this month's statement.
  for (const [k, d] of [-14, -7].entries()) {
    const c = await casaClass({ title: "Salsa Foundations", startTime: at(d, "19:00"), priceCents: 2500 });
    for (let i = 0; i < 6; i++) {
      const g = guests[(i + k * 2) % guests.length];
      const noShow = k === 1 && i === 5;
      const b = await db.booking.create({ data: { userId: g.id, classId: c.id } });
      if (noShow) {
        await db.booking.update({ where: { id: b.id }, data: { status: "NO_SHOW", noShowAt: at(d, "20:00") } });
      } else {
        await recordAttendance(b.id, at(d, "19:05"));
      }
      await db.payment.create({
        data: { bookingId: b.id, status: "PAID", amountCents: 2500, feeCents: 250, paidAt: at(d - 2, "12:00") },
      });
      await db.termsAcceptance.create({
        data: { userId: g.id, studioId: salsaCasa.id, termsId: terms.id, version: 1, acceptedAt: at(d - 2, "12:00") },
      }).catch(() => {});
    }
    if (k === 1) await db.walkIn.create({ data: { classId: c.id, name: "Sofia (door)", role: null } });
  }
  // One refund this month.
  const refunded = await db.booking.create({
    data: { userId: guests[9].id, classId: dropIn.id, status: "CANCELLED", cancelledAt: at(-1, "09:00") },
  });
  await db.payment.create({
    data: { bookingId: refunded.id, status: "REFUNDED", amountCents: 2500, feeCents: 250, paidAt: at(-3, "12:00"), refundedAt: at(-1, "09:00") },
  });
  await db.passOffer.create({
    data: { studioId: salsaCasa.id, passId: pass.id, message: "Thanks for dancing with us! Our 10-class pass is $180.", audience: "FIRST", recipients: 3, createdAt: at(-5, "10:00") },
  });

  console.log(`
Seed complete.

  Password for every demo account: DemoPassw0rd!

  Admin        admin@stepup.dance
  Studios      maria@rhythmroom.dance, diego@salsacasa.dance, elena@barrebeyond.dance
  Instructors  jay@stepup.dance, noor@stepup.dance, maya@salsacasa.dance (teaches at Salsa Casa)
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
