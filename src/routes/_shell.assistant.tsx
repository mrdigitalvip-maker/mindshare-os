import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Send, Mic, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChat, type ChatMessage } from "@/hooks/use-chat";

export const Route = createFileRoute("/_shell/assistant")({
  head: () => ({ meta: [{ title: "Assistant — NEXORA" }] }),
  component: Assistant,
});

const SUGGESTIONS = [
  "Plan my week around 3 focus goals",
  "Summarize the last document I opened",
  "Help me practice a job interview",
  "Draft a bilingual email to my client",
];

function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const { sendMessage, isSending } = useChat();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setInput("");
    const optimisticUser: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    setMessages((m) => [...m, optimisticUser]);

    try {
      const { assistantMessage } = await sendMessage({ content: trimmed, history: messages });
      setMessages((m) => [...m, assistantMessage]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't reach the assistant");
      // Roll back the optimistic user message so the composer reflects
      // what was actually saved.
      setMessages((m) => m.filter((msg) => msg.id !== optimisticUser.id));
    }
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-gold" /> Assistant
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated"
            >
              <Sparkles className="h-7 w-7 text-gold" />
            </motion.div>
            <h1 className="font-display text-4xl">How can I help you today?</h1>
            <p className="mt-3 max-w-md text-muted-foreground">
              Ask anything. NEXORA remembers what matters and connects the dots across your workspace.
            </p>
            <div className="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={isSending}
                  className="glass rounded-xl p-4 text-left text-sm transition hover:border-[color:var(--gold)]/40 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="flex max-w-[85%] flex-col gap-1">
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "glass"
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.role === "assistant" && m.provider && (
                    <span className="px-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      via {m.provider}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="glass rounded-2xl px-4 py-3 text-sm text-muted-foreground">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        {/* Composer */}
        <div className="sticky bottom-24 mx-auto w-full max-w-3xl md:bottom-6">
          <div className="glass flex items-end gap-2 rounded-3xl p-2 shadow-[var(--shadow-elevated)]">
            <Button variant="ghost" size="icon" className="rounded-full" disabled>
              <Plus className="h-4 w-4" />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Message NEXORA…"
              rows={1}
              disabled={isSending}
              className="min-h-10 resize-none border-0 bg-transparent focus-visible:ring-0"
            />
            <Button variant="ghost" size="icon" className="rounded-full" disabled>
              <Mic className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              className="rounded-full"
              onClick={() => send(input)}
              disabled={!input.trim() || isSending}
              aria-busy={isSending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
