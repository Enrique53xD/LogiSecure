import { motion } from "framer-motion";
import { Maximize2, Layers, Plane, Ship, Truck, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";

type Point = { x: number; y: number };

// x/y in a 1000 x 500 viewport. Approximate positions of major hubs.
const HUBS: Array<{ id: string; name: string; type: "air" | "sea" | "ground" | "alert"; x: number; y: number }> = [
  { id: "SFO", name: "San Francisco", type: "air", x: 130, y: 195 },
  { id: "JFK", name: "New York", type: "air", x: 265, y: 190 },
  { id: "LHR", name: "London", type: "air", x: 490, y: 165 },
  { id: "AMS", name: "Rotterdam", type: "sea", x: 505, y: 168 },
  { id: "DXB", name: "Dubai", type: "air", x: 625, y: 235 },
  { id: "SIN", name: "Singapore", type: "sea", x: 770, y: 300 },
  { id: "HKG", name: "Hong Kong", type: "air", x: 810, y: 245 },
  { id: "NRT", name: "Tokyo", type: "air", x: 870, y: 210 },
  { id: "SYD", name: "Sydney", type: "sea", x: 880, y: 380 },
  { id: "GRU", name: "São Paulo", type: "ground", x: 335, y: 355 },
  { id: "JNB", name: "Johannesburg", type: "ground", x: 555, y: 370 },
  { id: "TYP", name: "Typhoon HALONG", type: "alert", x: 840, y: 275 },
  { id: "SUZ", name: "Suez Chokepoint", type: "alert", x: 590, y: 220 },
];

const ROUTES: Array<{ from: string; to: string; kind: "air" | "sea" }> = [
  { from: "JFK", to: "LHR", kind: "air" },
  { from: "SFO", to: "NRT", kind: "air" },
  { from: "LHR", to: "DXB", kind: "air" },
  { from: "DXB", to: "SIN", kind: "air" },
  { from: "HKG", to: "SYD", kind: "air" },
  { from: "AMS", to: "SIN", kind: "sea" },
  { from: "SIN", to: "JNB", kind: "sea" },
  { from: "GRU", to: "JNB", kind: "sea" },
  { from: "NRT", to: "SFO", kind: "air" },
];

function arcPath(a: Point, b: Point, curve = 0.28) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const nx = -dy / d;
  const ny = dx / d;
  const cx = mx + nx * d * curve;
  const cy = my + ny * d * curve;
  return { d: `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`, cx, cy };
}

// Generate a dotted "landmass-ish" pattern - abstract world map look.
function useDots() {
  return useMemo(() => {
    // hand-picked pseudo-continent rectangles for the dot mask
    const regions = [
      { x: 60, y: 130, w: 200, h: 130 }, // N America
      { x: 280, y: 250, w: 130, h: 130 }, // S America
      { x: 440, y: 120, w: 100, h: 100 }, // Europe
      { x: 470, y: 220, w: 180, h: 190 }, // Africa
      { x: 560, y: 130, w: 260, h: 130 }, // Asia
      { x: 800, y: 340, w: 130, h: 70 }, // Australia
    ];
    const dots: Array<{ x: number; y: number; r: number; a: number }> = [];
    for (const r of regions) {
      const cols = Math.floor(r.w / 8);
      const rows = Math.floor(r.h / 8);
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = r.x + i * 8 + (j % 2) * 4;
          const y = r.y + j * 8;
          // Feather edges by dropping some points
          const nx = (i / cols - 0.5) * 2;
          const ny = (j / rows - 0.5) * 2;
          const edge = Math.hypot(nx, ny);
          if (Math.random() < 0.15 + edge * 0.5) continue;
          const a = 0.35 + Math.random() * 0.4;
          dots.push({ x, y, r: 1, a });
        }
      }
    }
    return dots;
  }, []);
}

const KIND_COLOR: Record<string, string> = {
  air: "oklch(0.78 0.18 220)",
  sea: "oklch(0.82 0.15 205)",
  ground: "oklch(0.82 0.16 75)",
  alert: "oklch(0.68 0.24 22)",
};

export function WorldMap() {
  const dots = useDots();
  const [hover, setHover] = useState<string | null>(null);
  const hubById = useMemo(() => Object.fromEntries(HUBS.map((h) => [h.id, h])), []);

  return (
    <div className="glass relative h-full overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="absolute top-0 right-0 left-0 z-20 flex items-center justify-between px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="font-mono text-[10px] tracking-widest text-success">LIVE · TELEMETRY</span>
          </div>
          <div className="mt-1 text-lg font-semibold tracking-tight">Global Operations Map</div>
          <div className="text-xs text-muted-foreground">
            13 active hubs · {ROUTES.length} priority corridors · 2 critical zones
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {["24H", "7D", "30D"].map((t, i) => (
            <button
              key={t}
              className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] tracking-widest transition-all ${
                i === 0
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-white/5 bg-white/[0.02] text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
          <button
            className="ml-2 grid h-8 w-8 place-items-center rounded-lg border border-white/5 bg-white/[0.02] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Layers"
          >
            <Layers className="h-4 w-4" />
          </button>
          <button
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/5 bg-white/[0.02] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-black/30 px-3 py-2 backdrop-blur-md">
        {[
          { c: "air", label: "Air", Icon: Plane },
          { c: "sea", label: "Sea", Icon: Ship },
          { c: "ground", label: "Ground", Icon: Truck },
          { c: "alert", label: "Alerts", Icon: AlertTriangle },
        ].map(({ c, label, Icon }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_COLOR[c], boxShadow: `0 0 8px ${KIND_COLOR[c]}` }} />
            <Icon className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground">{label.toUpperCase()}</span>
          </div>
        ))}
      </div>

      {/* Coordinate readout */}
      <div className="absolute right-4 bottom-4 z-20 rounded-xl border border-white/5 bg-black/30 px-3 py-2 font-mono text-[10px] tracking-widest text-muted-foreground backdrop-blur-md">
        LAT <span className="text-foreground">+37.7749</span> · LON <span className="text-foreground">-122.4194</span> · ZOOM <span className="text-foreground">2.4×</span>
      </div>

      {/* Map SVG */}
      <svg viewBox="0 0 1000 500" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.55 0.22 235 / 0.35)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="routeAir" x1="0" x2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.18 220 / 0)" />
            <stop offset="50%" stopColor="oklch(0.78 0.18 220 / 0.9)" />
            <stop offset="100%" stopColor="oklch(0.78 0.18 220 / 0)" />
          </linearGradient>
          <linearGradient id="routeSea" x1="0" x2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.15 205 / 0)" />
            <stop offset="50%" stopColor="oklch(0.82 0.15 205 / 0.9)" />
            <stop offset="100%" stopColor="oklch(0.82 0.15 205 / 0)" />
          </linearGradient>
        </defs>

        {/* Ambient glow */}
        <rect x="0" y="0" width="1000" height="500" fill="url(#glow)" opacity="0.5" />

        {/* Latitude/longitude grid */}
        <g stroke="oklch(0.78 0.18 220 / 0.06)" strokeWidth="0.5">
          {[0, 100, 200, 300, 400].map((y) => (
            <line key={y} x1="0" x2="1000" y1={y + 50} y2={y + 50} />
          ))}
          {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => (
            <line key={x} x1={x} x2={x} y1="0" y2="500" />
          ))}
        </g>

        {/* Continent dots */}
        <g>
          {dots.map((d, i) => (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill="oklch(0.78 0.18 220)"
              opacity={d.a}
            />
          ))}
        </g>

        {/* Routes */}
        {ROUTES.map((r, i) => {
          const a = hubById[r.from];
          const b = hubById[r.to];
          if (!a || !b) return null;
          const { d } = arcPath({ x: a.x, y: a.y }, { x: b.x, y: b.y });
          const isAir = r.kind === "air";
          return (
            <g key={i}>
              <motion.path
                d={d}
                fill="none"
                stroke={isAir ? "url(#routeAir)" : "url(#routeSea)"}
                strokeWidth={1.4}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 2.2, delay: 0.3 + i * 0.15, ease: "easeInOut" }}
                style={{ filter: `drop-shadow(0 0 4px ${isAir ? "oklch(0.78 0.18 220 / 0.6)" : "oklch(0.82 0.15 205 / 0.5)"})` }}
              />
              {/* Traveling dot */}
              <motion.circle
                r={isAir ? 2.5 : 2}
                fill={isAir ? "oklch(0.78 0.18 220)" : "oklch(0.82 0.15 205)"}
                style={{ filter: `drop-shadow(0 0 6px ${isAir ? "oklch(0.78 0.18 220)" : "oklch(0.82 0.15 205)"})` }}
              >
                <animateMotion dur={`${isAir ? 6 : 12}s`} repeatCount="indefinite" begin={`${i * 0.6}s`} path={d} />
              </motion.circle>
            </g>
          );
        })}

        {/* Hubs */}
        {HUBS.map((h, i) => {
          const color = KIND_COLOR[h.type];
          const isAlert = h.type === "alert";
          return (
            <g
              key={h.id}
              onMouseEnter={() => setHover(h.id)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Pulse ring */}
              <motion.circle
                cx={h.x}
                cy={h.y}
                r={4}
                fill="none"
                stroke={color}
                strokeWidth={1}
                initial={{ opacity: 0.9, scale: 0.6 }}
                animate={{ opacity: [0.9, 0], scale: [0.6, 3] }}
                transition={{ duration: isAlert ? 1.6 : 2.6, repeat: Infinity, ease: "easeOut", delay: i * 0.2 }}
                style={{ transformOrigin: `${h.x}px ${h.y}px` }}
              />
              <circle
                cx={h.x}
                cy={h.y}
                r={isAlert ? 4 : 3}
                fill={color}
                style={{ filter: `drop-shadow(0 0 6px ${color})` }}
              />
              <circle cx={h.x} cy={h.y} r={isAlert ? 1.5 : 1} fill="white" opacity={0.95} />

              {/* Tooltip */}
              {hover === h.id && (
                <g>
                  <rect
                    x={h.x + 10}
                    y={h.y - 26}
                    rx="6"
                    ry="6"
                    width={h.name.length * 6.6 + 26}
                    height="22"
                    fill="oklch(0.14 0.03 260 / 0.95)"
                    stroke={color}
                    strokeWidth="0.7"
                  />
                  <text
                    x={h.x + 18}
                    y={h.y - 11}
                    fill="white"
                    fontSize="10"
                    fontFamily="Inter, sans-serif"
                    fontWeight={600}
                  >
                    {h.id} · {h.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Scan line */}
        <motion.line
          x1="0"
          x2="1000"
          stroke="oklch(0.78 0.18 220 / 0.5)"
          strokeWidth="0.8"
          initial={{ y1: 0, y2: 0 }}
          animate={{ y1: [0, 500], y2: [0, 500] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          style={{ filter: "drop-shadow(0 0 6px oklch(0.78 0.18 220))" }}
        />
      </svg>
    </div>
  );
}