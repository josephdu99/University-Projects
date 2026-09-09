import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ROLE_LABEL, isHost, type Role } from "@/lib/roles";
import { getDancerProfile } from "@/lib/dancer-profile";
import { getStudioProfile } from "@/lib/studio-profile";
import { StudioProfileHeader } from "@/components/host/StudioProfile";
import {
  HostPasswordCard,
  HostProfileCard,
  PayoutsCard,
  StudioDetailsCard,
} from "@/components/host/StudioProfileForms";
import { DEFAULT_AVATAR_COLOR } from "@/lib/avatar-colors";
import { PayoutPanel } from "@/components/PayoutPanel";
import { logoutAction } from "@/lib/actions/auth-actions";
import { Avatar } from "@/components/ui/Avatar";
import { AvatarMark } from "@/components/ui/AvatarMark";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Pill";
import { DancerProfile } from "@/components/dancer/DancerProfile";
import {
  EditProfilePanel,
  PasswordPanel,
  VisibilityPanel,
} from "@/components/dancer/DancerProfileForms";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { StudioForm } from "./StudioForm";
import { VerifyBanner } from "@/components/VerifyBanner";
import { C, DISPLAY } from "@/lib/marketing-theme";

export const metadata = { title: "Profile · StepUp" };

export default async function ProfilePage() {
  const sessionUser = await requireUser();

  const user = await db.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    include: { profile: true, studio: true, _count: { select: { hostedClasses: true } } },
  });

  if (user.role === "STUDENT") {
    const data = await getDancerProfile({ id: user.id, timezone: user.timezone });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {!user.emailVerifiedAt && (
          <div style={{ marginBottom: 4 }}>
            <VerifyBanner verified={false} />
          </div>
        )}

        <DancerProfile
          name={user.name}
          city={user.homeCity}
          avatarColor={user.avatarColor || DEFAULT_AVATAR_COLOR}
          verified={Boolean(user.emailVerifiedAt)}
          data={data}
        />

        <EditProfilePanel
          defaults={{
            name: user.name,
            homeCity: user.homeCity ?? "",
            timezone: user.timezone,
            avatarColor: user.avatarColor || DEFAULT_AVATAR_COLOR,
          }}
        />

        <VisibilityPanel optedIn={user.leaderboardOptIn} />

        <PasswordPanel />

        <form action={logoutAction}>
          <button
            type="submit"
            style={{
              width: "100%",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 600,
              fontSize: 15,
              padding: "14px 26px",
              borderRadius: 999,
              background: "transparent",
              border: `1.5px solid ${C.border}`,
              color: C.label,
            }}
          >
            Log out of {user.email}
          </button>
        </form>
      </div>
    );
  }

  const [payout, earnings] = await Promise.all([
    db.payoutAccount.findUnique({ where: { userId: user.id } }),
    db.payment.aggregate({
      where: { status: "PAID", booking: { class: { hostId: user.id } } },
      _sum: { amountCents: true, feeCents: true },
    }),
  ]);

  const netEarningsCents =
    (earnings._sum.amountCents ?? 0) - (earnings._sum.feeCents ?? 0);

  if (user.role === "STUDIO_OWNER" && user.studio) {
    const data = await getStudioProfile({
      id: user.id,
      timezone: user.timezone,
      payoutsActive: Boolean(payout?.chargesEnabled && payout?.payoutsEnabled),
    });

    return (
      <div>
        {!user.emailVerifiedAt && (
          <div style={{ marginBottom: 16 }}>
            <VerifyBanner verified={false} />
          </div>
        )}

        <StudioProfileHeader
          name={user.name}
          role={ROLE_LABEL[user.role as Role]}
          city={user.homeCity}
          studioName={user.studio.name}
          avatarColor={user.avatarColor || DEFAULT_AVATAR_COLOR}
          verified={Boolean(user.emailVerifiedAt)}
          data={data}
        />

        <PayoutsCard
          status={payout?.status ?? null}
          chargesEnabled={payout?.chargesEnabled ?? false}
          payoutsEnabled={payout?.payoutsEnabled ?? false}
          netEarningsCents={netEarningsCents}
        />

        <StudioDetailsCard
          defaults={{
            name: user.studio.name,
            description: user.studio.description,
            city: user.studio.city,
            address: user.studio.address,
            timezone: user.studio.timezone,
            emoji: user.studio.emoji,
          }}
        />

        <HostProfileCard
          defaults={{
            name: user.name,
            homeCity: user.homeCity ?? "",
            timezone: user.timezone,
            avatarColor: user.avatarColor || DEFAULT_AVATAR_COLOR,
          }}
        />

        <HostPasswordCard />

        <section
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "24px clamp(22px, 4vw, 36px)",
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 24,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: C.label,
                marginBottom: 6,
              }}
            >
              Account email
            </div>
            {/* The design pairs this with a "Change email" button. There is no
                email-change flow — changing it would need re-verification and
                a way back if the new address is wrong — so it is not drawn. */}
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>
              {user.email}
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              style={{
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: 14.5,
                padding: "11px 22px",
                borderRadius: 999,
                background: "none",
                border: "1.5px solid oklch(89% 0.012 70)",
                color: "oklch(30% 0.02 60)",
              }}
            >
              Log out
            </button>
          </form>
        </section>
      </div>
    );
  }

  // ── Instructors and admins keep the existing profile ──────────────────────
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <VerifyBanner verified={sessionUser.verified} />

      <Card className="flex items-center gap-4 p-5">
        {user.role === "INSTRUCTOR" ? (
          <AvatarMark
            name={user.name}
            mark={user.avatarMark}
            color={user.avatarColor}
            size={72}
          />
        ) : (
          <Avatar emoji={user.avatarEmoji} color={user.avatarColor} size="xl" />
        )}
        <div>
          <h1 className="text-xl font-extrabold text-ink">{user.name}</h1>
          <p className="text-sm text-ink-soft">{ROLE_LABEL[user.role as Role]}</p>
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
          displayName: user.displayName ?? "",
          homeCity: user.homeCity ?? "",
          bio: user.bio ?? "",
          timezone: user.timezone,
          avatarEmoji: user.avatarEmoji,
          avatarColor: user.avatarColor,
          avatarMark: user.avatarMark,
        }}
        showBio={user.role === "INSTRUCTOR"}
        useMark={user.role === "INSTRUCTOR"}
      />

      {/* The dashboard's payout nudge disappears once payouts are connected,
          so earnings and the Stripe dashboard link live here instead. */}
      {isHost(user.role as Role) && (
        <PayoutPanel
          status={payout?.status ?? null}
          chargesEnabled={payout?.chargesEnabled ?? false}
          payoutsEnabled={payout?.payoutsEnabled ?? false}
          netEarningsCents={netEarningsCents}
        />
      )}

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
