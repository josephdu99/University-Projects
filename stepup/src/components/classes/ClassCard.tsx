import Link from "next/link";
import { formatClassWhen, formatDuration, formatMoney } from "@/lib/time";
import { LEVEL_LABEL } from "@/lib/roles";
import { Tag } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import { BookButton } from "@/components/classes/BookButton";

export type ClassCardData = {
  id: string;
  title: string;
  style: string;
  format: string;
  level: string;
  startTime: Date;
  timezone: string;
  durationMin: number;
  points: number;
  capacity: number;
  seatsTaken: number;
  priceCents: number;
  currency: string;
  hostName: string;
  studioName: string | null;
  city: string | null;
};

export function ClassCard({
  data,
  bookingStatus,
  viewerTimezone,
}: {
  data: ClassCardData;
  bookingStatus?: string | null;
  viewerTimezone: string;
}) {
  const spotsLeft = data.capacity - data.seatsTaken;
  const isFull = spotsLeft <= 0;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone="brand">{data.style}</Tag>
          <Tag tone={data.format === "ONLINE" ? "success" : "neutral"}>
            {data.format === "ONLINE" ? "Online" : "In person"}
          </Tag>
          <Tag>
            {LEVEL_LABEL[data.level as keyof typeof LEVEL_LABEL] ?? data.level}
          </Tag>
        </div>
        <Tag tone="gold">⚡ {data.points} pts</Tag>
      </div>

      <Link href={`/classes/${data.id}`} className="group">
        <h3 className="font-bold text-ink group-hover:text-brand">{data.title}</h3>
        <p className="mt-0.5 text-sm text-ink-soft">
          {data.studioName ? `@ ${data.studioName}` : `with ${data.hostName}`}
          {data.city ? ` · ${data.city}` : ""}
        </p>
      </Link>

      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span>
          {/* Rendered in the viewer's own timezone, not the server's. */}
          {formatClassWhen(data.startTime, viewerTimezone)} ·{" "}
          {formatDuration(data.durationMin)}
        </span>
        <span className="font-semibold text-ink">
          {formatMoney(data.priceCents, data.currency)}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-ink-soft">
        <span className={isFull ? "font-medium text-red-500" : ""}>
          {isFull ? "Full, waitlist open" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
        </span>
      </div>

      {bookingStatus === "BOOKED" || bookingStatus === "ATTENDED" ? (
        <div className="rounded-full bg-success/10 py-2.5 text-center text-sm font-semibold text-success">
          Booked ✓
        </div>
      ) : bookingStatus === "WAITLISTED" ? (
        <div className="rounded-full bg-gold/15 py-2.5 text-center text-sm font-semibold text-gold">
          On the waitlist
        </div>
      ) : bookingStatus === "PENDING_PAYMENT" ? (
        <div className="rounded-full bg-surface-muted py-2.5 text-center text-sm font-semibold text-ink-soft">
          Payment pending
        </div>
      ) : (
        <BookButton
          classId={data.id}
          isFull={isFull}
          label={data.priceCents > 0 ? "Book & pay" : "Book"}
        />
      )}
    </Card>
  );
}
