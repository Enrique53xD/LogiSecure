import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCoords } from "./airport-coords";

/**
 * LogiSecure live data server functions.
 * - Aviationstack (real global commercial flight schedules, free tier)
 * - Newsdata.io (real global news feed for logistics/security alerts)
 *
 * Server-side only: API keys stay on the server. Client calls via useQuery.
 */

export type LiveFlight = {
  id: string;
  callsign: string;
  airline: string | null;
  status: string;
  from: string | null;
  to: string | null;
  fromName: string | null;
  toName: string | null;
  fromCoord: [number, number] | null;
  toCoord: [number, number] | null;
  // Position interpolated along the great-circle route using scheduled times.
  position: [number, number] | null;
  progress: number; // 0..1
  delay: number | null;
};

function greatCircleAt(
  a: [number, number],
  b: [number, number],
  t: number,
): [number, number] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a[0]);
  const lon1 = toRad(a[1]);
  const lat2 = toRad(b[0]);
  const lon2 = toRad(b[1]);
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
      ),
    );
  if (d === 0) return a;
  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
  const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);
  return [toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))];
}

export const getLiveFlights = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({ limit: z.number().min(1).max(100).optional() })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const key = process.env.AVIATIONSTACK_API_KEY;
    if (!key) throw new Error("AVIATIONSTACK_API_KEY not configured");
    const limit = data.limit ?? 100;
    // Free tier is HTTP only.
    const url = `http://api.aviationstack.com/v1/flights?access_key=${key}&flight_status=active&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Aviationstack ${res.status}`);
    const json = (await res.json()) as {
      data?: Array<{
        flight_status?: string;
        departure?: {
          airport?: string | null;
          iata?: string | null;
          scheduled?: string | null;
          estimated?: string | null;
          actual?: string | null;
          delay?: number | null;
        };
        arrival?: {
          airport?: string | null;
          iata?: string | null;
          scheduled?: string | null;
          estimated?: string | null;
          delay?: number | null;
        };
        airline?: { name?: string | null };
        flight?: { iata?: string | null; icao?: string | null; number?: string | null };
        live?: {
          latitude?: number | null;
          longitude?: number | null;
          altitude?: number | null;
          speed_horizontal?: number | null;
        } | null;
      }>;
    };
    const now = Date.now();
    const flights: LiveFlight[] = [];
    for (const f of json.data ?? []) {
      const from = f.departure?.iata ?? null;
      const to = f.arrival?.iata ?? null;
      const fromCoord = getCoords(from);
      const toCoord = getCoords(to);
      let position: [number, number] | null = null;
      let progress = 0;
      if (f.live?.latitude != null && f.live.longitude != null) {
        position = [f.live.latitude, f.live.longitude];
      } else if (fromCoord && toCoord) {
        const depTs = Date.parse(
          f.departure?.actual ?? f.departure?.estimated ?? f.departure?.scheduled ?? "",
        );
        const arrTs = Date.parse(
          f.arrival?.estimated ?? f.arrival?.scheduled ?? "",
        );
        if (Number.isFinite(depTs) && Number.isFinite(arrTs) && arrTs > depTs) {
          progress = Math.max(0, Math.min(1, (now - depTs) / (arrTs - depTs)));
        } else {
          progress = Math.random() * 0.6 + 0.2;
        }
        position = greatCircleAt(fromCoord, toCoord, progress);
      }
      if (!position || !fromCoord || !toCoord) continue;
      flights.push({
        id: `${f.flight?.iata ?? f.flight?.icao ?? Math.random().toString(36).slice(2)}-${from}-${to}`,
        callsign: f.flight?.iata ?? f.flight?.number ?? "—",
        airline: f.airline?.name ?? null,
        status: f.flight_status ?? "active",
        from,
        to,
        fromName: f.departure?.airport ?? null,
        toName: f.arrival?.airport ?? null,
        fromCoord,
        toCoord,
        position,
        progress,
        delay: f.departure?.delay ?? f.arrival?.delay ?? null,
      });
    }
    return { flights, fetchedAt: new Date().toISOString(), totalActive: json.data?.length ?? 0 };
  });

export type GlobalAlert = {
  id: string;
  title: string;
  description: string | null;
  link: string;
  source: string;
  sourceIcon: string | null;
  country: string[];
  category: string[];
  publishedAt: string;
  image: string | null;
};

export const getGlobalAlerts = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        q: z.string().max(200).optional(),
        category: z
          .enum([
            "business",
            "world",
            "politics",
            "top",
            "environment",
            "technology",
            "other",
          ])
          .optional(),
        country: z.string().max(6).optional(),
        language: z.string().max(6).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const key = process.env.NEWSDATA_API_KEY;
    if (!key) throw new Error("NEWSDATA_API_KEY not configured");
    const params = new URLSearchParams({ apikey: key, language: data.language ?? "en", size: "10" });
    const q =
      data.q ??
      "logistics OR shipping OR port OR aviation OR supply chain OR strike OR customs";
    params.set("q", q);
    if (data.category) params.set("category", data.category);
    if (data.country) params.set("country", data.country);
    const res = await fetch(`https://newsdata.io/api/1/latest?${params.toString()}`);
    if (!res.ok) throw new Error(`Newsdata ${res.status}`);
    const json = (await res.json()) as {
      results?: Array<{
        article_id: string;
        title: string;
        description: string | null;
        link: string;
        source_id: string;
        source_icon: string | null;
        country?: string[];
        category?: string[];
        pubDate: string;
        image_url: string | null;
      }>;
    };
    const alerts: GlobalAlert[] = (json.results ?? []).map((r) => ({
      id: r.article_id,
      title: r.title,
      description: r.description,
      link: r.link,
      source: r.source_id,
      sourceIcon: r.source_icon,
      country: r.country ?? [],
      category: r.category ?? [],
      publishedAt: r.pubDate,
      image: r.image_url,
    }));
    return { alerts, fetchedAt: new Date().toISOString() };
  });