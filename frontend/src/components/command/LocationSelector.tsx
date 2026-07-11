import { MapPin, Wifi, WifiOff, Loader2, Settings2 } from "lucide-react";
import { useState } from "react";
import {
  LOCATION_LABELS,
  LOGISECURE_LOCATIONS,
  getBaseUrl,
  setBaseUrl,
  type LogisecureLocation,
} from "@/lib/logisecure-api";
import { useLogisecure } from "@/hooks/useLogisecure";

export function LocationSelector() {
  const { location, setLocation, backendOnline, isFetching, isLoading } =
    useLogisecure();
  const [showConfig, setShowConfig] = useState(false);
  const [urlDraft, setUrlDraft] = useState(getBaseUrl());

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5">
        <MapPin className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
          HQ
        </span>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value as LogisecureLocation)}
          className="bg-transparent font-mono text-xs font-bold text-foreground focus:outline-none"
          aria-label="Select HQ location"
        >
          {LOGISECURE_LOCATIONS.map((l) => (
            <option key={l} value={l} className="bg-black">
              {LOCATION_LABELS[l].toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${
          backendOnline
            ? "border-success/30 bg-success/5"
            : isLoading
              ? "border-white/5 bg-white/[0.03]"
              : "border-destructive/40 bg-destructive/10"
        }`}
        title={backendOnline ? "Backend online" : "Backend unreachable"}
      >
        {isFetching ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : backendOnline ? (
          <Wifi className="h-3.5 w-3.5 text-success" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-destructive" />
        )}
        <span
          className={`font-mono text-[10px] tracking-widest ${
            backendOnline
              ? "text-success"
              : isLoading
                ? "text-muted-foreground"
                : "text-destructive"
          }`}
        >
          {backendOnline
            ? "BACKEND LIVE"
            : isLoading
              ? "CONNECTING…"
              : "BACKEND OFFLINE"}
        </span>
        <button
          onClick={() => setShowConfig((v) => !v)}
          aria-label="Configure backend URL"
          className="ml-1 grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="h-3 w-3" />
        </button>
      </div>

      {showConfig && (
        <div className="glass-strong absolute top-16 right-4 z-50 w-[320px] rounded-xl p-3">
          <div className="mb-2 font-mono text-[10px] tracking-widest text-muted-foreground">
            BACKEND BASE URL
          </div>
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs focus:border-primary/50 focus:outline-none"
            placeholder="http://127.0.0.1:8000"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setShowConfig(false)}
              className="rounded-md px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
            >
              CANCEL
            </button>
            <button
              onClick={() => {
                setBaseUrl(urlDraft);
                setShowConfig(false);
                window.location.reload();
              }}
              className="rounded-md bg-primary/20 px-2 py-1 font-mono text-[10px] text-primary hover:bg-primary/30"
            >
              SAVE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}