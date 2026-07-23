import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { BADGE_CATALOG, recordAttendance } from "../src/lib/gamification";

const now = new Date();

function daysAgo(n: number, hour: number, minute = 0) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysFromNow(n: number, hour: number, minute = 0) {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("Seeding StepUp...");

  // Reset (idempotent local dev seed)
  await db.userBadge.deleteMany();
  await db.booking.deleteMany();
  await db.gamificationProfile.deleteMany();
  await db.danceClass.deleteMany();
  await db.studio.deleteMany();
  await db.badge.deleteMany();
  await db.user.deleteMany();

  for (const b of BADGE_CATALOG) {
    await db.badge.create({ data: b });
  }

  const demoPassword = await hash("password123");

  const maria = await db.user.create({
    data: {
      email: "maria@rhythmroom.dance",
      passwordHash: demoPassword,
      name: "Maria Chen",
      role: "STUDIO_OWNER",
      homeCity: "Sydney",
      avatarEmoji: "💃",
      avatarColor: "#FC5200",
    },
  });
  const diego = await db.user.create({
    data: {
      email: "diego@salsacasa.dance",
      passwordHash: demoPassword,
      name: "Diego Alvarez",
      role: "STUDIO_OWNER",
      homeCity: "Sydney",
      avatarEmoji: "🕺",
      avatarColor: "#E0479E",
    },
  });
  const elena = await db.user.create({
    data: {
      email: "elena@barrebeyond.dance",
      passwordHash: demoPassword,
      name: "Elena Kaur",
      role: "STUDIO_OWNER",
      homeCity: "Melbourne",
      avatarEmoji: "🩰",
      avatarColor: "#7C5CFC",
    },
  });

  const jay = await db.user.create({
    data: {
      email: "jay@stepup.dance",
      passwordHash: demoPassword,
      name: "Jay Okafor",
      role: "INSTRUCTOR",
      homeCity: "Online",
      bio: "Independent hip hop instructor streaming live sessions worldwide.",
      avatarEmoji: "🎤",
      avatarColor: "#1E90FF",
    },
  });
  const noor = await db.user.create({
    data: {
      email: "noor@stepup.dance",
      passwordHash: demoPassword,
      name: "Noor Haddad",
      role: "INSTRUCTOR",
      homeCity: "Online",
      bio: "Contemporary & flow specialist teaching from her home studio.",
      avatarEmoji: "🌊",
      avatarColor: "#12B886",
    },
  });

  const alex = await db.user.create({
    data: {
      email: "alex@stepup.dance",
      passwordHash: demoPassword,
      name: "Alex Rivera",
      role: "STUDENT",
      homeCity: "Sydney",
      avatarEmoji: "⚡",
      avatarColor: "#FC5200",
    },
  });
  const sam = await db.user.create({
    data: {
      email: "sam@stepup.dance",
      passwordHash: demoPassword,
      name: "Sam Park",
      role: "STUDENT",
      homeCity: "Sydney",
      avatarEmoji: "🌟",
      avatarColor: "#F59F00",
    },
  });
  const priya = await db.user.create({
    data: {
      email: "priya@stepup.dance",
      passwordHash: demoPassword,
      name: "Priya Nair",
      role: "STUDENT",
      homeCity: "Melbourne",
      avatarEmoji: "🎀",
      avatarColor: "#E64980",
    },
  });
  const chris = await db.user.create({
    data: {
      email: "chris@stepup.dance",
      passwordHash: demoPassword,
      name: "Chris Taylor",
      role: "STUDENT",
      homeCity: "Sydney",
      avatarEmoji: "🆕",
      avatarColor: "#495057",
    },
  });
  const jordan = await db.user.create({
    data: {
      email: "jordan@stepup.dance",
      passwordHash: demoPassword,
      name: "Jordan Blake",
      role: "STUDENT",
      homeCity: "Melbourne",
      avatarEmoji: "🔥",
      avatarColor: "#F03E3E",
    },
  });

  for (const student of [alex, sam, priya, chris, jordan]) {
    await db.gamificationProfile.create({ data: { userId: student.id } });
  }

  const rhythmRoom = await db.studio.create({
    data: {
      name: "Rhythm Room",
      description: "Sydney's home for hip hop, heels & street styles.",
      city: "Sydney",
      address: "12 Beat St, Surry Hills",
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
      emoji: "🩰",
      ownerId: elena.id,
    },
  });

  // Past classes, used to seed attendance history / gamification demo data
  const pa1 = await db.danceClass.create({
    data: {
      title: "Hip Hop Jam",
      style: "Hip Hop",
      description: "High-energy hip hop choreo for all levels.",
      format: "IN_PERSON",
      level: "ALL_LEVELS",
      startTime: daysAgo(35, 18),
      durationMin: 60,
      points: 25,
      hostId: maria.id,
      studioId: rhythmRoom.id,
    },
  });
  const pa2 = await db.danceClass.create({
    data: {
      title: "Sunrise Contemporary",
      style: "Contemporary",
      description: "Start the day with slow, controlled contemporary flow.",
      format: "IN_PERSON",
      level: "INTERMEDIATE",
      startTime: daysAgo(28, 7),
      durationMin: 60,
      points: 30,
      hostId: elena.id,
      studioId: barreBeyond.id,
    },
  });
  const pa3 = await db.danceClass.create({
    data: {
      title: "Salsa Night",
      style: "Salsa",
      description: "Social salsa footwork and partner turns.",
      format: "IN_PERSON",
      level: "ALL_LEVELS",
      startTime: daysAgo(21, 21),
      durationMin: 75,
      points: 25,
      hostId: diego.id,
      studioId: salsaCasa.id,
    },
  });
  const pa4 = await db.danceClass.create({
    data: {
      title: "Contemporary Flow",
      style: "Flow",
      description: "Live-streamed flow & release technique class.",
      format: "ONLINE",
      level: "INTERMEDIATE",
      onlineLink: "https://meet.stepup.dance/noor-flow",
      startTime: daysAgo(14, 19),
      durationMin: 45,
      points: 20,
      hostId: noor.id,
    },
  });
  const pa5 = await db.danceClass.create({
    data: {
      title: "Jazz Funk Jam",
      style: "Jazz",
      description: "Sharp, punchy jazz funk choreography.",
      format: "IN_PERSON",
      level: "INTERMEDIATE",
      startTime: daysAgo(7, 18),
      durationMin: 60,
      points: 25,
      hostId: elena.id,
      studioId: barreBeyond.id,
    },
  });
  const pa6 = await db.danceClass.create({
    data: {
      title: "Heels Choreo Throwback",
      style: "Heels",
      description: "Confidence-building heels choreography.",
      format: "IN_PERSON",
      level: "ADVANCED",
      startTime: daysAgo(1, 18),
      durationMin: 60,
      points: 20,
      hostId: maria.id,
      studioId: rhythmRoom.id,
    },
  });
  const pa7 = await db.danceClass.create({
    data: {
      title: "Ballet Basics",
      style: "Ballet",
      description: "Foundational barre & centre work.",
      format: "IN_PERSON",
      level: "BEGINNER",
      startTime: daysAgo(3, 17),
      durationMin: 60,
      points: 20,
      hostId: elena.id,
      studioId: barreBeyond.id,
    },
  });

  async function bookAndAttend(userId: string, classId: string, at: Date) {
    const booking = await db.booking.create({ data: { userId, classId } });
    return recordAttendance(booking.id, at);
  }

  // Alex: 6-week attendance streak across 5 studios/styles -> unlocks most badges
  await bookAndAttend(alex.id, pa1.id, daysAgo(35, 18));
  await bookAndAttend(alex.id, pa2.id, daysAgo(28, 7));
  await bookAndAttend(alex.id, pa3.id, daysAgo(21, 21));
  await bookAndAttend(alex.id, pa4.id, daysAgo(14, 19));
  await bookAndAttend(alex.id, pa5.id, daysAgo(7, 18));
  await bookAndAttend(alex.id, pa6.id, daysAgo(1, 18));

  // Jordan: 3-week streak -> "On a Roll"
  await bookAndAttend(jordan.id, pa3.id, daysAgo(21, 21));
  await bookAndAttend(jordan.id, pa4.id, daysAgo(14, 19));
  await bookAndAttend(jordan.id, pa5.id, daysAgo(7, 18));

  // Sam: 2 classes, one week apart
  await bookAndAttend(sam.id, pa4.id, daysAgo(14, 19));
  await bookAndAttend(sam.id, pa5.id, daysAgo(7, 18));

  // Priya: single class, first-timer badge only
  await bookAndAttend(priya.id, pa7.id, daysAgo(3, 17));

  // Chris: brand new account, no history yet (tests empty states)

  // Upcoming classes across studios + independent instructors
  const u1 = await db.danceClass.create({
    data: {
      title: "Hip Hop Foundations",
      style: "Hip Hop",
      description: "Learn the fundamentals of groove, bounce and isolations.",
      format: "IN_PERSON",
      level: "BEGINNER",
      capacity: 15,
      startTime: daysFromNow(1, 18),
      durationMin: 60,
      points: 25,
      hostId: maria.id,
      studioId: rhythmRoom.id,
    },
  });
  const u2 = await db.danceClass.create({
    data: {
      title: "Salsa Social",
      style: "Salsa",
      description: "Partner work, turn patterns and social floorcraft.",
      format: "IN_PERSON",
      level: "ALL_LEVELS",
      startTime: daysFromNow(2, 19),
      durationMin: 75,
      points: 25,
      hostId: diego.id,
      studioId: salsaCasa.id,
    },
  });
  await db.danceClass.create({
    data: {
      title: "Contemporary Flow",
      style: "Contemporary",
      description: "Live-streamed flow & release technique class.",
      format: "ONLINE",
      level: "INTERMEDIATE",
      onlineLink: "https://meet.stepup.dance/noor-flow",
      startTime: daysFromNow(3, 18, 30),
      durationMin: 45,
      points: 20,
      hostId: noor.id,
    },
  });
  await db.danceClass.create({
    data: {
      title: "Hip Hop Live",
      style: "Hip Hop",
      description: "Jay's signature live-streamed choreo drop.",
      format: "ONLINE",
      level: "ALL_LEVELS",
      onlineLink: "https://meet.stepup.dance/jay-hiphop",
      startTime: daysFromNow(4, 20),
      durationMin: 60,
      points: 20,
      hostId: jay.id,
    },
  });
  const u5 = await db.danceClass.create({
    data: {
      title: "Ballet Barre",
      style: "Ballet",
      description: "Classical barre work for strength and posture.",
      format: "IN_PERSON",
      level: "BEGINNER",
      startTime: daysFromNow(5, 9),
      durationMin: 60,
      points: 25,
      hostId: elena.id,
      studioId: barreBeyond.id,
    },
  });
  const u6 = await db.danceClass.create({
    data: {
      title: "Heels Choreo",
      style: "Heels",
      description: "Advanced heels choreography and performance quality.",
      format: "IN_PERSON",
      level: "ADVANCED",
      startTime: daysFromNow(6, 19),
      durationMin: 60,
      points: 30,
      hostId: maria.id,
      studioId: rhythmRoom.id,
    },
  });
  await db.danceClass.create({
    data: {
      title: "Bachata Basics",
      style: "Bachata",
      description: "Smooth hip motion and sensual bachata footwork.",
      format: "IN_PERSON",
      level: "BEGINNER",
      startTime: daysFromNow(8, 18),
      durationMin: 60,
      points: 25,
      hostId: diego.id,
      studioId: salsaCasa.id,
    },
  });
  await db.danceClass.create({
    data: {
      title: "Jazz Funk",
      style: "Jazz",
      description: "Sharp, punchy jazz funk choreography.",
      format: "IN_PERSON",
      level: "INTERMEDIATE",
      startTime: daysFromNow(9, 19, 30),
      durationMin: 60,
      points: 25,
      hostId: elena.id,
      studioId: barreBeyond.id,
    },
  });
  const u9 = await db.danceClass.create({
    data: {
      title: "Afrobeats Online",
      style: "Afrobeats",
      description: "High-energy afrobeats grooves from Jay, live online.",
      format: "ONLINE",
      level: "ALL_LEVELS",
      onlineLink: "https://meet.stepup.dance/jay-afrobeats",
      startTime: daysFromNow(10, 19),
      durationMin: 60,
      points: 20,
      hostId: jay.id,
    },
  });
  await db.danceClass.create({
    data: {
      title: "Flow & Stretch",
      style: "Flow",
      description: "Wind down with mobility, flow and deep stretch.",
      format: "ONLINE",
      level: "ALL_LEVELS",
      onlineLink: "https://meet.stepup.dance/noor-stretch",
      startTime: daysFromNow(12, 18),
      durationMin: 45,
      points: 20,
      hostId: noor.id,
    },
  });

  await db.booking.create({ data: { userId: alex.id, classId: u1.id } });
  await db.booking.create({ data: { userId: alex.id, classId: u6.id } });
  await db.booking.create({ data: { userId: alex.id, classId: u9.id } });
  await db.booking.create({ data: { userId: sam.id, classId: u2.id } });
  await db.booking.create({ data: { userId: priya.id, classId: u5.id } });

  console.log("Seed complete.");
  console.log("Demo login password for every account: password123");
  console.log(
    "Accounts: maria@rhythmroom.dance, diego@salsacasa.dance, elena@barrebeyond.dance (studio owners)"
  );
  console.log("          jay@stepup.dance, noor@stepup.dance (independent instructors)");
  console.log(
    "          alex@stepup.dance, sam@stepup.dance, priya@stepup.dance, chris@stepup.dance, jordan@stepup.dance (students)"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
