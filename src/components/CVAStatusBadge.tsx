import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";

export function getCVAStatus(expiration: string | null | undefined) {
  if (!expiration) return { label: "Sem CVA", days: null, color: "muted" as const };
  const exp = typeof expiration === "string" ? parseISO(expiration) : expiration;
  const days = differenceInDays(exp, new Date());
  if (days < 0) return { label: `Vencido há ${Math.abs(days)}d`, days, color: "danger" as const };
  if (days < 7) return { label: `${days}d restantes`, days, color: "danger" as const };
  if (days < 30) return { label: `${days}d restantes`, days, color: "orange" as const };
  if (days < 60) return { label: `${days}d restantes`, days, color: "warning" as const };
  return { label: `${days}d restantes`, days, color: "success" as const };
}

const colors = {
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  warning: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  orange: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  danger: "bg-red-500/15 text-red-300 border-red-500/30",
  muted: "bg-white/5 text-muted-foreground border-white/10",
};

export function CVAStatusBadge({ expiration, className }: { expiration: string | null | undefined; className?: string }) {
  const s = getCVAStatus(expiration);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", colors[s.color], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      CVA · {s.label}
    </span>
  );
}