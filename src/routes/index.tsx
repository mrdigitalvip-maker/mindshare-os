import { createFileRoute } from "@tanstack/react-router";
import { LookSpaceGame } from "../game/LookSpaceGame";

export const Route = createFileRoute("/")({ component: LookSpaceGame });
