import Link from "next/link";
import { bookClassAction } from "@/lib/actions/class-actions";
import { formatClassWhen, formatDuration } from "@/lib/format";
import { LEVEL_LABEL } from "@/lib/roles";
import { Tag } from "@/components/ui/Pill";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Card } from "@/components/ui/Card";

export type ClassCardData = {
  id: string;
  title: string;
  style: string;
  format: string;
  level: string;
  startTime: Date;
  durationMin: number;
  points: number;
  capacity: number;
  bookedCount: number;
  hostName: string;
  studioName: string | null;
  city: string | null;
};

export function ClassCard({
  data,
  isBooked,
}: {
  data: ClassCardData;
  isBooked: boolean;
}) {
  const spotsLeft = data.capacity - data.bookedCount;
  const isFull = spotsLeft <= 0;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone="brand">{data.style}</Tag>
          <Tag tone={data.format === "ONLINE" ? "success" : "neutral"}>
            {data.format === "ONLINE" ? "Online" : "In person"}
          </Tag>
          <Tag>{LEVEL_LABEL[data.level as keyof typeof LEVEL_LABEL] ?? data.level}</Tag>
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
          {formatClassWhen(data.startTime)} · {formatDuration(data.durationMin)}
        </span>
        <span className={isFull ? "font-medium text-red-500" : ""}>
          {isFull ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
        </span>
      </div>

      {isBooked ? (
        <div className="rounded-full bg-success/10 py-2.5 text-center text-sm font-semibold text-success">
          Booked ✓
        </div>
      ) : (
        <form action={bookClassAction.bind(null, data.id)}>
          <SubmitButton
            className="w-full"
            disabled={isFull}
            pendingLabel="Booking…"
          >
            {isFull ? "Full" : "Book"}
          </SubmitButton>
        </form>
      )}
    </Card>
  );
}
