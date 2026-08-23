import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";

export function getCVAStatus(expiration: string | null | undefined) {
  if (!expiration) return { label: "Sem CVA", days: null, color: "muted" as const };
  const exp = typeof expiration === "string" ? parseISO(expiration) : expiration;
  const days = differenceInDays(exp, new Date());
   if (days < 0) return { label: `Vencido há ${Math.abs(days)}d`, days, color: "danger" as const };
   if (days < 7) return { label: `${days}d (Crítico)`, days, color: "danger" as const };
  if (days < 30) return { label: `${days}d restantes`, days, color: "orange" as const };
  if (days < 60) return { label: `${days}d restantes`, days, color: "warning" as const };
  return { label: `${days}d restantes`, days, color: "success" as const };
}

const colors = {
  success: "bg-[#37805A]/10 text-[#37805A] border-[#37805A]/20",
  warning: "bg-[#C58A21]/10 text-[#C58A21] border-[#C58A21]/20",
  orange: "bg-[#C58A21]/15 text-[#C58A21] border-[#C58A21]/30",
  danger: "bg-[#B94A48]/10 text-[#B94A48] border-[#B94A48]/20",
  muted: "bg-muted text-muted-foreground border-border",
};

export function CVAStatusBadge({ expiration, className }: { expiration: string | null | undefined; className?: string }) {
  const s = getCVAStatus(expiration);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", colors[s.color], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      CVA · {s.label}
    </span>
  );
}