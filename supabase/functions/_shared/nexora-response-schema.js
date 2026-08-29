import { NEXORA_MUTATION_ACTIONS, NEXORA_NAVIGATION_ACTIONS } from "./nexora-actions.js";

const nullableString = { anyOf: [{ type: "null" }, { type: "string" }] };
export const NEXORA_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["message", "action", "proposed_actions"],
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
    proposed_actions: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "action_type",
          "title",
          "resource_id",
          "project_id",
          "subject_id",
          "due_date",
          "priority",
          "objective",
          "value",
          "expected_updated_at",
          "target_value",
        ],
        properties: {
          action_type: { type: "string", enum: NEXORA_MUTATION_ACTIONS },
          title: nullableString,
          resource_id: nullableString,
          project_id: nullableString,
          subject_id: nullableString,
          due_date: nullableString,
          priority: nullableString,
          objective: nullableString,
          value: nullableString,
          expected_updated_at: nullableString,
          target_value: { anyOf: [{ type: "null" }, { type: "integer" }] },
        },
      },
    },
  },
};
