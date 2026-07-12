import { z } from "zod";

export const dashboardSearchSchema = z.object({
  section: z
    .enum([
      "overview",
      "map",
      "air",
      "maritime",
      "ground",
      "telemetry",
      "alerts",
      "streams",
    ])
    .optional(),
});

export type DashboardSection = NonNullable<
  z.infer<typeof dashboardSearchSchema>["section"]
>;

export type MapLayerFilter = "all" | "air" | "sea";
export type FleetTypeFilter = "all" | "air" | "sea" | "ground";

export const SECTION_TARGETS: Record<DashboardSection, string> = {
  overview: "section-overview",
  map: "section-operations",
  air: "section-operations",
  maritime: "section-operations",
  ground: "section-fleet",
  telemetry: "section-telemetry",
  alerts: "section-alerts",
  streams: "section-streams",
};

export function mapFilterForSection(
  section?: DashboardSection,
): MapLayerFilter {
  if (section === "air") return "air";
  if (section === "maritime") return "sea";
  return "all";
}

export function fleetFilterForSection(
  section?: DashboardSection,
): FleetTypeFilter {
  if (section === "air") return "air";
  if (section === "maritime") return "sea";
  if (section === "ground") return "ground";
  return "all";
}

export function scrollToDashboardSection(section: DashboardSection) {
  const id = SECTION_TARGETS[section];
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}
