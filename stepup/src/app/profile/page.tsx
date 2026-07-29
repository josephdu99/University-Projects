import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { logoutAction } from "@/lib/actions/auth-actions";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Pill";
import { LevelProgress } from "@/components/gamification/LevelProgress";
import { StatTile } from "@/components/gamification/StatTile";
import { BadgeGrid } from "@/components/gamification/BadgeGrid";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { StudioForm } from "./StudioForm";
import { VerifyBanner } from "@/components/VerifyBanner";

export default async function ProfilePage() {
  const sessionUser = await requireUser();

  const user = await db.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    include: {
      profile: true,
      studio: true,
      badges: { include: { badge: true } },
      _count: { select: { hostedClasses: true } },
    },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <VerifyBanner verified={sessionUser.verified} />

      <Card className="flex items-center gap-4 p-5">
        <Avatar emoji={user.avatarEmoji} color={user.avatarColor} size="xl" />
        <div>
          <h1 className="text-xl font-extrabold text-ink">{user.name}</h1>
          <p className="text-sm text-ink-soft">
            {ROLE_LABEL[user.role as Role]}
          </p>
          {user.homeCity && <p className="text-sm text-ink-soft">📍 {user.homeCity}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {user.emailVerifiedAt ? (
              <Tag tone="success">Email verified</Tag>
            ) : (
              <Tag tone="gold">Email unverified</Tag>
            )}
          </div>
        </div>
      </Card>

      {user.role === "STUDENT" && (
        <>
          <Card className="p-5">
            <LevelProgress points={user.profile?.totalPoints ?? 0} />
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <StatTile
              emoji="🔥"
              label="Week streak"
              value={user.profile?.currentStreak ?? 0}
            />
            <StatTile
              emoji="🕺"
              label="Classes taken"
              value={user.profile?.classesTaken ?? 0}
            />
            <StatTile emoji="🏅" label="Badges" value={user.badges.length} />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">Badges</h2>
            <BadgeGrid
              earnedCodes={new Set(user.badges.map((b) => b.badge.code))}
            />
          </div>
        </>
      )}

      {user.role === "INSTRUCTOR" && (
        <Card className="flex flex-col gap-1 p-5">
          <h2 className="text-lg font-bold text-ink">About</h2>
          <p className="text-sm text-ink">{user.bio || "No bio yet."}</p>
          <p className="mt-3 text-sm font-medium text-ink-soft">
            {user._count.hostedClasses} classes hosted
          </p>
        </Card>
      )}

      <ProfileForm
        defaults={{
          name: user.name,
          homeCity: user.homeCity ?? "",
          bio: user.bio ?? "",
          timezone: user.timezone,
          avatarEmoji: user.avatarEmoji,
          avatarColor: user.avatarColor,
        }}
        showBio={user.role === "INSTRUCTOR"}
      />

      {user.role === "STUDIO_OWNER" && user.studio && (
        <StudioForm
          defaults={{
            name: user.studio.name,
            description: user.studio.description,
            city: user.studio.city,
            address: user.studio.address,
            timezone: user.studio.timezone,
            emoji: user.studio.emoji,
          }}
        />
      )}

      <PasswordForm />

      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-semibold text-ink">Email</p>
          <p className="text-sm text-ink-soft">{user.email}</p>
        </div>
      </Card>

      <form action={logoutAction}>
        <Button type="submit" variant="secondary" className="w-full">
          Log out
        </Button>
      </form>
    </div>
  );
}
