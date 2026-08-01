import { supabase } from "@/lib/supabase";

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
  const { data, error } = await supabase.functions.invoke<AiChatResponse>("ai-chat", {
    body: { messages },
  });

  if (error) {
    throw error;
  }

  if (!data?.content) {
    throw new Error("Empty response from the assistant");
  }

  return {
    provider: data.provider ?? "openai",
    model: data.model,
    content: data.content,
  };
}
