import { motion } from "framer-motion";
import { AlertTriangle, ExternalLink, Filter, Loader2, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useLogisecure } from "@/hooks/useLogisecure";
import {
  sortEventsBySeverity,
  threatEventKey,
  type ThreatSeverity,
} from "@/lib/logisecure-api";

const SEVERITIES: (ThreatSeverity | "ALL")[] = [
  "ALL",
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

const SEV_STYLES: Record<string, string> = {
  CRITICAL: "border-destructive/40 bg-destructive/10 text-destructive",
  HIGH: "border-amber/40 bg-amber/10 text-amber",
  MEDIUM: "border-amber/30 bg-amber/5 text-amber",
  LOW: "border-primary/30 bg-primary/5 text-primary",
};

export function GlobalAlerts() {
  const { data, isLoading, isFetching, error, dismissedKeys } = useLogisecure();
  const [filter, setFilter] = useState<ThreatSeverity | "ALL">("ALL");

  const events = useMemo(() => {
    const all = data?.geopolitical_threats?.events ?? [];
    const sorted = sortEventsBySeverity(all);
    return filter === "ALL"
      ? sorted
      : sorted.filter((e) => (e.severity ?? "").toUpperCase() === filter);
  }, [data, filter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="glass flex flex-col overflow-hidden rounded-2xl"
    >
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-amber">
            <AlertTriangle className="h-3 w-3" />
            <span>RISK & ALERTS · GEOPOLITICAL</span>
          </div>
          <div className="mt-1 text-sm font-semibold tracking-tight">
            Live threat feed · {data?.geopolitical_threats?.summary?.total_events ?? 0} events
          </div>
        </div>
        {isFetching ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-white/5 px-4 py-3">
        <Filter className="mr-1 h-3 w-3 text-muted-foreground" />
        {SEVERITIES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md border px-2 py-1 font-mono text-[9px] tracking-widest transition-colors ${
              filter === s
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-white/5 bg-white/[0.02] text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="max-h-[420px] space-y-2 overflow-y-auto px-3 py-3">
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            Backend unreachable. Verify the LogiSecure API is running.
          </div>
        ) : null}
        {!error && events.length === 0 && !isLoading && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No threat events for this filter.
          </div>
        )}
        {isLoading && !error && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            Loading live threat feed…
          </div>
        )}
        {events.map((e, i) => {
          const key = threatEventKey(e);
          const sev = (e.severity ?? "LOW").toUpperCase();
          const dismissed = dismissedKeys.has(key);
          const cls = SEV_STYLES[sev] ?? SEV_STYLES.LOW;
          return (
            <div
              key={key + i}
              className={`rounded-xl border p-3 ${cls} ${dismissed ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-2 font-mono text-[9px] tracking-widest">
                <span className="font-bold">{sev}</span>
                <span className="text-muted-foreground">
                  {e.published
                    ? new Date(e.published).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </div>
              <div className="mt-1 line-clamp-3 text-sm font-medium leading-snug text-foreground">
                {e.event}
              </div>
              {(e.lat != null && e.lng != null) || e.link ? (
                <div className="mt-1.5 flex items-center gap-2 font-mono text-[9px] tracking-widest text-muted-foreground">
                  {e.lat != null && e.lng != null && (
                    <span>
                      {Number(e.lat).toFixed(2)}, {Number(e.lng).toFixed(2)}
                    </span>
                  )}
                  {e.link && (
                    <a
                      href={e.link}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      SOURCE <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}