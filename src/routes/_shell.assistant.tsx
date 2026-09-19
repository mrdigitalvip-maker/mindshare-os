import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Edit3,
  FileText,
  ListTodo,
  Loader2,
  Menu,
  Mic,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChat, type ChatMessage } from "@/hooks/use-chat";
import { useAuth } from "@/lib/auth-context";
import { copyText } from "@/lib/clipboard";
import {
  actionPreview,
  actionReceipt,
  type NexoraMutationAction,
  type NexoraMutationStatus,
} from "@/lib/nexora-actions";
import { createClientId } from "@/lib/utils";
import {
  AIService,
  AIServiceError,
  ContentService,
  ProductivityService,
  workspaceQueryKeys,
  type AiConversation,
} from "@/services";
import { applyNexoraAction, NexoraActionError } from "@/services/nexora-action-service";
import {
  createSpeechRecognition,
  ElevenLabsVoiceProvider,
  FallbackVoiceProvider,
  transcribeVoiceAudio,
  type SpeechRecognitionLike,
} from "@/services/voice-provider";

export const Route = createFileRoute("/_shell/assistant")({
  head: () => ({ meta: [{ title: "Assistente — KIVRYN" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    conversation: typeof search.conversation === "string" ? search.conversation : undefined,
  }),
  component: Assistant,
});

const SUGGESTIONS = [
  "Organize meu dia e me diga o próximo passo",
  "Revise minhas tarefas e encontre prioridades",
  "Ajude a estruturar um novo projeto",
  "Monte um plano de estudos para esta semana",
];

type ProposalItem = {
  action: NexoraMutationAction;
  actionId: string;
  requestId: string;
  status: NexoraMutationStatus;
  message?: string;
  canRetry?: boolean;
};

type ProposalState = {
  conversationId: string | null;
  items: ProposalItem[];
};

function Assistant() {
  const { conversation } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shouldFollow = useRef(true);
  const openedFromSearch = useRef<string | null>(null);
  const applyingActions = useRef(new Set<string>());
  const [showLatest, setShowLatest] = useState(false);
  const [taskPreview, setTaskPreview] = useState<string | null>(null);
  const [contentPreview, setContentPreview] = useState<{ title: string; body: string } | null>(null);
  const [proposal, setProposal] = useState<ProposalState | null>(null);
  const [voiceInputState, setVoiceInputState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [voiceConversationMode, setVoiceConversationMode] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceTimerRef = useRef<number | null>(null);
  const voiceSessionRef = useRef(0);
  const serverVoiceRef = useRef<ElevenLabsVoiceProvider | null>(null);
  const fallbackVoiceRef = useRef<FallbackVoiceProvider | null>(null);
  const { sendMessage, isSending, loadConversationHistory, startConversation } = useChat();
  const conversationsKey = ["workspace", user?.id, "ai-conversations"] as const;
  const conversations = useQuery({
    queryKey: conversationsKey,
    queryFn: () => AIService.listConversations(),
    enabled: !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (shouldFollow.current) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, proposal]);

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(
    () => () => {
      if (voiceTimerRef.current !== null) window.clearTimeout(voiceTimerRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      mediaRecorderRef.current = null;
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      const recognition = speechRecognitionRef.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
      }
      speechRecognitionRef.current = null;
      serverVoiceRef.current?.stop();
      fallbackVoiceRef.current?.stop();
    },
    [],
  );

  useEffect(() => {
    if (!conversation || openedFromSearch.current === conversation) return;
    openedFromSearch.current = conversation;
    void openConversation(conversation);
    // URL search is intentionally a one-shot conversation trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation]);

  const visibleConversations = useMemo(
    () =>
      (Array.isArray(conversations.data) ? conversations.data : []).filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [conversations.data, search],
  );
  const grouped = useMemo(() => groupConversations(visibleConversations), [visibleConversations]);

  async function openConversation(id: string) {
    if (isSending) return;
    cancelVoiceInput();
    stopSpeaking();
    setVoiceConversationMode(false);
    setLoadError(null);
    setProposal(null);
    applyingActions.current.clear();
    try {
      setMessages(await loadConversationHistory(id));
      setActiveId(id);
      shouldFollow.current = true;
      setShowLatest(false);
      setHistoryOpen(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar a conversa.");
    }
  }

  function createConversation() {
    cancelVoiceInput();
    stopSpeaking();
    setVoiceConversationMode(false);
    startConversation();
    applyingActions.current.clear();
    setProposal(null);
    setActiveId(null);
    setMessages([]);
    setInput("");
    setLoadError(null);
    setHistoryOpen(false);
    shouldFollow.current = true;
    setShowLatest(false);
    void navigate({ to: "/assistant", search: { conversation: undefined }, replace: true });
    toast.success("Novo chat iniciado");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function voiceLocale(): "pt-BR" | "en-US" {
    if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("en")) {
      return "en-US";
    }
    return "pt-BR";
  }

  function appendTranscript(transcript: string) {
    setInput((current) => {
      const base = current.trim();
      return base ? `${base} ${transcript.trim()}` : transcript.trim();
    });
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function releaseMediaStream() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function clearVoiceTimer() {
    if (voiceTimerRef.current !== null) {
      window.clearTimeout(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
  }

  function cancelVoiceInput(updateState = true) {
    voiceSessionRef.current += 1;
    clearVoiceTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    mediaRecorderRef.current = null;
    mediaChunksRef.current = [];
    releaseMediaStream();

    const recognition = speechRecognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    }
    speechRecognitionRef.current = null;
    if (updateState) setVoiceInputState("idle");
  }

  function startRecognitionFallback() {
    const session = ++voiceSessionRef.current;
    const recognition = createSpeechRecognition();
    if (!recognition) return false;
    recognition.lang = voiceLocale();
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript && session === voiceSessionRef.current) {
        if (voiceConversationMode) {
          void send(transcript, { fromVoice: true, speakReply: true });
        } else {
          appendTranscript(transcript);
        }
      }
    };
    recognition.onerror = () => {
      toast.error("Não foi possível reconhecer sua voz.");
    };
    recognition.onend = () => {
      speechRecognitionRef.current = null;
      setVoiceInputState("idle");
    };
    speechRecognitionRef.current = recognition;
    setVoiceInputState("recording");
    recognition.start();
    return true;
  }

  async function finishRecordedVoice(mimeType: string, session: number) {
    clearVoiceTimer();
    const chunks = mediaChunksRef.current;
    mediaChunksRef.current = [];
    mediaRecorderRef.current = null;
    releaseMediaStream();
    if (!chunks.length) {
      setVoiceInputState("idle");
      toast.error("Nenhum áudio foi capturado.");
      return;
    }

    setVoiceInputState("transcribing");
    try {
      const transcript = await transcribeVoiceAudio(
        new Blob(chunks, { type: mimeType || chunks[0]?.type || "audio/webm" }),
        voiceLocale(),
      );
      if (session !== voiceSessionRef.current) return;
      if (voiceConversationMode) {
        setVoiceInputState("idle");
        await send(transcript, { fromVoice: true, speakReply: true });
      } else {
        appendTranscript(transcript);
        toast.success("Áudio transcrito. Revise antes de enviar.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível transcrever o áudio.");
    } finally {
      setVoiceInputState("idle");
    }
  }

  async function startVoiceInput() {
    if (isSending || voiceInputState !== "idle") return;
    stopSpeaking();

    const canRecord =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined";
    if (!canRecord) {
      if (!startRecognitionFallback()) {
        toast.error("Entrada de voz não é compatível com este navegador.");
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const session = ++voiceSessionRef.current;
      mediaStreamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) mediaChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        cancelVoiceInput();
        toast.error("A gravação de voz foi interrompida.");
      };
      recorder.onstop = () => {
        void finishRecordedVoice(recorder.mimeType, session);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setVoiceInputState("recording");
      voiceTimerRef.current = window.setTimeout(() => {
        const active = mediaRecorderRef.current;
        if (active && active.state !== "inactive") active.stop();
      }, 60_000);
    } catch {
      cancelVoiceInput();
      toast.error("Permita o acesso ao microfone para usar a entrada de voz.");
    }
  }

  function stopVoiceInput() {
    clearVoiceTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }
    const recognition = speechRecognitionRef.current;
    if (recognition) {
      recognition.stop();
      return;
    }
    setVoiceInputState("idle");
  }

  function stopSpeaking() {
    serverVoiceRef.current?.stop();
    fallbackVoiceRef.current?.stop();
    setSpeakingMessageId(null);
  }

  async function speakMessage(message: ChatMessage) {
    stopSpeaking();
    const server = serverVoiceRef.current ?? new ElevenLabsVoiceProvider();
    const fallback = fallbackVoiceRef.current ?? new FallbackVoiceProvider();
    serverVoiceRef.current = server;
    fallbackVoiceRef.current = fallback;
    setSpeakingMessageId(message.id);

    try {
      if (await server.isAvailable()) {
        await server.speak(message.content);
      } else {
        await fallback.speak(message.content);
      }
    } catch {
      try {
        await fallback.speak(message.content);
      } catch {
        toast.error("Não foi possível reproduzir esta resposta.");
      }
    } finally {
      setSpeakingMessageId((current) => (current === message.id ? null : current));
    }
  }

  async function toggleMessageSpeech(message: ChatMessage) {
    if (speakingMessageId === message.id) {
      stopSpeaking();
      return;
    }
    await speakMessage(message);
  }

  function toggleVoiceConversationMode() {
    if (isSending || voiceInputState !== "idle") return;
    if (voiceConversationMode) {
      stopSpeaking();
      setVoiceConversationMode(false);
      toast.success("Conversa por voz encerrada.");
      return;
    }
    setVoiceConversationMode(true);
    toast.success("Conversa por voz ativa. Toque no microfone para cada turno.");
  }

  async function send(
    text: string,
    options: { fromVoice?: boolean; speakReply?: boolean } = {},
  ) {
    const normalized = text.trim();
    if (!normalized || isSending || (!options.fromVoice && voiceInputState !== "idle")) return;
    const optimistic: ChatMessage = { id: createClientId(), role: "user", content: normalized };
    setProposal(null);
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
      setProposal(
        result.proposedActions.length
          ? {
              conversationId: result.conversationId,
              items: result.proposedActions.map((action) => {
                const stableId = createClientId();
                return {
                  action,
                  actionId: stableId,
                  requestId: stableId,
                  status: "pending" as const,
                };
              }),
            }
          : null,
      );
      setActiveId(result.conversationId);
      if (options.speakReply || voiceConversationMode) {
        await speakMessage(result.assistantMessage);
      }
      await queryClient.invalidateQueries({ queryKey: conversationsKey });
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.dashboard(user?.id) });
    } catch (error) {
      const message =
        error instanceof AIServiceError
          ? error.message
          : "O assistente não respondeu. Sua mensagem não foi salva.";
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setInput(normalized);
      setLoadError(message);
      if (error instanceof AIServiceError && error.code === "free_limit_reached") {
        toast.error(message, {
          action: { label: "Ver Premium", onClick: () => navigate({ to: "/premium" }) },
        });
      }
    }
  }

  function updateProposalItem(actionId: string, patch: Partial<ProposalItem>) {
    setProposal((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.actionId === actionId ? { ...item, ...patch } : item,
            ),
          }
        : current,
    );
  }

  async function confirmAction(item: ProposalItem) {
    if (
      applyingActions.current.has(item.actionId) ||
      !proposal ||
      proposal.conversationId !== activeId ||
      !["pending", "failed"].includes(item.status)
    ) {
      return;
    }

    applyingActions.current.add(item.actionId);
    updateProposalItem(item.actionId, { status: "applying", message: undefined });
    try {
      await applyNexoraAction({
        actionId: item.actionId,
        requestId: item.requestId,
        conversationId: proposal.conversationId,
        confirmed: true,
        action: item.action,
      });
      const receipt = actionReceipt(item.action);
      updateProposalItem(item.actionId, {
        status: "applied",
        message: receipt,
        canRetry: false,
      });
      await queryClient.invalidateQueries({});
      toast.success(receipt);
    } catch (error) {
      const safe =
        error instanceof NexoraActionError
          ? error.safe
          : { message: "Não foi possível aplicar a alteração.", retry: true };
      updateProposalItem(item.actionId, {
        status: "failed",
        message: safe.message,
        canRetry: safe.retry,
      });
    } finally {
      applyingActions.current.delete(item.actionId);
    }
  }

  async function removeConversation(id: string) {
    if (!window.confirm("Excluir esta conversa permanentemente?")) return;
    await AIService.deleteConversation(id);
    if (activeId === id) createConversation();
    await queryClient.invalidateQueries({ queryKey: conversationsKey });
    toast.success("Conversa excluída");
  }

  async function renameConversation(item: AiConversation) {
    const title = window.prompt("Nome da conversa", item.title);
    if (!title || title.trim() === item.title) return;
    await AIService.renameConversation(item.id, title);
    await queryClient.invalidateQueries({ queryKey: conversationsKey });
    toast.success("Conversa renomeada");
  }

  return (
    <PageShell>
      <div className="mx-auto flex min-h-[calc(100dvh-8.5rem)] w-full max-w-5xl flex-col overflow-hidden">
        <header className="flex min-h-14 items-center border-b border-border/70 px-1 sm:px-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setHistoryOpen(true)}
            aria-label="Abrir histórico de conversas"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-3 text-center">
            <p className="truncate text-sm font-semibold tracking-tight">KIVRYN</p>
            <p className="text-[11px] text-muted-foreground">Assistant</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={createConversation}
            aria-label="Novo chat"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </header>

        <div
          ref={scrollRef}
          onScroll={(event) => {
            const element = event.currentTarget;
            shouldFollow.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
            setShowLatest(!shouldFollow.current);
          }}
          className="relative min-h-0 flex-1 overscroll-contain overflow-y-auto px-3 py-6 sm:px-6 md:px-10"
          aria-live="polite"
          aria-busy={isSending}
        >
          {!messages.length && !isSending ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated">
                <Sparkles className="h-5 w-5 text-intelligence" />
              </div>
              <h1 className="mt-5 font-display text-3xl md:text-4xl">Como posso ajudar?</h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground md:text-base">
                Pergunte, planeje ou peça uma ação. A conversa fica no centro e o histórico permanece no menu.
              </p>
              <div className="mt-7 flex w-full flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="rounded-full border border-border bg-transparent px-4 py-2.5 text-left text-sm transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
              {messages.map((message, index) => (
                <Message
                  key={message.id}
                  message={message}
                  speaking={speakingMessageId === message.id}
                  onSpeak={message.role === "assistant" ? () => void toggleMessageSpeech(message) : undefined}
                  onSaveTask={message.role === "assistant" ? () => setTaskPreview(message.content) : undefined}
                  onSaveContent={
                    message.role === "assistant"
                      ? () =>
                          setContentPreview({
                            title:
                              message.content
                                .split("\n")
                                .find(Boolean)
                                ?.replace(/^#+\s*/, "")
                                .slice(0, 100) || "Assistant draft",
                            body: message.content,
                          })
                      : undefined
                  }
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
                <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground" role="status">
                  <span className="flex gap-1" aria-hidden="true">
                    <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-intelligence" />
                    <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-intelligence [animation-delay:120ms]" />
                    <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-intelligence [animation-delay:240ms]" />
                  </span>
                  KIVRYN está pensando…
                </div>
              )}
              {proposal && (
                <ProposalCard
                  items={proposal.items}
                  onCancel={(item) =>
                    updateProposalItem(item.actionId, {
                      status: "cancelled",
                      message: "Alteração cancelada. Nada foi modificado.",
                      canRetry: false,
                    })
                  }
                  onConfirm={(item) => void confirmAction(item)}
                />
              )}
              <div ref={endRef} />
            </div>
          )}

          {showLatest && (
            <Button
              size="sm"
              variant="secondary"
              className="sticky bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full shadow-lg"
              onClick={() => {
                shouldFollow.current = true;
                setShowLatest(false);
                endRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Ir para a mensagem mais recente
            </Button>
          )}
        </div>

        <div className="px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 md:px-8">
          <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-elevated/50 px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-medium">
                {voiceConversationMode ? "Conversa por voz ativa" : "Conversa por voz"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {voiceConversationMode
                  ? "Toque no microfone para cada turno. Respostas são faladas; ações continuam exigindo confirmação."
                  : "Ative para enviar a fala após a transcrição e ouvir a resposta automaticamente."}
              </p>
            </div>
            <Button
              size="sm"
              variant={voiceConversationMode ? "secondary" : "outline"}
              aria-pressed={voiceConversationMode}
              disabled={isSending || voiceInputState !== "idle"}
              onClick={toggleVoiceConversationMode}
            >
              <Volume2 className="h-4 w-4" />
              {voiceConversationMode ? "Encerrar" : "Ativar"}
            </Button>
          </div>
          {loadError && (
            <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
              <span>{loadError}</span>
              <Button size="sm" variant="ghost" onClick={() => void send(input)}>
                Tentar novamente
              </Button>
            </div>
          )}
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[1.75rem] border border-border bg-surface-elevated/80 p-2 shadow-sm focus-within:border-intelligence/50">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setInput("");
                } else if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Mensagem para a KIVRYN…"
              rows={1}
              disabled={isSending}
              aria-label="Mensagem para a KIVRYN"
              className="max-h-40 min-h-11 resize-none border-0 bg-transparent px-3 py-3 focus-visible:ring-0"
            />
            <Button
              size="icon"
              variant={voiceInputState === "recording" ? "secondary" : "ghost"}
              className="h-11 w-11 shrink-0 rounded-full"
              onClick={() =>
                voiceInputState === "recording" ? stopVoiceInput() : void startVoiceInput()
              }
              disabled={isSending || voiceInputState === "transcribing"}
              aria-label={
                voiceInputState === "recording"
                  ? "Parar gravação de voz"
                  : voiceInputState === "transcribing"
                    ? "Transcrevendo voz"
                    : voiceConversationMode
                      ? "Falar e enviar para a KIVRYN"
                      : "Falar com a KIVRYN"
              }
            >
              {voiceInputState === "transcribing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : voiceInputState === "recording" ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full"
              onClick={() => void send(input)}
              disabled={!input.trim() || isSending || voiceInputState !== "idle"}
              aria-label="Enviar mensagem"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Enter para enviar · Shift + Enter para nova linha
          </p>
        </div>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="flex w-[min(90vw,22rem)] flex-col p-4">
          <SheetHeader className="text-left">
            <SheetTitle>Conversas</SheetTitle>
          </SheetHeader>
          <ConversationList
            {...{
              activeId,
              grouped,
              search,
              setSearch,
              createConversation,
              openConversation,
              removeConversation,
              renameConversation,
            }}
            loading={conversations.isLoading}
          />
        </SheetContent>
      </Sheet>

      <Dialog open={taskPreview !== null} onOpenChange={(open) => !open && setTaskPreview(null)}>
        <DialogContent className="max-h-[min(90dvh,38rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Salvar resposta como tarefa?</DialogTitle>
            <DialogDescription>Revise antes de confirmar. Nada é salvo automaticamente.</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="font-medium">
              {taskPreview
                ?.split("\n")
                .find(Boolean)
                ?.replace(/^#+\s*/, "")
                .slice(0, 100) || "Próxima ação"}
            </p>
            <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm text-muted-foreground">
              {taskPreview}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskPreview(null)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!taskPreview) return;
                const title =
                  taskPreview
                    .split("\n")
                    .find(Boolean)
                    ?.replace(/^#+\s*/, "")
                    .slice(0, 100) || "Próxima ação";
                try {
                  await ProductivityService.createTask({ title, description: taskPreview });
                  await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.tasks(user?.id) });
                  setTaskPreview(null);
                  toast.success("Tarefa salva");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "A tarefa não pôde ser salva");
                }
              }}
            >
              <ListTodo /> Confirmar e salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contentPreview !== null} onOpenChange={(open) => !open && setContentPreview(null)}>
        <DialogContent className="max-h-[min(90dvh,42rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Salvar resposta como conteúdo?</DialogTitle>
            <DialogDescription>Revise e edite o rascunho antes de confirmar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="space-y-1 text-sm font-medium">
              <span>Título</span>
              <Input
                value={contentPreview?.title ?? ""}
                onChange={(event) =>
                  setContentPreview((current) =>
                    current ? { ...current, title: event.target.value } : current,
                  )
                }
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              <span>Conteúdo</span>
              <Textarea
                className="min-h-52"
                value={contentPreview?.body ?? ""}
                onChange={(event) =>
                  setContentPreview((current) =>
                    current ? { ...current, body: event.target.value } : current,
                  )
                }
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContentPreview(null)}>Cancelar</Button>
            <Button
              disabled={!contentPreview?.title.trim() || !contentPreview?.body.trim()}
              onClick={async () => {
                if (!contentPreview) return;
                try {
                  const draft = await ContentService.createDraft(contentPreview);
                  await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.content(user?.id) });
                  setContentPreview(null);
                  toast.success("Rascunho salvo", {
                    action: {
                      label: "Abrir conteúdo",
                      onClick: () =>
                        navigate({ to: "/content/$contentId", params: { contentId: draft.id } }),
                    },
                  });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "O conteúdo não pôde ser salvo");
                }
              }}
            >
              <FileText /> Confirmar e salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function ProposalCard({
  items,
  onCancel,
  onConfirm,
}: {
  items: ProposalItem[];
  onCancel: (item: ProposalItem) => void;
  onConfirm: (item: ProposalItem) => void;
}) {
  return (
    <div className="rounded-2xl border border-intelligence/30 bg-surface-elevated/70 p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-intelligence">
        {items.length === 1 ? "Alteração proposta" : "Alterações propostas"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Revise antes de confirmar. A KIVRYN não altera seu espaço de trabalho sem sua aprovação.
      </p>
      <div className="mt-4 space-y-4">
        {items.map((item) => {
          const preview = actionPreview(item.action);
          const actionable = item.status === "pending" || item.status === "failed";
          return (
            <div key={item.actionId} className="rounded-xl border border-border/70 bg-background/40 p-3">
              <p className="text-sm font-semibold">{preview.label}</p>
              {preview.details.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {preview.details.map((detail) => <li key={detail}>• {detail}</li>)}
                </ul>
              )}
              {item.message && (
                <p
                  className={`mt-2 text-sm ${item.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}
                  role={item.status === "failed" ? "alert" : undefined}
                >
                  {item.message}
                </p>
              )}
              {actionable ? (
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => onCancel(item)}>
                    Cancelar
                  </Button>
                  {(item.status === "pending" || item.canRetry) && (
                    <Button size="sm" onClick={() => onConfirm(item)}>
                      {item.status === "failed" ? "Tentar novamente" : "Confirmar"}
                    </Button>
                  )}
                </div>
              ) : item.status === "applying" ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" /> Aplicando…
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Message({
  message,
  speaking,
  onSpeak,
  onRegenerate,
  onSaveTask,
  onSaveContent,
}: {
  message: ChatMessage;
  speaking?: boolean;
  onSpeak?: () => void;
  onRegenerate?: () => void;
  onSaveTask?: () => void;
  onSaveContent?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await copyText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar esta mensagem.");
    }
  }

  if (message.role === "user") {
    return (
      <div className="group flex justify-end">
        <div className="max-w-[88%] rounded-3xl rounded-br-lg bg-surface-elevated px-4 py-3 text-sm leading-6 md:max-w-[78%]">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group min-w-0">
      <div className="mb-2 text-xs font-medium text-muted-foreground">KIVRYN</div>
      <div className="min-w-0 text-[15px] leading-7">
        <Markdown content={message.content} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1 text-muted-foreground opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copy} aria-label="Copiar mensagem">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
        {onSpeak && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onSpeak}
            aria-label={speaking ? "Parar áudio" : "Ouvir resposta"}
          >
            {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </Button>
        )}
        {onRegenerate && (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onRegenerate} aria-label="Gerar resposta novamente">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
        {onSaveTask && (
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={onSaveTask}>
            <ListTodo className="h-3.5 w-3.5" /> Salvar tarefa
          </Button>
        )}
        {onSaveContent && (
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={onSaveContent}>
            <FileText className="h-3.5 w-3.5" /> Salvar conteúdo
          </Button>
        )}
      </div>
    </div>
  );
}

function ConversationList({
  activeId,
  grouped,
  search,
  setSearch,
  loading,
  createConversation,
  openConversation,
  removeConversation,
  renameConversation,
}: {
  activeId: string | null;
  grouped: Record<string, AiConversation[]>;
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  createConversation: () => void;
  openConversation: (id: string) => Promise<void>;
  removeConversation: (id: string) => Promise<void>;
  renameConversation: (item: AiConversation) => Promise<void>;
}) {
  return (
    <>
      <Button onClick={createConversation} className="mt-3 w-full rounded-xl">
        <Plus /> Novo chat
      </Button>
      <div className="relative mt-3">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar conversas"
          aria-label="Buscar histórico de conversas"
          className="pl-9"
        />
      </div>
      <div className="mt-4 min-h-0 flex-1 overscroll-contain overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center p-6" role="status" aria-label="Carregando conversas">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
        ) : (
          Object.entries(grouped).map(([label, items]) => (
            <div key={label} className="mb-5">
              <p className="mb-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`group flex items-center rounded-xl transition-colors ${
                    activeId === item.id ? "bg-surface-elevated" : "hover:bg-surface-elevated/60"
                  }`}
                >
                  <button
                    onClick={() => void openConversation(item.id)}
                    aria-current={activeId === item.id ? "page" : undefined}
                    className="min-h-10 min-w-0 flex-1 truncate rounded-xl px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.title}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                    onClick={() => void renameConversation(item)}
                    aria-label={`Renomear ${item.title}`}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                    onClick={() => void removeConversation(item.id)}
                    aria-label={`Excluir ${item.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
}

function Markdown({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  return (
    <div className="space-y-3 leading-7">
      {blocks.map((block, index) => {
        const code = block.match(/^```([^\n]*)\n([\s\S]*?)```$/);
        if (code) return <CodeBlock key={index} language={code[1]} code={code[2]} />;
        if (/^#{1,3} /.test(block)) {
          const level = block.match(/^#+/)?.[0].length ?? 1;
          const text = block.replace(/^#{1,3} /, "");
          return level === 1 ? (
            <h2 key={index} className="font-display text-2xl">{inline(text)}</h2>
          ) : (
            <h3 key={index} className="font-display text-lg">{inline(text)}</h3>
          );
        }
        if (block.startsWith("> ")) {
          return (
            <blockquote key={index} className="border-l-2 border-intelligence pl-4 italic text-muted-foreground">
              {inline(block.replace(/^> ?/gm, ""))}
            </blockquote>
          );
        }
        const lines = block.split("\n");
        if (lines.every((line) => /^[-*] \[[ xX]\] /.test(line))) {
          return (
            <ul key={index} className="space-y-1">
              {lines.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <input type="checkbox" checked={!line.includes("[ ]")} readOnly className="mt-1" />
                  <span>{inline(line.replace(/^[-*] \[[ xX]\] /, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (lines.every((line) => /^[-*] /.test(line))) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {lines.map((line, i) => <li key={i}>{inline(line.replace(/^[-*] /, ""))}</li>)}
            </ul>
          );
        }
        if (lines.every((line) => /^\d+\. /.test(line))) {
          return (
            <ol key={index} className="list-decimal space-y-1 pl-5">
              {lines.map((line, i) => <li key={i}>{inline(line.replace(/^\d+\. /, ""))}</li>)}
            </ol>
          );
        }
        if (lines.length >= 2 && lines[0].includes("|") && /^\|?\s*:?-+/.test(lines[1])) {
          const rows = [lines[0], ...lines.slice(2)].map((line) =>
            line.split("|").map((cell) => cell.trim()).filter(Boolean),
          );
          return (
            <div key={index} className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    {rows[0].map((cell, i) => <th key={i} className="border border-border p-2">{inline(cell)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(1).map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => <td key={j} className="border border-border p-2">{inline(cell)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={index} className="whitespace-pre-wrap">{inline(block)}</p>;
      })}
    </div>
  );
}

function inline(text: string): ReactNode {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("`") ? (
      <code key={index} className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.9em] text-intelligence">
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
            try {
              await copyText(code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            } catch {
              toast.error("Não foi possível copiar este código.");
            }
          }}
          className="flex items-center gap-1 hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Copiado" : "Copiar código"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-5 text-foreground"><code>{code}</code></pre>
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
        ? "Hoje"
        : time >= start - 86_400_000
          ? "Ontem"
          : time >= start - 604_800_000
            ? "Últimos 7 dias"
            : "Anteriores";
    (groups[label] ??= []).push(item);
    return groups;
  }, {});
}
