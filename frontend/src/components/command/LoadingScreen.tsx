import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const MESSAGES = [
  "Connecting to fleet…",
  "Analyzing global routes…",
  "Syncing 12,480 assets…",
  "Receiving weather telemetry…",
  "Booting AI copilot…",
];

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msg = setInterval(() => setI((v) => (v + 1) % MESSAGES.length), 500);
    const prog = setInterval(() => setProgress((p) => Math.min(100, p + Math.random() * 12)), 120);
    const t = setTimeout(() => {
      clearInterval(msg);
      clearInterval(prog);
      setProgress(100);
      setTimeout(onDone, 350);
    }, 2400);
    return () => {
      clearInterval(msg);
      clearInterval(prog);
      clearTimeout(t);
    };
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative flex w-[min(520px,90vw)] flex-col items-center gap-8">
        {/* Orbiting logo */}
        <div className="relative h-32 w-32">
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-3 rounded-full border border-accent/30"
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: "0 0 60px oklch(0.78 0.18 220 / 0.6)" }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="absolute inset-6 grid place-items-center rounded-full bg-primary/10 backdrop-blur">
            <span className="font-mono text-2xl font-bold text-gradient">AX</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="font-mono text-xs tracking-[0.4em] text-primary/80">LOGISECURE · COMMAND</div>
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-sm text-muted-foreground"
            >
              {MESSAGES[i]}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="w-full">
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, oklch(0.78 0.18 220), oklch(0.82 0.15 205))",
                boxShadow: "0 0 12px oklch(0.78 0.18 220 / 0.7)",
              }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>SECURE LINK · TLS 1.3</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}