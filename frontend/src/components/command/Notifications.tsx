import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ShieldAlert, X } from "lucide-react";
import { useLogisecure } from "@/hooks/useLogisecure";
import { threatEventKey, type ThreatEvent } from "@/lib/logisecure-api";

function toneFor(sev: string): "danger" | "warn" | "info" {
  const u = (sev ?? "").toUpperCase();
  if (u === "CRITICAL") return "danger";
  if (u === "HIGH" || u === "MEDIUM") return "warn";
  return "info";
}

const TONES = {
  danger: { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
  warn: { text: "text-amber", bg: "bg-amber/10", border: "border-amber/30" },
  info: { text: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
} as const;

export function Notifications() {
  const { newEvents, dismissEvent } = useLogisecure();

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-40 flex w-[min(360px,92vw)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {newEvents.slice(0, 4).map((n: ThreatEvent) => {
          const key = threatEventKey(n);
          const tone = toneFor(n.severity);
          const t = TONES[tone];
          const Icon = tone === "danger" ? ShieldAlert : AlertTriangle;
          return (
            <motion.div
              key={key}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className={`glass-strong pointer-events-auto flex items-start gap-3 rounded-xl border p-3 ${t.border}`}
            >
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${t.bg} ${t.text}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium">
                    {(n.severity ?? "").toUpperCase()} · New threat
                  </div>
                  <span className="shrink-0 font-mono text-[9px] tracking-widest text-muted-foreground">
                    {n.published
                      ? new Date(n.published).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "NOW"}
                  </span>
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {n.event}
                </div>
              </div>
              <button
                onClick={() => dismissEvent(key)}
                aria-label="Dismiss notification"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}