import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  fetchDashboardSync,
  LOGISECURE_LOCATIONS,
  type DashboardSync,
  type LogisecureLocation,
  type ThreatEvent,
  threatEventKey,
} from "@/lib/logisecure-api";

type Ctx = {
  location: LogisecureLocation;
  setLocation: (l: LogisecureLocation) => void;
  data: DashboardSync | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  backendOnline: boolean;
  fetchedAt: number | undefined;
  refetch: () => void;
  /** Threat events that arrived on the most recent poll (not present previously). */
  newEvents: ThreatEvent[];
  /** Persistently dismissed event keys. */
  dismissedKeys: Set<string>;
  dismissEvent: (key: string) => void;
};

const LogisecureContext = createContext<Ctx | null>(null);

const LOCATION_STORAGE = "logisecure.location";
const DISMISSED_STORAGE = "logisecure.dismissedEvents";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISSED_STORAGE);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(s: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISSED_STORAGE, JSON.stringify([...s]));
}

export function LogisecureProvider({ children }: { children: ReactNode }) {
  // 🔧 FIX 1: Pehle yahan `typeof window === "undefined"` check tha jo
  // server pe hamesha "roterdam" deta tha, lekin client pe localStorage se
  // koi aur value (jaise "sao_paulo") mil sakti thi — isi mismatch se
  // hydration error aa raha tha ("+ São Paulo / - Rotterdam").
  // Ab hum HAMESHA "roterdam" se shuru karte hain (server aur client dono
  // match karenge), aur localStorage sirf useEffect ke andar (client-only) check karte hain.
  const [location, setLocationState] = useState<LogisecureLocation>("roterdam");

  const setLocation = (l: LogisecureLocation) => {
    setLocationState(l);
    if (typeof window !== "undefined")
      window.localStorage.setItem(LOCATION_STORAGE, l);
  };

  const [seenKeys, setSeenKeys] = useState<Set<string>>(() => new Set());
  const [newEvents, setNewEvents] = useState<ThreatEvent[]>([]);

  // 🔧 FIX 2: Yahan bhi wahi masla tha — `readDismissed()` seedha
  // useState ke andar call ho raha tha, jo initial render pe hi
  // localStorage check kar leta tha. Ab hum khaali Set() se shuru
  // karte hain (server aur client match), aur asal saved values
  // sirf useEffect (client-only) mein load karte hain.
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  // 🔧 FIX 3 (naya useEffect): Yeh sirf browser mount hone ke BAAD chalta
  // hai — is waqt tak hydration already safely complete ho chuki hoti hai.
  // Yahan hum asal saved location aur dismissed events client-side load
  // karte hain, is se UI turant "sahi" state mein update ho jata hai
  // bina hydration ko todhe.
  useEffect(() => {
    const savedLocation = window.localStorage.getItem(
      LOCATION_STORAGE,
    ) as LogisecureLocation | null;
    if (savedLocation && LOGISECURE_LOCATIONS.includes(savedLocation)) {
      setLocationState(savedLocation);
    }
    setDismissedKeys(readDismissed());
  }, []);

  const query = useQuery({
    queryKey: ["logisecure", "sync", location],
    queryFn: ({ signal }) => fetchDashboardSync(location, signal),
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    staleTime: 25_000,
    retry: 1,
  });

  // Detect newly-arrived events (compared to previously seen).
  useEffect(() => {
    const events = query.data?.geopolitical_threats?.events ?? [];
    if (!events.length) return;
    const arrivedNew: ThreatEvent[] = [];
    const nextSeen = new Set(seenKeys);
    for (const e of events) {
      const key = threatEventKey(e);
      if (!nextSeen.has(key)) {
        nextSeen.add(key);
        if (seenKeys.size > 0 && !dismissedKeys.has(key)) {
          // Only surface as "new" after the first successful poll; the
          // first poll seeds seenKeys silently so we don't spam on mount.
          arrivedNew.push(e);
        }
      }
    }
    if (arrivedNew.length) setNewEvents((prev) => [...arrivedNew, ...prev].slice(0, 20));
    if (nextSeen.size !== seenKeys.size) setSeenKeys(nextSeen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  // Reset seen set when the location changes so we re-seed silently.
  useEffect(() => {
    setSeenKeys(new Set());
    setNewEvents([]);
  }, [location]);

  const dismissEvent = (key: string) => {
    setDismissedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      writeDismissed(next);
      return next;
    });
    setNewEvents((prev) => prev.filter((e) => threatEventKey(e) !== key));
  };

  const value = useMemo<Ctx>(
    () => ({
      location,
      setLocation,
      data: query.data,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      error: query.error,
      backendOnline: !query.error && query.data != null,
      fetchedAt: query.dataUpdatedAt,
      refetch: () => query.refetch(),
      newEvents: newEvents.filter((e) => !dismissedKeys.has(threatEventKey(e))),
      dismissedKeys,
      dismissEvent,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location, query.data, query.isLoading, query.isFetching, query.error, query.dataUpdatedAt, newEvents, dismissedKeys],
  );

  return (
    <LogisecureContext.Provider value={value}>
      {children}
    </LogisecureContext.Provider>
  );
}

export function useLogisecure(): Ctx {
  const ctx = useContext(LogisecureContext);
  if (!ctx) throw new Error("useLogisecure must be used within LogisecureProvider");
  return ctx;
}