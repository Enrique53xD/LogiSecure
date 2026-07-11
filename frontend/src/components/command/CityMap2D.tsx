import { useEffect, useRef, useState } from "react";
import { useLogisecure } from "@/hooks/useLogisecure";
import { LOGISECURE_LOCATIONS, LOCATION_LABELS, type LogisecureLocation } from "@/lib/logisecure-api";
import { ChevronDown, X, Plane, Ship } from "lucide-react";
import "leaflet/dist/leaflet.css";

const HQ_COORDS: Record<LogisecureLocation, { lat: number; lng: number }> = {
  roterdam: { lat: 51.9225, lng: 4.4791 },
  houston: { lat: 29.7604, lng: -95.3698 },
  sao_paulo: { lat: -23.5505, lng: -46.6333 },
  shanghai: { lat: 31.2304, lng: 121.4737 },
};

type SelectedItem = { kind: "air"; data: any } | { kind: "sea"; data: any } | null;

export function CityMap2D() {
  const { data, location, setLocation, backendOnline } = useLogisecure();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const leafletRef = useRef<any>(null);
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const air = data?.air_traffic?.flights ?? [];
  const sea = data?.maritime_traffic?.data?.container_liners ?? [];

  // Leaflet ko sirf browser mein dynamically import karein (SSR crash fix)
  // Marker cluster HATA DI GAYI — woh "L is not defined" crash de rahi thi
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((leafletModule) => {
      if (cancelled) return;
      leafletRef.current = leafletModule.default;
      setMapReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Map initialize — sirf ek baar
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current) return;
    const L = leafletRef.current;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      minZoom: 2,
      worldCopyJump: true,
    }).setView([HQ_COORDS[location].lat, HQ_COORDS[location].lng], 6);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    const ensureSize = () => map.invalidateSize();
    requestAnimationFrame(ensureSize);
    const sizeTimer = setTimeout(ensureSize, 300);
    const resizeObserver = new ResizeObserver(ensureSize);
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      clearTimeout(sizeTimer);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [mapReady]);

  // Location badlay to camera fly kare
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo([HQ_COORDS[location].lat, HQ_COORDS[location].lng], 6, { duration: 1.2 });
    }
  }, [location]);

  function planeDivIcon() {
    const L = leafletRef.current;
    return L.divIcon({
      html: `<svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff" style="filter: drop-shadow(0 0 3px rgba(0,0,0,0.9));">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>`,
      className: "",
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  function shipDivIcon() {
    const L = leafletRef.current;
    return L.divIcon({
      html: `<svg width="22" height="22" viewBox="0 0 24 24" fill="#22d3ee" style="filter: drop-shadow(0 0 3px rgba(0,0,0,0.9));">
        <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.64 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.53 4-1.68 1.98 1.29 5.02 1.29 6.99.01L15 17.34c1 1.14 2.4 1.66 4 1.66h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L18 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-2.28.42a.994.994 0 0 0-.66 1.28L3.95 19zM6 6h12v3.97L12 8.65l-6 1.32V6z"/>
      </svg>`,
      className: "",
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

 // Markers update — SEEDHE map pe add hote hain, koi clustering nahi
 useEffect(() => {
  const map = mapRef.current;
  const L = leafletRef.current;
  console.log("MARKER EFFECT RAN:", { map: !!map, L: !!L, airCount: air.length, seaCount: sea.length });
  if (!map || !L) return;


    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    
console.log("First air entry:", air[0]);
air.forEach((f: any) => {
  // Backend kabhi "lat/lng" deta hai, kabhi "latitude/longitude" —
  // dono support kar rahe hain taake dono format chal sakein
  const lat = typeof f.lat === "number" ? f.lat : f.latitude;
  const lng = typeof f.lng === "number" ? f.lng : f.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") return;

  const marker = L.marker([lat, lng], { icon: planeDivIcon() }).addTo(map);
  marker.on("click", () => setSelected({ kind: "air", data: { ...f, lat, lng, altitude: f.altitude ?? f.baro_altitude } }));
  markersRef.current.push(marker);
});

sea.forEach((s: any) => {
  const lat = typeof s.lat === "number" ? s.lat : s.latitude;
  const lng = typeof s.lng === "number" ? s.lng : s.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") return;

  const marker = L.marker([lat, lng], { icon: shipDivIcon() }).addTo(map);
  marker.on("click", () => setSelected({ kind: "sea", data: { ...s, lat, lng } }));
  markersRef.current.push(marker);
});
  }, [air, sea, mapReady]);

  const selectCity = (loc: LogisecureLocation) => {
    setLocation(loc);
    setDropdownOpen(false);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      <div className="absolute top-4 left-4 z-[1000] w-56">
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-sm text-white backdrop-blur-md"
        >
          <span>{LOCATION_LABELS[location]}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div className="mt-1 overflow-hidden rounded-lg border border-white/10 bg-black/90 backdrop-blur-md">
            {LOGISECURE_LOCATIONS.map((loc) => (
              <div
                key={loc}
                onClick={() => selectCity(loc)}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-white/10 ${
                  loc === location ? "bg-white/5 text-primary" : "text-white"
                }`}
              >
                {LOCATION_LABELS[loc]}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 z-[1000] font-mono text-[10px] tracking-widest text-muted-foreground">
        {backendOnline ? "LIVE" : "OFFLINE"} · {air.length} AIR · {sea.length} SEA
      </div>

      <div ref={mapContainerRef} className="h-full w-full" style={{ background: "#0a0e17" }} />

      {!mapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
          Loading map...
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-primary/30 bg-black/90 p-5 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-primary">
                {selected.kind === "air" ? <Plane className="h-4 w-4" /> : <Ship className="h-4 w-4" />}
                {selected.kind === "air" ? "AIR COURIER" : "MARITIME LINER"}
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {selected.kind === "air" && (
              <div className="mt-3 space-y-2">
                <div className="text-xl font-semibold">{selected.data.callsign}</div>
                <div className="text-sm text-muted-foreground">Origin: {selected.data.origin ?? "Unknown"}</div>
                <div className="text-sm text-muted-foreground">
                  Position: {selected.data.lat?.toFixed(2)}, {selected.data.lng?.toFixed(2)}
                </div>
                {selected.data.altitude != null && (
                  <div className="text-sm text-muted-foreground">Altitude: {Math.round(selected.data.altitude)}m</div>
                )}
                {selected.data.velocity != null && (
                  <div className="text-sm text-muted-foreground">Speed: {selected.data.velocity} m/s</div>
                )}
                <div className="text-sm text-muted-foreground">
                  Status: {selected.data.on_ground ? "On ground" : "In flight"}
                </div>
              </div>
            )}

            {selected.kind === "sea" && (
              <div className="mt-3 space-y-2">
                <div className="text-xl font-semibold">{selected.data.callsign ?? selected.data.name}</div>
                <div className="text-sm text-muted-foreground">MMSI: {selected.data.id}</div>
                <div className="text-sm text-muted-foreground">
                  Position: {selected.data.lat?.toFixed(2)}, {selected.data.lng?.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}