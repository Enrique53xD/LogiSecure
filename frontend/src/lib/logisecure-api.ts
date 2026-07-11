/**
 * LogiSecure backend API client.
 *
 * Talks to the local FastAPI service (default http://127.0.0.1:8000).
 * Override at runtime via localStorage["logisecure.baseUrl"] or the
 * VITE_LOGISECURE_API env var.
 */

export const LOGISECURE_LOCATIONS = [
  "roterdam",
  "houston",
  "sao_paulo",
  "shanghai",
] as const;

export type LogisecureLocation = (typeof LOGISECURE_LOCATIONS)[number];

export const LOCATION_LABELS: Record<LogisecureLocation, string> = {
  roterdam: "Rotterdam",
  houston: "Houston",
  sao_paulo: "São Paulo",
  shanghai: "Shanghai",
};

export type AirCourier = {
  callsign: string;
  lat: number;
  lng: number;
  origin?: string;        // pehle "origin_country" tha
  altitude?: number | null;   // pehle "baro_altitude" tha
  velocity?: number;
  on_ground?: boolean;
};

export type MaritimeLiner = {
  id: string;
  lat: number;
  lng: number;
  name?: string | null;
  destination?: string | null;
};

export type LandShipment = {
  id?: string;
  lat?: number;
  lng?: number;
  status?: string;
  [k: string]: unknown;
};

export type WeatherTelemetry = {
  temperature?: number | null;
  condition?: string | null;
  wind_speed?: number | null;
  humidity?: number | null;
  [k: string]: unknown;
};

export type ThreatSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;

export type ThreatEvent = {
  event: string;
  severity: ThreatSeverity;
  lat?: number | null;
  lng?: number | null;
  published?: string;
  source?: string;
  link?: string;
  id?: string;
};

export type DashboardSync = {
  location: LogisecureLocation;
  timestamp: number;
  air_traffic?: { flights?: AirCourier[] };
  maritime_traffic?: { data?: { container_liners?: MaritimeLiner[] } };
  land_traffic?: {
    data?: { active_land_shipments?: LandShipment[]; total_active?: number };
  };
  weather_telemetry?: WeatherTelemetry;
  geopolitical_threats?: {
    events?: ThreatEvent[];
    summary?: {
      total_events?: number;
      critical?: number;
      threat_level?: ThreatSeverity;
    };
  };
};

export type ShipmentTracking = {
  tracking_id: string;
  metadata?: Record<string, unknown>;
  tracking_mode?: string;
  display_color?: "green" | "amber" | "red" | string;
  position?: { lat: number; lng: number };
  telemetry?: Record<string, unknown>;
};

const DEFAULT_BASE = "http://127.0.0.1:8000";

export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("logisecure.baseUrl");
    if (stored) return stored.replace(/\/$/, "");
  }
  const env = (import.meta.env.VITE_LOGISECURE_API as string | undefined) ?? "";
  return (env || DEFAULT_BASE).replace(/\/$/, "");
}

export function setBaseUrl(url: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("logisecure.baseUrl", url.replace(/\/$/, ""));
}

export async function fetchDashboardSync(
  location: LogisecureLocation,
  signal?: AbortSignal,
): Promise<DashboardSync> {
  const res = await fetch(
    `${getBaseUrl()}/api/dashboard/sync?hq=${encodeURIComponent(location)}`,
    { signal, headers: { accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Backend responded ${res.status}`);
  return (await res.json()) as DashboardSync;
}

export async function fetchShipment(
  trackingId: string,
  signal?: AbortSignal,
): Promise<ShipmentTracking> {
  const res = await fetch(
    `${getBaseUrl()}/api/shipment/track/${encodeURIComponent(trackingId)}`,
    { signal, headers: { accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Backend responded ${res.status}`);
  return (await res.json()) as ShipmentTracking;
}

/** Stable ID for a threat event, since backend may not provide one. */
export function threatEventKey(e: ThreatEvent): string {
  return e.id ?? `${e.published ?? ""}::${e.event}`;
}

export const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function sortEventsBySeverity(events: ThreatEvent[]): ThreatEvent[] {
  return [...events].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity?.toUpperCase()] ?? 99) -
      (SEVERITY_ORDER[b.severity?.toUpperCase()] ?? 99),
  );
}

export type AgentStatus = {
  status: "ready" | "busy" | "error" | string; // backend jo bhi values bhej sakta hai unko yahan enumerate kar dena behtar hai
  provider: string;      // e.g. "Fireworks AI"
  model: string;         // e.g. "accounts/fireworks/models/llama-v3p1-8b-instruct"
  confidence_threshold: number; // e.g. 0.7
};

export async function fetchAgentStatus(signal?: AbortSignal): Promise<AgentStatus> {
  const res = await fetch(`${getBaseUrl()}/agent-status`, {
    signal,
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`agent-status failed: ${res.status}`);
  return res.json() as Promise<AgentStatus>;
}




export type IncidentInput = {
  type: string;
  location: string;
  severity: string;
  description: string;
  estimated_duration: string;
  affected_assets: string;
};

export type AffectedShipment = { id: string; cargo: string; location: string };
export type AlternativeRoute = { route: string; time: string; priority: "High" | "Medium" | "Low" | string };
export type AgentAlert = { type: string; message: string; timestamp: string };

export type AgentAnalyzeResponse = {
  status: string;
  provider: string;
  analysis: {
    step: number;
    incident_data: IncidentInput;
    affected_shipments: AffectedShipment[];
    impact_analysis: string;
    alternative_routes: AlternativeRoute[];
    execution_plan: {
      gps_updates: string[];
      client_alerts: string[];
      api_calls: string[];
    };
    alerts: AgentAlert[];
    status: string;
    messages: string[];
  };
  summary: string;
};

export async function postAgentAnalyze(
  input: IncidentInput,
  signal?: AbortSignal,
): Promise<AgentAnalyzeResponse> {
  const res = await fetch(`${getBaseUrl()}/agent-analyze`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`agent-analyze failed: ${res.status}`);
  return res.json() as Promise<AgentAnalyzeResponse>;
}