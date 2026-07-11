import { useQuery } from "@tanstack/react-query";
import { fetchAgentStatus } from "@/lib/logisecure-api";

export function useAgentStatus() {
  return useQuery({
    queryKey: ["logisecure", "agent-status"],
    queryFn: ({ signal }) => fetchAgentStatus(signal),
    refetchInterval: 60_000, 
    staleTime: 55_000,
    retry: 1,
  });
}