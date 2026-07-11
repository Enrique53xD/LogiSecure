import { motion } from "framer-motion";
import { Plane, Ship, Truck, ShieldAlert, Thermometer, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCountUp } from "./useCountUp";
import { useLogisecure } from "@/hooks/useLogisecure";

type KPI = {
  label: string;
  value: number;
  suffix?: string;
  delta: number;
  icon: LucideIcon;
  tone: "primary" | "cyan" | "amber" | "success" | "danger";
  hint: string;
  format?: (v: number) => string;
};

const TONES: Record<KPI["tone"], { text: string; bg: string; ring: string }> = {
  primary: { text: "text-primary", bg: "from-primary/20 to-primary/0", ring: "oklch(0.78 0.18 220 / 0.5)" },
  cyan: { text: "text-accent", bg: "from-accent/20 to-accent/0", ring: "oklch(0.72 0.16 200 / 0.5)" },
  amber: { text: "text-amber", bg: "from-amber/20 to-amber/0", ring: "oklch(0.82 0.16 75 / 0.5)" },
  success: { text: "text-success", bg: "from-success/20 to-success/0", ring: "oklch(0.78 0.18 155 / 0.5)" },
  danger: { text: "text-destructive", bg: "from-destructive/20 to-destructive/0", ring: "oklch(0.68 0.24 22 / 0.5)" },
};

function useLiveKPIs(): KPI[] {
  const { data } = useLogisecure();
  const air = data?.air_traffic?.flights?.length ?? 0;
  const sea = data?.maritime_traffic?.data?.container_liners?.length ?? 0;
  const land = data?.land_traffic?.data?.total_active ?? data?.land_traffic?.data?.active_land_shipments?.length ?? 0;
  const events = data?.geopolitical_threats?.events ?? [];
  const critical = data?.geopolitical_threats?.summary?.critical ?? events.filter((e) => (e.severity ?? "").toUpperCase() === "CRITICAL").length;
  const total = data?.geopolitical_threats?.summary?.total_events ?? events.length;
  const temp = data?.weather_telemetry?.temperature;
  return [
    { label: "Air Couriers", value: air, delta: 0, icon: Plane, tone: "primary", hint: "Live from air_traffic", format: (v) => Math.round(v).toLocaleString() },
    { label: "Maritime Liners", value: sea, delta: 0, icon: Ship, tone: "cyan", hint: "Live from maritime_traffic", format: (v) => Math.round(v).toLocaleString() },
    { label: "Land Shipments", value: land, delta: 0, icon: Truck, tone: "success", hint: "Active land routes", format: (v) => Math.round(v).toLocaleString() },
    { label: "Critical Threats", value: critical, delta: 0, icon: ShieldAlert, tone: "danger", hint: `${total} total events`, format: (v) => Math.round(v).toString() },
    { label: "Threat Level", value: 0, delta: 0, icon: Activity, tone: "amber", hint: String(data?.geopolitical_threats?.summary?.threat_level ?? "—"), format: () => String(data?.geopolitical_threats?.summary?.threat_level ?? "—") },
    { label: "HQ Temp", value: temp != null ? Number(temp) : 0, suffix: temp != null ? "°C" : "", delta: 0, icon: Thermometer, tone: "primary", hint: String(data?.weather_telemetry?.condition ?? "—"), format: (v) => (temp != null ? v.toFixed(1) : "—") },
  ];
}

function KPICard({ kpi, index }: { kpi: KPI; index: number }) {
  const v = useCountUp(kpi.value, 1600, 200 + index * 90);
  const tone = TONES[kpi.tone];
  const Icon = kpi.icon;
  const positive = kpi.delta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="glass group relative overflow-hidden rounded-2xl p-4 transition-shadow"
      style={{ boxShadow: "0 20px 60px -30px oklch(0 0 0 / 0.8)" }}
    >
      {/* Hover glow */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br ${tone.bg} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
      />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] ${tone.text}`}>
              <Icon className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 truncate font-mono text-[10px] tracking-widest text-muted-foreground">
              {kpi.label.toUpperCase()}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <div className="font-mono text-3xl font-bold tracking-tight tabular-nums text-foreground">
              {kpi.format ? kpi.format(v) : Math.round(v)}
              {kpi.suffix ?? ""}
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            <span
              className={`rounded-md px-1.5 py-0.5 font-mono ${
                positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              }`}
            >
              {positive ? "▲" : "▼"} {Math.abs(kpi.delta)}%
            </span>
            <span className="truncate text-muted-foreground">{kpi.hint}</span>
          </div>
        </div>
      </div>

      {/* mini sparkline */}
      <svg viewBox="0 0 120 30" className="mt-3 h-8 w-full opacity-80">
        <defs>
          <linearGradient id={`spark-${index}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={tone.ring} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        {(() => {
          const seed = index * 7 + 3;
          const points = Array.from({ length: 24 }, (_, i) => {
            const y = 15 + Math.sin((i + seed) * 0.6) * 6 + Math.cos((i + seed) * 0.3) * 3;
            return `${(i / 23) * 120},${y}`;
          });
          const path = `M ${points.join(" L ")}`;
          return (
            <>
              <motion.path
                d={`${path} L 120,30 L 0,30 Z`}
                fill={`url(#spark-${index})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ duration: 1.2, delay: 0.3 + index * 0.08 }}
              />
              <motion.path
                d={path}
                fill="none"
                stroke={tone.ring}
                strokeWidth={1.2}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.2 + index * 0.08, ease: "easeOut" }}
              />
            </>
          );
        })()}
      </svg>
    </motion.div>
  );
}

export function KPIGrid() {
  const KPIS = useLiveKPIs();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {KPIS.map((k, i) => (
        <KPICard key={k.label} kpi={k} index={i} />
      ))}
    </div>
  );
}