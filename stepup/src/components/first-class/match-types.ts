import type { CandidateClass } from "@/lib/first-class";

/** Labels the server works out once, so the browser only has to rank. */
type DisplayLabels = {
  /** e.g. "Tomorrow · 6:00pm", in the class's own timezone. */
  whenLabel: string;
  /** e.g. "Free" or "$25.00". */
  priceLabel: string;
};

/** A candidate as it crosses from server to client: dates as ISO strings. */
export type MatchCandidate = Omit<CandidateClass, "startTime"> &
  DisplayLabels & { startTime: string };

/** The same candidate in the browser, with its date restored for ranking. */
export type LiveCandidate = CandidateClass & DisplayLabels;
