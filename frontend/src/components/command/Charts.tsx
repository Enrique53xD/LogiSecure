import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import { useLogisecure } from "@/hooks/useLogisecure";

function TooltipCard({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs">
      <div className="mb-1 font-mono text-[10px] tracking-widest text-muted-foreground">
        {label}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.dataKey}</span>
          <span className="ml-auto font-mono font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ThroughputChart() {
  const { data } = useLogisecure();
  const airBase = data?.air_traffic?.flights?.length ?? 12;
  const seaBase = data?.maritime_traffic?.data?.container_liners?.length ?? 8;
  const groundBase =
    data?.land_traffic?.data?.total_active ??
    data?.land_traffic?.data?.active_land_shipments?.length ??
    6;

  const throughput = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        h: `${i.toString().padStart(2, "0")}:00`,
        air: Math.max(1, Math.round(airBase * (0.65 + Math.sin(i * 0.45) * 0.2 + i / 48))),
        sea: Math.max(1, Math.round(seaBase * (0.7 + Math.cos(i * 0.35) * 0.15 + i / 60))),
        ground: Math.max(1, Math.round(groundBase * (0.75 + Math.sin(i * 0.3 + 1) * 0.18))),
      })),
    [airBase, seaBase, groundBase],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="glass rounded-2xl p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
            NETWORK THROUGHPUT · 24H
          </div>
          <div className="mt-1 text-sm font-semibold">Shipments per hour</div>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          {[
            { c: "oklch(0.78 0.18 220)", l: "Air" },
            { c: "oklch(0.82 0.15 205)", l: "Sea" },
            { c: "oklch(0.82 0.16 75)", l: "Ground" },
          ].map((x) => (
            <div key={x.l} className="flex items-center gap-1 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: x.c }} />
              {x.l}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={throughput} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gAir" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.78 0.18 220)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="oklch(0.78 0.18 220)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gSea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.82 0.15 205)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="oklch(0.82 0.15 205)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gGround" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.82 0.16 75)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="oklch(0.82 0.16 75)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
            <XAxis dataKey="h" tick={{ fill: "oklch(0.68 0.02 250)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fill: "oklch(0.68 0.02 250)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <Tooltip content={<TooltipCard />} cursor={{ stroke: "oklch(0.78 0.18 220 / 0.3)" }} />
            <Area type="monotone" dataKey="ground" stroke="oklch(0.82 0.16 75)" strokeWidth={1.5} fill="url(#gGround)" isAnimationActive animationDuration={1400} />
            <Area type="monotone" dataKey="air" stroke="oklch(0.78 0.18 220)" strokeWidth={1.8} fill="url(#gAir)" isAnimationActive animationDuration={1400} />
            <Area type="monotone" dataKey="sea" stroke="oklch(0.82 0.15 205)" strokeWidth={1.5} fill="url(#gSea)" isAnimationActive animationDuration={1400} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export function RegionChart() {
  const { data } = useLogisecure();
  const air = data?.air_traffic?.flights?.length ?? 0;
  const sea = data?.maritime_traffic?.data?.container_liners?.length ?? 0;
  const land =
    data?.land_traffic?.data?.total_active ??
    data?.land_traffic?.data?.active_land_shipments?.length ??
    0;
  const threatLevel = (data?.geopolitical_threats?.summary?.threat_level ?? "LOW").toString();
  const threatPenalty =
    threatLevel === "CRITICAL" ? 22 : threatLevel === "HIGH" ? 14 : threatLevel === "MEDIUM" ? 8 : 0;

  const regions = useMemo(
    () => [
      { r: "AIR", v: Math.min(100, 55 + air * 2 - threatPenalty) },
      { r: "SEA", v: Math.min(100, 50 + sea * 2 - threatPenalty) },
      { r: "LAND", v: Math.min(100, 58 + land * 4 - threatPenalty) },
      { r: "OPS", v: Math.min(100, 92 - threatPenalty) },
      { r: "RISK", v: Math.max(20, 100 - threatPenalty * 2) },
    ],
    [air, sea, land, threatPenalty],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass rounded-2xl p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
            REGIONAL HEALTH INDEX
          </div>
          <div className="mt-1 text-sm font-semibold">On-time performance by region</div>
        </div>
      </div>
      <div className="mt-3 h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={regions} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barSize={22}>
            <defs>
              <linearGradient id="gBar" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.82 0.15 205)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="oklch(0.55 0.2 235)" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
            <XAxis dataKey="r" tick={{ fill: "oklch(0.68 0.02 250)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "oklch(0.68 0.02 250)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip content={<TooltipCard />} cursor={{ fill: "oklch(1 0 0 / 0.04)" }} />
            <Bar dataKey="v" fill="url(#gBar)" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={1200} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}