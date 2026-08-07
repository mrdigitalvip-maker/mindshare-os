import { createFileRoute } from "@tanstack/react-router";
import { StudioWorkspace } from "@/components/studio/studio-workspace";
export const Route = createFileRoute("/_shell/studio/languages")({
  head: () => ({ meta: [{ title: "Language Lab — NEXORA" }] }),
  component: () => <StudioWorkspace category="language" />,
});
