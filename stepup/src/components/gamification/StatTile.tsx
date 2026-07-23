import { Card } from "@/components/ui/Card";

export function StatTile({
  label,
  value,
  emoji,
}: {
  label: string;
  value: string | number;
  emoji: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-1 px-3 py-4 text-center">
      <span className="text-2xl">{emoji}</span>
      <span className="text-xl font-bold text-ink">{value}</span>
      <span className="text-xs font-medium text-ink-soft">{label}</span>
    </Card>
  );
}
