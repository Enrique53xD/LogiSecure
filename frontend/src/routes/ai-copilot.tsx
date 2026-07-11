import { createFileRoute } from "@tanstack/react-router";
import { AnimatedBackground } from "@/components/command/AnimatedBackground";
import { Sidebar } from "@/components/command/Sidebar";
import { TopBar } from "@/components/command/TopBar";
import { AICopilot } from "@/components/command/AICopilot";
import { LogisecureProvider } from "@/hooks/useLogisecure";

export const Route = createFileRoute("/ai-copilot")({
  component: AICopilotPage,
});

function AICopilotPage() {
  return (
    <LogisecureProvider>
      <div className="relative min-h-screen">
        <AnimatedBackground />
        <main className="mx-auto flex min-h-screen w-full max-w-[1800px] gap-3 p-3 lg:p-4">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <TopBar />
            <AICopilot />
          </div>
        </main>
      </div>
    </LogisecureProvider>
  );
}