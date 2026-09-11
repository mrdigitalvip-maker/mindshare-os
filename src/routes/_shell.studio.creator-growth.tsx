import { createFileRoute } from "@tanstack/react-router";
import { StudioWorkspace } from "@/components/studio/studio-workspace";
export const Route = createFileRoute("/_shell/studio/creator-growth")({
  head: () => ({ meta: [{ title: "Creator Growth — KIVRYN" }] }),
  component: () => <StudioWorkspace category="creator" />,
});
