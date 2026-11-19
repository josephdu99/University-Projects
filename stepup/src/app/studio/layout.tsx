import { requireStudioAccess, studioPerms } from "@/lib/studio-access";
import { AppChrome, studioNav } from "@/components/shell/AppChrome";

/**
 * The studio dashboard, for whoever runs the studio: the account that signed
 * it up, or a manager it invited. Six tabs (flow v6.4); Payouts only for the
 * account the money goes to.
 */
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireStudioAccess();
  const { user } = access;
  return (
    <AppChrome
      items={studioNav(studioPerms(access).payouts)}
      accountHref="/profile"
      user={{ name: user.name ?? "You", mark: user.avatarMark, color: user.avatarColor }}
    >
      {children}
    </AppChrome>
  );
}
