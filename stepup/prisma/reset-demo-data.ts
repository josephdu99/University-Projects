/**
 * Removes seeded demo data from a deployed database, leaving real accounts
 * untouched.
 *
 * Run before opening the app to real customers:
 *   DATABASE_URL="<production url>" npx tsx prisma/reset-demo-data.ts
 *
 * Pass --dry-run first to see what would be deleted.
 */
import { db } from "../src/lib/db";
import { assertNotProduction } from "../src/lib/environment";

const DEMO_EMAIL_PATTERNS = [
  "@stepup.dance",
  "@rhythmroom.dance",
  "@salsacasa.dance",
  "@barrebeyond.dance",
];

const dryRun = process.argv.includes("--dry-run");

async function main() {
  // Deleting demo accounts is exactly the sort of thing that should not happen
  // to Production by a mistyped DATABASE_URL. --force is the deliberate override.
  if (!dryRun) assertNotProduction("reset-demo-data");

  const demoUsers = await db.user.findMany({
    where: { OR: DEMO_EMAIL_PATTERNS.map((p) => ({ email: { endsWith: p } })) },
    select: { id: true, email: true, role: true },
  });

  if (demoUsers.length === 0) {
    console.log("No demo accounts found — nothing to do.");
    return;
  }

  const ids = demoUsers.map((u) => u.id);

  const [classes, bookings, paidPayments] = await Promise.all([
    db.danceClass.count({ where: { hostId: { in: ids } } }),
    db.booking.count({ where: { userId: { in: ids } } }),
    db.payment.count({
      where: { status: "PAID", booking: { userId: { in: ids } } },
    }),
  ]);

  console.log(`Found ${demoUsers.length} demo accounts:`);
  for (const u of demoUsers) console.log(`  ${u.role.padEnd(13)} ${u.email}`);
  console.log(`\nWould also remove ${classes} classes and ${bookings} bookings.`);

  if (paidPayments > 0) {
    console.error(
      `\nAborting: ${paidPayments} completed payments are attached to these ` +
        `accounts. Refund or reconcile them before deleting.`
    );
    process.exit(1);
  }

  if (dryRun) {
    console.log("\n--dry-run: nothing was deleted.");
    return;
  }

  // Cascades handle bookings, payments, badges, profiles, studios and classes.
  const { count } = await db.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`\nDeleted ${count} demo accounts and their associated data.`);

  const remaining = await db.user.count();
  console.log(`${remaining} real accounts remain.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
