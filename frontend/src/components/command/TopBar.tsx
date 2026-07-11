import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, Command, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { LocationSelector } from "./LocationSelector";

function useClock() {
  const [t, setT] = useState<Date | null>(null); // 🔑 null se shuru — server aur client dono match karenge

  useEffect(() => {
    setT(new Date()); // client pe mount hote hi turant time set karein
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return t;
}

export function TopBar() {
  const now = useClock();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  return (
    <header className="glass sticky top-0 z-30 flex items-center gap-3 rounded-2xl px-4 py-3">
      {/* Sector */}
      <div className="hidden items-center gap-2 md:flex">
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5">
          <Radio className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
            SECTOR
          </span>
          <span className="font-mono text-xs font-bold">GLOBAL · 24H</span>
        </div>
        <LocationSelector />
      </div>

      {/* Search */}
      <motion.div
        className={`relative flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
          focused
            ? "border-primary/50 bg-white/[0.04]"
            : "border-white/5 bg-white/[0.02]"
        }`}
        animate={{ boxShadow: focused ? "0 0 0 4px oklch(0.78 0.18 220 / 0.12)" : "0 0 0 0px transparent" }}
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search assets, routes, incidents, cargo IDs…"
          aria-label="Search command center"
          className="w-full bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none"
        />
        <kbd className="hidden items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
          <Command className="h-3 w-3" />K
        </kbd>
        <AnimatePresence>
          {focused && q.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="glass-strong absolute top-[calc(100%+8px)] left-0 right-0 rounded-xl p-2"
            >
              {["Flight AX-1120 · Atlantic", "Vessel MERIDIAN-7 · Suez", "Route EU→NA Priority"].map((s) => (
                <div
                  key={s}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
                >
                  <span>{s}</span>
                  <span className="font-mono text-[10px] text-primary/70">JUMP →</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Status pills */}
      <div className="hidden items-center gap-2 lg:flex">
      <div className="rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5 font-mono text-xs">
  {now ? now.toISOString().slice(11, 19) : "--:--:--"}{" "}
  <span className="text-muted-foreground">UTC</span>
</div>
      </div>

      {/* Notifications */}
      <button
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/5 bg-white/[0.03] transition-all hover:border-primary/40 hover:bg-white/[0.06]"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
        </span>
      </button>

      {/* Avatar */}
      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] py-1 pr-3 pl-1">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent font-mono text-xs font-bold text-primary-foreground">
          KM
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-medium leading-tight">K. Morrison</div>
          <div className="font-mono text-[10px] leading-tight text-muted-foreground">
            OPS · L5
          </div>
        </div>
      </div>
    </header>
  );
}