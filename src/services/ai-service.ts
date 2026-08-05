import { sendAiChat, type AiMessage } from "@/lib/ai-service";

export const AIService = {
  sendChat(messages: AiMessage[]) {
    return sendAiChat(messages);
  },
};
