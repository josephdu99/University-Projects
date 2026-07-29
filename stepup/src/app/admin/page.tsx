import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Pill";
import { Avatar } from "@/components/ui/Avatar";
import { StatTile } from "@/components/gamification/StatTile";
import { formatMoney, formatClassWhen } from "@/lib/time";
import {
  suspendStudioAction,
  unsuspendStudioAction,
} from "@/lib/actions/admin-actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireAdmin();
  const { q } = await searchParams;

  const [
    userCount,
    studioCount,
    classCount,
    attendedCount,
    revenue,
    users,
    studios,
    recentClasses,
    auditTrail,
  ] = await Promise.all([
    db.user.count(),
    db.studio.count(),
    db.danceClass.count(),
    db.booking.count({ where: { status: "ATTENDED" } }),
    db.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amountCents: true, feeCents: true },
    }),
    db.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarEmoji: true,
        avatarColor: true,
        suspendedAt: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    }),
    db.studio.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { owner: { select: { name: true, email: true } } },
    }),
    db.danceClass.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { host: { select: { name: true } } },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { actor: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Admin</h1>
        <p className="text-sm text-ink-soft">
          Signed in as {admin.name} · platform moderation and support
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile emoji="👥" label="Users" value={userCount} />
        <StatTile emoji="🏢" label="Studios" value={studioCount} />
        <StatTile emoji="🕺" label="Classes" value={classCount} />
        <StatTile emoji="✅" label="Check-ins" value={attendedCount} />
        <StatTile
          emoji="💰"
          label="Platform fees"
          value={formatMoney(revenue._sum.feeCents ?? 0)}
        />
      </div>

      <Card className="p-4">
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search users by name or email"
            className="flex-1 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand"
          />
          <SubmitButton size="sm" variant="secondary" pendingLabel="Searching…">
            Search
          </SubmitButton>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-bold text-ink">
          {q ? `Users matching “${q}”` : "Recent users"}
        </h2>
        {users.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-5 text-center text-sm text-ink-soft">
            No users found.
          </p>
        ) : (
          <Card className="divide-y divide-border">
            {users.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted"
              >
                <Avatar emoji={u.avatarEmoji} color={u.avatarColor} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{u.name}</p>
                  <p className="truncate text-xs text-ink-soft">{u.email}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Tag>{u.role}</Tag>
                  {u.suspendedAt && <Tag tone="gold">Suspended</Tag>}
                  {!u.emailVerifiedAt && <Tag>Unverified</Tag>}
                </div>
              </Link>
            ))}
          </Card>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-ink">Studios</h2>
        {studios.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-5 text-center text-sm text-ink-soft">
            No studios yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {studios.map((s) => (
              <Card key={s.id} className="flex items-center gap-3 p-4">
                <span className="text-2xl">{s.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{s.name}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {s.city} · {s.owner.name} ({s.owner.email})
                  </p>
                </div>
                {s.suspendedAt ? (
                  <form action={unsuspendStudioAction.bind(null, s.id)}>
                    <SubmitButton size="sm" variant="secondary" pendingLabel="…">
                      Unsuspend
                    </SubmitButton>
                  </form>
                ) : (
                  <form action={suspendStudioAction.bind(null, s.id)}>
                    <SubmitButton size="sm" variant="danger" pendingLabel="…">
                      Suspend
                    </SubmitButton>
                  </form>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-ink">Recently created classes</h2>
        <Card className="divide-y divide-border">
          {recentClasses.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{c.title}</p>
                <p className="truncate text-xs text-ink-soft">
                  {c.host.name} · {formatClassWhen(c.startTime, c.timezone)}
                </p>
              </div>
              {c.cancelledAt && <Tag>Cancelled</Tag>}
            </div>
          ))}
        </Card>
      </div>

      {auditTrail.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-ink">Recent admin actions</h2>
          <Card className="divide-y divide-border">
            {auditTrail.map((a) => (
              <div key={a.id} className="px-4 py-2.5 text-xs text-ink-soft">
                <span className="font-semibold text-ink">{a.actor.name}</span>{" "}
                {a.action} on {a.targetType} {a.targetId.slice(0, 8)}…
                {a.detail ? ` — ${a.detail}` : ""}
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
