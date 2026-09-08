import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ROLE_HOME } from "@/lib/roles";
import { marketingFontClass, BODY } from "@/lib/marketing-theme";
import { GetStartedFlow } from "./GetStartedFlow";

export const metadata = {
  title: "Get started, StepUp",
  description:
    "Create your StepUp account, book classes as a dancer, list a studio, or teach online.",
};

export default async function GetStartedPage() {
  const user = await getSessionUser();
  if (user) redirect(ROLE_HOME[user.role]);

  return (
    <div className={marketingFontClass} style={{ fontFamily: BODY }}>
      <GetStartedFlow />
    </div>
  );
}
