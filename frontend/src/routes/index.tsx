import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AnimatedBackground } from "@/components/command/AnimatedBackground";
import { Sidebar } from "@/components/command/Sidebar";
import { TopBar } from "@/components/command/TopBar";
import { KPIGrid } from "@/components/command/KPIGrid";
import { CityMap2D } from "@/components/command/CityMap2D";
import { AIPanel } from "@/components/command/AIPanel";
import { GlobalAlerts } from "@/components/command/GlobalAlerts";
import { ThroughputChart, RegionChart } from "@/components/command/Charts";
import { FleetTable } from "@/components/command/FleetTable";
import { Notifications } from "@/components/command/Notifications";
import { LoadingScreen } from "@/components/command/LoadingScreen";
import { WeatherWidget } from "@/components/command/WeatherWidget";
import { LogisecureProvider } from "@/hooks/useLogisecure";
import {
  dashboardSearchSchema,
  fleetFilterForSection,
  mapFilterForSection,
  scrollToDashboardSection,
  type DashboardSection,
} from "@/lib/dashboard-sections";

export const Route = createFileRoute("/")({
  validateSearch: dashboardSearchSchema,
  component: Index,
});

function sectionHighlight(active: DashboardSection | undefined, target: DashboardSection) {
  return active === target ? "ring-2 ring-primary/35 ring-offset-2 ring-offset-background" : "";
}

function Index() {
  const [ready, setReady] = useState(false);
  const { section } = Route.useSearch();
  const activeSection = section ?? "overview";
  const mapFilter = mapFilterForSection(section);
  const fleetFilter = fleetFilterForSection(section);

  useEffect(() => {
    if (!ready || !section) return;
    const timer = window.setTimeout(() => scrollToDashboardSection(section), 120);
    return () => window.clearTimeout(timer);
  }, [ready, section]);

  return (
    <LogisecureProvider>
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <AnimatePresence>
        {!ready && <LoadingScreen key="loader" onDone={() => setReady(true)} />}
      </AnimatePresence>

      {ready && <Notifications />}

      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 12 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex min-h-screen w-full max-w-[1800px] gap-3 p-3 lg:p-4"
      >
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <TopBar />

          <section
            id="section-overview"
            aria-label="Fleet KPIs"
            className={`scroll-mt-28 rounded-2xl transition-shadow ${sectionHighlight(activeSection, "overview")}`}
          >
            <div className="mb-2 flex items-end justify-between px-1">
              <div>
                <div className="font-mono text-[10px] tracking-widest text-primary/80">
                  LOGISECURE · COMMAND OVERVIEW
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-gradient sm:text-3xl">
                  Global Logistics · Live Intelligence
                </h1>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
                  ALL SYSTEMS OPERATIONAL
                </span>
              </div>
            </div>
            <KPIGrid />
          </section>

          <section
            id="section-operations"
            className={`grid scroll-mt-28 gap-3 rounded-2xl transition-shadow xl:grid-cols-[1fr_380px] ${sectionHighlight(activeSection, "map") || sectionHighlight(activeSection, "air") || sectionHighlight(activeSection, "maritime")}`}
            aria-label="Operations map"
          >
            <div className="h-[560px] xl:h-[620px]">
              <CityMap2D layerFilter={mapFilter} />
            </div>
            <div className="flex flex-col gap-3">
              <AIPanel />
              <WeatherWidget />
              <div
                id="section-alerts"
                className={`scroll-mt-28 rounded-2xl transition-shadow ${sectionHighlight(activeSection, "alerts")}`}
              >
                <GlobalAlerts />
              </div>
              <RegionChart />
            </div>
          </section>

          <section
            id="section-telemetry"
            className={`grid scroll-mt-28 gap-3 rounded-2xl transition-shadow xl:grid-cols-[1fr_1fr] ${sectionHighlight(activeSection, "telemetry")}`}
            aria-label="Telemetry charts"
          >
            <div id="section-streams" className={`scroll-mt-28 rounded-2xl transition-shadow ${sectionHighlight(activeSection, "streams")}`}>
              <ThroughputChart />
            </div>
            <div
              id="section-fleet"
              className={`scroll-mt-28 rounded-2xl transition-shadow ${sectionHighlight(activeSection, "ground")}`}
            >
              <FleetTable typeFilter={fleetFilter} />
            </div>
          </section>

          <footer className="mt-2 flex items-center justify-between px-1 pb-4 font-mono text-[10px] tracking-widest text-muted-foreground">
            <span>LOGISECURE · v4.2.108 · secure operations bus</span>
            <span>© 2026 LOGISECURE OPS · ALL SIGNALS ENCRYPTED</span>
          </footer>
        </div>
      </motion.main>
    </div>
    </LogisecureProvider>
  );
}
