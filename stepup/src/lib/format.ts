import { format, isToday, isTomorrow } from "date-fns";

export function formatClassWhen(date: Date) {
  const time = format(date, "h:mma").toLowerCase();
  if (isToday(date)) return `Today · ${time}`;
  if (isTomorrow(date)) return `Tomorrow · ${time}`;
  return `${format(date, "EEE d MMM")} · ${time}`;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
