/** The class sheet's tabs. Plain code, so the server page can read `?tab=`. */
export type SheetTab = "list" | "msg" | "reschedule" | "cancel";

export function isSheetTab(v: unknown): v is SheetTab {
  return v === "list" || v === "msg" || v === "reschedule" || v === "cancel";
}
