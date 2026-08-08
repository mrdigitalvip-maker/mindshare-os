import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const LookSpaceGame = lazy(() => import("@/game/LookSpaceGame"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LookSpace — The Universe Awaits" },
      { name: "description", content: "Enter LookSpace, a living browser-based space game." },
      { name: "theme-color", content: "#02040a" },
    ],
  }),
  component: GameRoute,
});

function GameRoute() {
  return (
    <Suspense fallback={<div className="game-void" aria-label="Loading LookSpace" />}>
      <LookSpaceGame />
    </Suspense>
  );
}
