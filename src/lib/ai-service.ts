import { supabase } from "@/lib/supabase";
import { withDemoFallback } from "@/lib/demo/fallback";
import { demoAssistantReply } from "@/lib/demo/demo-data";

export type AiProvider = "openai";

export type AiRole = "user" | "assistant" | "system";

export interface AiMessage {
  role: AiRole;
  content: string;
}

export interface AiChatResponse {
  provider: AiProvider;
  model?: string;
  content: string;
}

export async function sendAiChat(messages: AiMessage[]): Promise<AiChatResponse> {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  return withDemoFallback<AiChatResponse>(
    async () => {
      const { data, error } = await supabase.functions.invoke<AiChatResponse>("ai-chat", {
        body: { messages },
      });

      if (error) throw error;
      if (!data?.content) throw new Error("Empty response from the assistant");

      return {
        provider: data.provider ?? "openai",
        model: data.model,
        content: data.content,
      };
    },
    () => ({
      provider: "openai" as const,
      model: "demo-fallback",
      content: demoAssistantReply(lastUserMessage),
    }),
    "ai chat",
  );
}
