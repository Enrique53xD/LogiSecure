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

const THROUGHPUT = Array.from({ length: 24 }, (_, i) => ({
  h: `${i.toString().padStart(2, "0")}:00`,
  air: 220 + Math.round(Math.sin(i * 0.5) * 40 + Math.random() * 30),
  sea: 140 + Math.round(Math.cos(i * 0.4) * 30 + Math.random() * 20),
  ground: 300 + Math.round(Math.sin(i * 0.3 + 1) * 60 + Math.random() * 40),
}));

const REGIONS = [
  { r: "NA", v: 92 },
  { r: "EU", v: 88 },
  { r: "APAC", v: 76 },
  { r: "LATAM", v: 81 },
  { r: "MEA", v: 69 },
  { r: "OCE", v: 85 },
];

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
          <AreaChart data={THROUGHPUT} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
          <BarChart data={REGIONS} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barSize={22}>
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