import { createFileRoute } from "@tanstack/react-router";
import { StudioWorkspace } from "@/components/studio/studio-workspace";
export const Route = createFileRoute("/_shell/studio/ai-academy")({
  head: () => ({ meta: [{ title: "AI Academy — NEXORA" }] }),
  component: () => <StudioWorkspace category="academy" />,
});
