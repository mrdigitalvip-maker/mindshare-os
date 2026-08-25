import { NEXORA_NAVIGATION_ACTIONS } from "./nexora-actions.js";

/**
 * OpenAI strict structured-output schema for an Assistant reply.
 *
 * Keep this exported object as the single schema used by the provider request so
 * tests validate the production contract rather than a copy of it.
 */
export const NEXORA_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["message", "action"],
  properties: {
    message: { type: "string" },
    action: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["type", "name"],
          properties: {
            type: { type: "string", const: "navigation" },
            name: { type: "string", enum: NEXORA_NAVIGATION_ACTIONS },
          },
        },
      ],
    },
  },
};
