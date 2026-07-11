import { useAgentStatus } from "@/hooks/useAgentStatus"; // ya jahan bhi hook rakha ho

export function AIPanel() {
  const { data: status, isLoading, error } = useAgentStatus();

  const dotColor = error
    ? "var(--fill-danger)"
    : status?.status === "ready"
      ? "#1D9E75"
      : "var(--fill-warning)";

  const statusLabel = error
    ? "Agent unavailable"
    : isLoading
      ? "Checking status..."
      : status?.status === "ready"
        ? "Agent ready"
        : status?.status ?? "Unknown";

  const modelShortName = status?.model?.split("/").pop() ?? "—";

  return (
    <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-4 max-w-[340px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: dotColor }}
          />
          <span className="text-[15px] font-medium">{statusLabel}</span>
        </div>
        <i className="ti ti-cpu text-lg text-[var(--text-muted)]" aria-hidden="true" />
      </div>

      {status && (
        <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-2">
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-secondary)]">Provider</span>
            <span className="font-medium">{status.provider}</span>
          </div>
          <div className="flex justify-between gap-3 text-[13px]">
            <span className="text-[var(--text-secondary)] whitespace-nowrap">Model</span>
            <span className="font-mono text-xs text-right break-all">{modelShortName}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-secondary)]">Confidence threshold</span>
            <span className="font-medium">{Math.round(status.confidence_threshold * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}