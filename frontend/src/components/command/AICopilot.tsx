import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, AlertTriangle, Ship, Route, Terminal, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useAgentAnalyze } from "@/hooks/useAgentAnalyze";
import type { IncidentInput } from "@/lib/logisecure-api";

const SEVERITY_OPTIONS = ["Low", "Medium", "High", "Critical"];

const EMPTY_FORM: IncidentInput = {
  type: "",
  location: "",
  severity: "High",
  description: "",
  estimated_duration: "",
  affected_assets: "",
};

export function AICopilot() {
  const [form, setForm] = useState<IncidentInput>(EMPTY_FORM);
  const { mutate, data, isPending, isError, error, reset } = useAgentAnalyze();

  const update = (key: keyof IncidentInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const canSubmit = form.type && form.location && form.description;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
      {/* Header spans full width */}
      <div className="lg:col-span-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">AI Copilot</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Report an incident and let the agent analyze impact, reroute shipments, and draft an execution plan.
        </p>
      </div>

      {/* Incident input form */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-3 font-mono text-[10px] tracking-widest text-muted-foreground">
          INCIDENT REPORT
        </div>

        <div className="flex flex-col gap-3">
          <Field label="Type">
            <input
              value={form.type}
              onChange={update("type")}
              placeholder="Port Strike, Weather Delay..."
              className="input-field"
            />
          </Field>

          <Field label="Location">
            <input
              value={form.location}
              onChange={update("location")}
              placeholder="Rotterdam"
              className="input-field"
            />
          </Field>

          <Field label="Severity">
            <div className="flex gap-1.5">
              {SEVERITY_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, severity: s }))}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                    form.severity === s
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/5 text-muted-foreground hover:bg-white/5"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={update("description")}
              rows={3}
              placeholder="Dock workers strike affecting all container operations"
              className="input-field resize-none"
            />
          </Field>

          <Field label="Estimated duration">
            <input
              value={form.estimated_duration}
              onChange={update("estimated_duration")}
              placeholder="7 days"
              className="input-field"
            />
          </Field>

          <Field label="Affected assets">
            <input
              value={form.affected_assets}
              onChange={update("affected_assets")}
              placeholder="5 cargo ships, 10,000 containers"
              className="input-field"
            />
          </Field>

          <button
            disabled={!canSubmit || isPending}
            onClick={() => mutate(form)}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, oklch(0.78 0.18 220), oklch(0.72 0.22 200))" }}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Running analysis...
              </>
            ) : (
              "Run analysis"
            )}
          </button>

          {data && (
            <button
              onClick={() => { setForm(EMPTY_FORM); reset(); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              New incident
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-4">
        {isError && (
          <div className="glass flex items-center gap-2 rounded-xl border border-red-500/20 p-4 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {(error as Error)?.message ?? "Analysis failed. Check that the backend is running."}
          </div>
        )}

        {!data && !isPending && !isError && (
          <div className="glass flex flex-1 items-center justify-center rounded-2xl p-12 text-sm text-muted-foreground">
            Submit an incident report to see the agent's analysis here.
          </div>
        )}

        {isPending && (
          <div className="glass rounded-2xl p-5">
            <div className="mb-2 font-mono text-[10px] tracking-widest text-muted-foreground">
              AGENT WORKFLOW
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Monitoring · detecting · correlating · inferring · executing...
            </div>
          </div>
        )}

        <AnimatePresence>
          {data && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4"
            >
              {/* Incident summary */}
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {data.analysis.incident_data.type} · {data.analysis.incident_data.location}
                  </span>
                  <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest ${
                    data.analysis.incident_data.severity === "High"
                      ? "bg-danger/15 text-destructive"
                      : "bg-amber/15 text-amber"
                  }`}>
                    {data.analysis.incident_data.severity?.toUpperCase()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {data.analysis.incident_data.description}
                </p>
                <div className="mt-3 flex gap-4 font-mono text-[11px] text-muted-foreground">
                  <span>Duration: {data.analysis.incident_data.estimated_duration}</span>
                  <span>Assets: {data.analysis.incident_data.affected_assets}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Affected shipments */}
                <div className="glass rounded-2xl p-5">
                  <div className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-widest text-muted-foreground">
                    <Ship className="h-3 w-3" /> AFFECTED SHIPMENTS ({data.analysis.affected_shipments.length})
                  </div>
                  <div className="flex flex-col gap-2">
                    {data.analysis.affected_shipments.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs">
                        <span className="font-mono">{s.id}</span>
                        <span className="text-muted-foreground">{s.cargo}</span>
                        <span className="text-muted-foreground">{s.location}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alternative routes */}
                <div className="glass rounded-2xl p-5">
                  <div className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-widest text-muted-foreground">
                    <Route className="h-3 w-3" /> ALTERNATIVE ROUTES
                  </div>
                  <div className="flex flex-col gap-2">
                    {data.analysis.alternative_routes.map((r) => (
                      <div key={r.route} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs">
                        <span>{r.route}</span>
                        <span className="text-muted-foreground">{r.time}</span>
                        <span className={
                          r.priority === "High" ? "text-destructive" :
                          r.priority === "Medium" ? "text-amber" : "text-muted-foreground"
                        }>
                          {r.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Execution log */}
              <div className="glass rounded-2xl p-5">
                <div className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-widest text-muted-foreground">
                  <Terminal className="h-3 w-3" /> EXECUTION LOG
                </div>
                <div className="flex flex-col gap-1.5 font-mono text-xs text-muted-foreground">
                  {data.analysis.messages.map((m, i) => (
                    <div key={i}>{m}</div>
                  ))}
                </div>
              </div>

              {/* Alerts */}
{data.analysis.alerts.length > 0 && data.analysis.alerts[0] && (
  <div className="glass flex items-center gap-2 rounded-xl border border-success/20 p-3 text-xs text-success">
    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
    {data.analysis.alerts[0].message} · {new Date(data.analysis.alerts[0].timestamp).toLocaleTimeString()}
  </div>
)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] tracking-widest text-muted-foreground">{label.toUpperCase()}</span>
      {children}
    </label>
  );
}