import { motion } from "framer-motion";
import { Plane, Ship, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { useLogisecure } from "@/hooks/useLogisecure";
import type { FleetTypeFilter } from "@/lib/dashboard-sections";

type Row = {
  id: string;
  type: "air" | "sea" | "ground";
  origin: string;
  dest: string;
  eta: string;
  progress: number;
  status: "On time" | "Delayed" | "Critical" | "Rerouted";
};

const ICONS: Record<Row["type"], LucideIcon> = { air: Plane, sea: Ship, ground: Truck };

const STATUS_STYLES: Record<Row["status"], string> = {
  "On time": "bg-success/15 text-success",
  Delayed: "bg-amber/15 text-amber",
  Critical: "bg-destructive/15 text-destructive",
  Rerouted: "bg-primary/15 text-primary",
};

function coordLabel(lat?: number, lng?: number) {
  if (lat == null || lng == null) return "—";
  return `${lat.toFixed(1)},${lng.toFixed(1)}`;
}

function mapLandStatus(status?: string): Row["status"] {
  if (status === "delayed") return "Delayed";
  if (status === "pending") return "Rerouted";
  return "On time";
}

export function FleetTable({ typeFilter = "all" }: { typeFilter?: FleetTypeFilter }) {
  const { data } = useLogisecure();

  const rows = useMemo<Row[]>(() => {
    const built: Row[] = [];

    if (typeFilter === "all" || typeFilter === "air") {
      for (const flight of data?.air_traffic?.flights?.slice(0, 3) ?? []) {
        built.push({
          id: flight.callsign || "AIR",
          type: "air",
          origin: coordLabel(flight.lat, flight.lng),
          dest: flight.origin || "en-route",
          eta: "live",
          progress: flight.on_ground ? 12 : 48,
          status: flight.on_ground ? "Delayed" : "On time",
        });
      }
    }

    if (typeFilter === "all" || typeFilter === "sea") {
      for (const vessel of data?.maritime_traffic?.data?.container_liners?.slice(0, 3) ?? []) {
        built.push({
          id: vessel.id || "SEA",
          type: "sea",
          origin: coordLabel(vessel.lat, vessel.lng),
          dest: vessel.destination || "open-sea",
          eta: "t+18h",
          progress: 41,
          status: "On time",
        });
      }
    }

    if (typeFilter === "all" || typeFilter === "ground") {
      for (const shipment of data?.land_traffic?.data?.active_land_shipments?.slice(0, 4) ?? []) {
        built.push({
          id: String(shipment.id ?? "LAND"),
          type: "ground",
          origin: coordLabel(shipment.lat, shipment.lng),
          dest: coordLabel(
            shipment.destination_lat as number | undefined,
            shipment.destination_lng as number | undefined,
          ),
          eta: "t+6h",
          progress: shipment.status === "in_transit" ? 72 : 28,
          status: mapLandStatus(String(shipment.status ?? "")),
        });
      }
    }

    return built.slice(0, 8);
  }, [data, typeFilter]);

  const filterLabel =
    typeFilter === "air"
      ? "AIR ONLY"
      : typeFilter === "sea"
        ? "MARITIME ONLY"
        : typeFilter === "ground"
          ? "GROUND ONLY"
          : "ALL MODES";

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
          <div className="mt-1 font-mono text-[9px] tracking-widest text-primary">{filterLabel}</div>
        </div>
        <button className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1 font-mono text-[10px] tracking-widest text-muted-foreground transition-colors hover:text-foreground">
          VIEW ALL ({rows.length})
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
        {rows.length === 0 ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">
            {typeFilter === "all"
              ? "Waiting for live fleet data…"
              : `No ${typeFilter} assets in range for this HQ.`}
          </div>
        ) : (
          rows.map((r, i) => {
            const Icon = ICONS[r.type];
            return (
              <motion.div
                key={`${r.id}-${i}`}
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
          })
        )}
      </div>
    </motion.div>
  );
}
