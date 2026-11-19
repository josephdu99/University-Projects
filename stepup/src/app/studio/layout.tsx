import { requireStudioAccess } from "@/lib/studio-access";
import { AppChrome, hostNav } from "@/components/shell/AppChrome";

/**
 * The studio dashboard, for whoever runs the studio: the account that signed
 * it up, or a manager it invited.
 */
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireStudioAccess();
  return (
    <AppChrome items={hostNav("/studio")} user={{ name: user.name ?? "You", mark: user.avatarMark, color: user.avatarColor }}>
      {children}
    </AppChrome>
  );
}
