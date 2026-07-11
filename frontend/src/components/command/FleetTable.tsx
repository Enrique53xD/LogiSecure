import { motion } from "framer-motion";
import { Plane, Ship, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Row = {
  id: string;
  type: "air" | "sea" | "ground";
  origin: string;
  dest: string;
  eta: string;
  progress: number;
  status: "On time" | "Delayed" | "Critical" | "Rerouted";
};

const ROWS: Row[] = [
  { id: "AX-1120", type: "air", origin: "JFK", dest: "LHR", eta: "01:42", progress: 62, status: "On time" },
  { id: "MV-MERIDIAN-7", type: "sea", origin: "SIN", dest: "AMS", eta: "18d 04:12", progress: 41, status: "Rerouted" },
  { id: "TR-EU-3821", type: "ground", origin: "BER", dest: "MAD", eta: "22:15", progress: 78, status: "On time" },
  { id: "AX-0442", type: "air", origin: "SFO", dest: "NRT", eta: "07:08", progress: 34, status: "Delayed" },
  { id: "MV-POLARIS", type: "sea", origin: "DXB", dest: "HKG", eta: "6d 12:44", progress: 89, status: "On time" },
  { id: "TR-NA-5502", type: "ground", origin: "LAX", dest: "DFW", eta: "14:22", progress: 12, status: "Critical" },
];

const ICONS: Record<Row["type"], LucideIcon> = { air: Plane, sea: Ship, ground: Truck };

const STATUS_STYLES: Record<Row["status"], string> = {
  "On time": "bg-success/15 text-success",
  Delayed: "bg-amber/15 text-amber",
  Critical: "bg-destructive/15 text-destructive",
  Rerouted: "bg-primary/15 text-primary",
};

export function FleetTable() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="glass overflow-hidden rounded-2xl"
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
            ACTIVE MISSIONS
          </div>
          <div className="mt-0.5 text-sm font-semibold">Priority fleet manifest</div>
        </div>
        <button className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1 font-mono text-[10px] tracking-widest text-muted-foreground transition-colors hover:text-foreground">
          VIEW ALL ({ROWS.length * 42})
        </button>
      </div>
      <div className="grid grid-cols-[110px_1fr_100px_1fr_110px] gap-3 border-t border-white/5 px-5 py-2 font-mono text-[10px] tracking-widest text-muted-foreground">
        <span>ASSET</span>
        <span>ROUTE</span>
        <span>ETA</span>
        <span>PROGRESS</span>
        <span className="text-right">STATUS</span>
      </div>
      <div>
        {ROWS.map((r, i) => {
          const Icon = ICONS[r.type];
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.06, duration: 0.4 }}
              className="group grid grid-cols-[110px_1fr_100px_1fr_110px] items-center gap-3 border-t border-white/5 px-5 py-3 text-sm transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono text-xs">{r.id}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono font-medium text-foreground">{r.origin}</span>
                <span className="text-primary/60">→</span>
                <span className="font-mono font-medium text-foreground">{r.dest}</span>
              </div>
              <div className="font-mono text-xs tabular-nums">{r.eta}</div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, oklch(0.78 0.18 220), oklch(0.82 0.15 205))",
                      boxShadow: "0 0 10px oklch(0.78 0.18 220 / 0.6)",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${r.progress}%` }}
                    transition={{ delay: 0.6 + i * 0.06, duration: 1.2, ease: "easeOut" }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-[10px] text-muted-foreground">
                  {r.progress}%
                </span>
              </div>
              <div className="flex justify-end">
                <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest ${STATUS_STYLES[r.status]}`}>
                  {r.status.toUpperCase()}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}