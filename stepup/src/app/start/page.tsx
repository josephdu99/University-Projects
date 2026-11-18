import { formatClassWhen, formatMoney } from "@/lib/time";
import { answersFromParams } from "@/lib/first-class";
import { getBeginnerClasses, getStudioSuburbs } from "@/lib/first-class-data";
import { MatchPage } from "@/components/first-class/MatchPage";
import type { MatchCandidate } from "@/components/first-class/match-types";
import { FunnelPage } from "@/components/first-class/FunnelChrome";

export const metadata = {
  title: "Find your first class, StepUp",
  description:
    "Three quick questions, and beginner-friendly dance classes that fit your answers, updating as you go.",
};

type Params = { goals?: string; music?: string; where?: string; when?: string };

/**
 * Step 2 of the funnel: the questions and the matches, on one page.
 *
 * The server's part is the data. It loads every upcoming beginner-friendly
 * class once, works out the labels the cards show, and hands the lot to the
 * browser, which ranks them live as the answers change.
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const [classes, studioSuburbs] = await Promise.all([
    getBeginnerClasses(),
    getStudioSuburbs(),
  ]);

  const candidates: MatchCandidate[] = classes.map((c) => ({
    ...c,
    startTime: c.startTime.toISOString(),
    whenLabel: formatClassWhen(c.startTime, c.timezone),
    priceLabel: formatMoney(c.priceCents, c.currency),
  }));

  // Answers in the link, from an older results URL, seed the page once.
  const carried = Object.values(params).some(Boolean)
    ? answersFromParams(params)
    : null;

  return (
    <FunnelPage>
      <MatchPage
        candidates={candidates}
        studioSuburbs={studioSuburbs}
        fromUrl={carried}
      />
    </FunnelPage>
  );
}
