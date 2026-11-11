import Link from "next/link";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { answersFromParams } from "@/lib/first-class";
import { Matcher } from "@/components/first-class/Matcher";
import { FunnelPage, Wordmark } from "@/components/first-class/FunnelChrome";

export const metadata = {
  title: "Find your first class, StepUp",
  description:
    "Three quick questions and we'll match you with a beginner-friendly dance class that fits.",
};

/**
 * Step 2 of the funnel. The answers already in the URL seed the form, so
 * "Edit answers" from the results page comes back with everything still
 * filled in.
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{
    goals?: string;
    music?: string;
    where?: string;
    when?: string;
  }>;
}) {
  const initial = answersFromParams(await searchParams);

  return (
    <FunnelPage>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            maxWidth: 760,
            width: "100%",
            margin: "0 auto",
            padding: "20px clamp(20px, 5vw, 40px) 0",
            boxSizing: "border-box",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link href="/" style={{ textDecoration: "none" }}>
            <Wordmark size={20} />
          </Link>
          <Link
            href="/"
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: "oklch(45% 0.02 60)",
              textDecoration: "none",
            }}
          >
            Exit
          </Link>
        </div>

        <Matcher initial={initial} />

        <div
          style={{
            maxWidth: 760,
            width: "100%",
            margin: "0 auto",
            padding: "0 clamp(20px, 5vw, 40px) 32px",
            boxSizing: "border-box",
            fontSize: 13,
            color: "oklch(50% 0.02 60)",
          }}
        >
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, color: C.ink }}>
            Nothing is saved yet.
          </span>{" "}
          Your answers only shape the classes on the next page.
        </div>
      </div>
    </FunnelPage>
  );
}
