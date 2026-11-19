"use client";

import { useState, useTransition } from "react";
import { setPayoutDayAction, type Result } from "@/lib/actions/studio-admin-actions";
import { ResultLine } from "./TabTitle";

const DAYS = [
  ["MON", "Mon"],
  ["TUE", "Tue"],
  ["WED", "Wed"],
  ["THU", "Thu"],
  ["FRI", "Fri"],
] as const;

export function PayoutDayPicker({ day }: { day: string }) {
  const [r, setR] = useState<Result>(undefined);
  const [pending, start] = useTransition();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>Payout day</span>
      <select
        className="su-fld"
        defaultValue={day}
        disabled={pending}
        style={{ width: 140 }}
        onChange={(e) => {
          const v = e.target.value;
          start(async () => setR(await setPayoutDayAction(v)));
        }}
      >
        {DAYS.map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      <ResultLine r={r} />
    </label>
  );
}
