import { motion } from "framer-motion";
import { Cloud, Droplets, Thermometer, Wind } from "lucide-react";
import { useLogisecure } from "@/hooks/useLogisecure";
import { LOCATION_LABELS } from "@/lib/logisecure-api";

export function WeatherWidget() {
  const { data, location, isLoading, backendOnline } = useLogisecure();
  const w = data?.weather_telemetry;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-2xl p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-primary">
            <Cloud className="h-3 w-3" />
            WEATHER · {LOCATION_LABELS[location].toUpperCase()}
          </div>
          <div className="mt-1 text-sm font-semibold">
            {w?.condition ?? (isLoading ? "…" : backendOnline ? "—" : "Offline")}
          </div>
        </div>
        <div className="font-mono text-3xl font-bold tabular-nums text-foreground">
          {w?.temperature != null ? `${Math.round(Number(w.temperature))}°` : "—"}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metric icon={<Thermometer className="h-3 w-3" />} label="TEMP">
          {w?.temperature != null ? `${Number(w.temperature).toFixed(1)}°C` : "—"}
        </Metric>
        <Metric icon={<Wind className="h-3 w-3" />} label="WIND">
          {w?.wind_speed != null ? `${Number(w.wind_speed).toFixed(1)}` : "—"}
          <span className="ml-0.5 text-[9px] text-muted-foreground">m/s</span>
        </Metric>
        <Metric icon={<Droplets className="h-3 w-3" />} label="HUM">
          {w?.humidity != null ? `${Math.round(Number(w.humidity))}%` : "—"}
        </Metric>
      </div>
    </motion.div>
  );
}

function Metric({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
      <div className="flex items-center gap-1 font-mono text-[9px] tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 font-mono text-sm font-bold text-foreground">
        {children}
      </div>
    </div>
  );
}