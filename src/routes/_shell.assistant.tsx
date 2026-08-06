import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useChat, type ChatMessage } from "@/hooks/use-chat";
import { useAuth } from "@/lib/auth-context";
import { AIService, AIServiceError, workspaceQueryKeys, type AiConversation } from "@/services";

export const Route = createFileRoute("/_shell/assistant")({
  head: () => ({ meta: [{ title: "Assistant — NEXORA" }] }),
  component: Assistant,
});
const SUGGESTIONS = [
  "Plan my week around three focus goals",
  "Help me organize my current projects",
  "Create a study plan for this week",
  "Draft a bilingual email to my client",
];

function Assistant() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldFollow = useRef(true);
  const { sendMessage, isSending, loadConversationHistory, startConversation } = useChat();
  const conversationsKey = ["workspace", user?.id, "ai-conversations"] as const;
  const conversations = useQuery({
    queryKey: conversationsKey,
    queryFn: () => AIService.listConversations(),
    enabled: !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    void loadConversationHistory()
      .then((history) => {
        setMessages(history);
      })
      .catch((error: unknown) =>
        setLoadError(
          error instanceof Error ? error.message : "Conversation history could not be loaded.",
        ),
      );
  }, [loadConversationHistory]);
  useEffect(() => {
    if (shouldFollow.current) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const visibleConversations = useMemo(
    () =>
      (conversations.data ?? []).filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [conversations.data, search],
  );
  const grouped = useMemo(() => groupConversations(visibleConversations), [visibleConversations]);

  async function openConversation(id: string) {
    if (isSending) return;
    setLoadError(null);
    try {
      setMessages(await loadConversationHistory(id));
      setActiveId(id);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Conversation could not be loaded.");
    }
  }
  function createConversation() {
    startConversation();
    setActiveId(null);
    setMessages([]);
    setInput("");
    setLoadError(null);
  }
  async function send(text: string) {
    const normalized = text.trim();
    if (!normalized || isSending) return;
    const optimistic: ChatMessage = { id: crypto.randomUUID(), role: "user", content: normalized };
    setMessages((current) => [...current, optimistic]);
    setInput("");
    setLoadError(null);
    shouldFollow.current = true;
    try {
      const result = await sendMessage({ content: normalized, requestId: optimistic.id });
      setMessages((current) => [
        ...current.filter((message) => message.id !== optimistic.id),
        result.userMessage,
        result.assistantMessage,
      ]);
      setActiveId(result.conversationId);
      await queryClient.invalidateQueries({ queryKey: conversationsKey });
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.dashboard(user?.id) });
    } catch (error) {
      const message =
        error instanceof AIServiceError
          ? error.message
          : "The assistant could not respond. Your message was not kept.";
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setInput(normalized);
      setLoadError(message);
      if (error instanceof AIServiceError && error.code === "free_limit_reached")
        toast.error(message, {
          action: { label: "View Premium", onClick: () => navigate({ to: "/premium" }) },
        });
    }
  }
  async function removeConversation(id: string) {
    if (!window.confirm("Delete this conversation permanently?")) return;
    await AIService.deleteConversation(id);
    if (activeId === id) createConversation();
    await queryClient.invalidateQueries({ queryKey: conversationsKey });
    toast.success("Conversation deleted");
  }
  async function renameConversation(item: AiConversation) {
    const title = window.prompt("Conversation name", item.title);
    if (!title || title.trim() === item.title) return;
    await AIService.renameConversation(item.id, title);
    await queryClient.invalidateQueries({ queryKey: conversationsKey });
    toast.success("Conversation renamed");
  }

  return (
    <PageShell>
      <div className="grid min-h-[calc(100dvh-9rem)] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="glass hidden min-h-0 flex-col rounded-3xl p-3 lg:flex">
          <Button onClick={createConversation} className="w-full rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> New conversation
          </Button>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations"
              className="pl-9"
            />
          </div>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            {conversations.isLoading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              Object.entries(grouped).map(([label, items]) => (
                <div key={label} className="mb-5">
                  <p className="mb-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`group flex items-center rounded-xl ${activeId === item.id ? "bg-surface-elevated" : "hover:bg-surface-elevated/60"}`}
                    >
                      <button
                        onClick={() => openConversation(item.id)}
                        className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm"
                      >
                        {item.title}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        onClick={() => renameConversation(item)}
                        aria-label="Rename conversation"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        onClick={() => removeConversation(item.id)}
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </aside>
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-surface/40">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
              <Sparkles className="h-4 w-4 text-gold" /> Assistant
            </div>
            <Button variant="outline" size="sm" className="lg:hidden" onClick={createConversation}>
              <Plus className="mr-1 h-4 w-4" /> New
            </Button>
          </header>
          <div
            ref={scrollRef}
            onScroll={(event) => {
              const element = event.currentTarget;
              shouldFollow.current =
                element.scrollHeight - element.scrollTop - element.clientHeight < 120;
            }}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8"
          >
            {!messages.length && !isSending ? (
              <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated">
                  <Sparkles className="h-7 w-7 text-gold" />
                </div>
                <h1 className="mt-6 font-display text-3xl md:text-4xl">
                  How can I help you today?
                </h1>
                <p className="mt-3 max-w-md text-muted-foreground">
                  Start a conversation. Messages are saved securely to your workspace.
                </p>
                <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => send(suggestion)}
                      className="glass rounded-xl p-4 text-left text-sm transition hover:border-gold/40"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
                {messages.map((message, index) => (
                  <Message
                    key={message.id}
                    message={message}
                    onRegenerate={
                      message.role === "assistant"
                        ? () => {
                            const prior = [...messages.slice(0, index)]
                              .reverse()
                              .find((item) => item.role === "user");
                            if (prior) void send(prior.content);
                          }
                        : undefined
                    }
                  />
                ))}
                {isSending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex gap-1">
                      <i className="h-2 w-2 animate-bounce rounded-full bg-gold" />
                      <i className="h-2 w-2 animate-bounce rounded-full bg-gold [animation-delay:120ms]" />
                      <i className="h-2 w-2 animate-bounce rounded-full bg-gold [animation-delay:240ms]" />
                    </span>
                    NEXORA is thinking
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>
          <div className="border-t border-border p-3 md:p-4">
            {loadError && (
              <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                <span>{loadError}</span>
                <Button size="sm" variant="ghost" onClick={() => send(input)}>
                  Retry
                </Button>
              </div>
            )}
            <div className="glass mx-auto flex max-w-3xl items-end gap-2 rounded-2xl p-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Message NEXORA…"
                rows={1}
                disabled={isSending}
                aria-label="Message NEXORA"
                className="max-h-40 min-h-10 resize-none border-0 bg-transparent focus-visible:ring-0"
              />
              <Button
                size="icon"
                className="shrink-0 rounded-full"
                onClick={() => send(input)}
                disabled={!input.trim() || isSending}
                aria-label="Send message"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              NEXORA can make mistakes. Review important information.
            </p>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function Message({ message, onRegenerate }: { message: ChatMessage; onRegenerate?: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className={`group flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`min-w-0 max-w-[92%] rounded-2xl px-4 py-3 text-sm md:max-w-[85%] ${message.role === "user" ? "bg-primary text-primary-foreground" : "glass"}`}
      >
        {message.role === "assistant" ? (
          <Markdown content={message.content} />
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
        <div
          className={`mt-2 flex gap-1 opacity-0 transition group-hover:opacity-100 ${message.role === "user" ? "justify-end" : ""}`}
        >
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={copy}
            aria-label="Copy message"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          {onRegenerate && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onRegenerate}
              aria-label="Regenerate response"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Markdown({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  return (
    <div className="space-y-3 leading-6">
      {blocks.map((block, index) => {
        const code = block.match(/^```([^\n]*)\n([\s\S]*?)```$/);
        if (code) return <CodeBlock key={index} language={code[1]} code={code[2]} />;
        if (/^#{1,3} /.test(block)) {
          const level = block.match(/^#+/)?.[0].length ?? 1;
          const text = block.replace(/^#{1,3} /, "");
          return level === 1 ? (
            <h2 key={index} className="font-display text-2xl">
              {inline(text)}
            </h2>
          ) : (
            <h3 key={index} className="font-display text-lg">
              {inline(text)}
            </h3>
          );
        }
        if (block.startsWith("> "))
          return (
            <blockquote
              key={index}
              className="border-l-2 border-gold pl-4 italic text-muted-foreground"
            >
              {inline(block.replace(/^> ?/gm, ""))}
            </blockquote>
          );
        const lines = block.split("\n");
        if (lines.every((line) => /^[-*] \[[ xX]\] /.test(line)))
          return (
            <ul key={index} className="space-y-1">
              {lines.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={!line.includes("[ ]")}
                    readOnly
                    className="mt-1"
                  />
                  <span>{inline(line.replace(/^[-*] \[[ xX]\] /, ""))}</span>
                </li>
              ))}
            </ul>
          );
        if (lines.every((line) => /^[-*] /.test(line)))
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {lines.map((line, i) => (
                <li key={i}>{inline(line.replace(/^[-*] /, ""))}</li>
              ))}
            </ul>
          );
        if (lines.every((line) => /^\d+\. /.test(line)))
          return (
            <ol key={index} className="list-decimal space-y-1 pl-5">
              {lines.map((line, i) => (
                <li key={i}>{inline(line.replace(/^\d+\. /, ""))}</li>
              ))}
            </ol>
          );
        if (lines.length >= 2 && lines[0].includes("|") && /^\|?\s*:?-+/.test(lines[1])) {
          const rows = [lines[0], ...lines.slice(2)].map((line) =>
            line
              .split("|")
              .map((cell) => cell.trim())
              .filter(Boolean),
          );
          return (
            <div key={index} className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    {rows[0].map((cell, i) => (
                      <th key={i} className="border border-border p-2">
                        {inline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(1).map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="border border-border p-2">
                          {inline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap">
            {inline(block)}
          </p>
        );
      })}
    </div>
  );
}
function inline(text: string): ReactNode {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("`") ? (
      <code
        key={index}
        className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.9em] text-gold"
      >
        {part.slice(1, -1)}
      </code>
    ) : part.startsWith("**") ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span>{language || "code"}</span>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1 hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{" "}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-5 text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}
function groupConversations(items: AiConversation[]) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return items.reduce<Record<string, AiConversation[]>>((groups, item) => {
    const time = Date.parse(item.updatedAt);
    const label =
      time >= start
        ? "Today"
        : time >= start - 86_400_000
          ? "Yesterday"
          : time >= start - 604_800_000
            ? "Previous 7 days"
            : "Older";
    (groups[label] ??= []).push(item);
    return groups;
  }, {});
}
