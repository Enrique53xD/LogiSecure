import { useMutation } from "@tanstack/react-query";
import { postAgentAnalyze, type IncidentInput } from "@/lib/logisecure-api";

export function useAgentAnalyze() {
  return useMutation({
    mutationFn: (input: IncidentInput) => postAgentAnalyze(input),
  });
}