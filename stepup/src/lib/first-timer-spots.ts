/**
 * How many seats a regular (someone who has attended a class before) can
 * book, once the host keeps some for first-timers.
 *
 * The kept seats are those not yet taken by first-timers: with 16 seats, 6
 * kept and 2 first-timers booked, regulars can fill 12 (16 − (6 − 2)). A
 * first-timer can always book any open seat.
 */
export function seatsForRegulars(
  capacity: number,
  firstTimerSpots: number | null,
  firstTimersHolding: number,
): number {
  if (!firstTimerSpots || firstTimerSpots <= 0) return capacity;
  const kept = Math.max(0, Math.min(firstTimerSpots, capacity) - firstTimersHolding);
  return capacity - kept;
}
