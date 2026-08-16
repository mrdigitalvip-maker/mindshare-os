import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Grid2X2,
  History,
  Mic,
  Plus,
  Search,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { NexoraAvatar, type NexoraAvatarState } from "@/components/nexora/nexora-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useChat, type ChatMessage } from "@/hooks/use-chat";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/lib/auth-context";
import { MODULES } from "@/lib/modules";
import { resolveNexoraAction } from "@/lib/nexora-actions";
import { resolveNexoraCapabilities } from "@/lib/nexora-capabilities";
import { createClientId } from "@/lib/utils";
import {
  createSpeechRecognition,
  ElevenLabsVoiceProvider,
  FallbackVoiceProvider,
} from "@/services/voice-provider";
import { AIService, AIServiceError, type AiConversation } from "@/services/ai-service";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({ meta: [{ title: "Command Center — NEXORA" }] }),
  component: Dashboard,
});
const QUESTIONS: ReadonlyArray<{ key: string; text: string; choices?: readonly string[] }> = [
  { key: "preferred_name", text: "Antes de começarmos, como você prefere que eu te chame?" },
  { key: "primary_goal", text: "O que você mais quer melhorar ou construir agora?" },
  { key: "current_focus", text: "Qual é sua prioridade nas próximas semanas?" },
  {
    key: "assistant_style",
    text: "Como você prefere que eu trabalhe com você?",
    choices: ["Direta", "Estratégica", "Detalhada"],
  },
  {
    key: "proactive_reminders",
    text: "Quer que eu te lembre quando perceber algo importante ou algo ficando para trás?",
    choices: ["Sim, por favor", "Agora não"],
  },
] as const;
function Dashboard() {
  const { user } = useAuth();
  const { data: profile, isLoading, isError } = useProfile();
  if (isLoading) return <div className="nexora-intro" aria-label="Carregando Command Center" />;
  if (isError || !profile)
    return (
      <div className="nexora-intro">
        <p>Não foi possível carregar seu perfil. Atualize a página para tentar novamente.</p>
      </div>
    );
  const preferences = (
    profile.preferences && typeof profile.preferences === "object" ? profile.preferences : {}
  ) as Record<string, unknown>;
  const introDone = profile?.onboarded && preferences.nexora_onboarding_completed === true;
  if (!introDone) return <NexoraIntro />;
  return (
    <CommandCenter
      preferredName={String(preferences.preferred_name || profile?.full_name || user?.name || "")}
    />
  );
}

function NexoraIntro() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [state, setState] = useState<NexoraAvatarState>("attention");
  const [listening, setListening] = useState(false);
  const [done, setDone] = useState(false);
  const question = QUESTIONS[step];
  function listen() {
    const recognition = createSpeechRecognition();
    if (!recognition)
      return toast.info(
        "Seu navegador não oferece reconhecimento de voz. Você ainda pode digitar.",
      );
    setListening(true);
    setState("listening");
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (e) => setAnswer(e.results[0]?.[0]?.transcript ?? "");
    recognition.onerror = () => {
      setListening(false);
      setState("idle");
      toast.error("Não consegui ouvir. Tente novamente ou digite.");
    };
    recognition.onend = () => {
      setListening(false);
      setState("idle");
    };
    try {
      recognition.start();
    } catch {
      setListening(false);
      setState("idle");
      toast.error("Não foi possível iniciar o microfone. Você ainda pode digitar.");
    }
  }
  async function submit(value = answer) {
    if (!value.trim() || updateProfile.isPending) return;
    const next = { ...answers, [question.key]: value.trim() };
    setAnswers(next);
    setAnswer("");
    if (step < QUESTIONS.length - 1) {
      setState("thinking");
      window.setTimeout(() => {
        setStep((s) => s + 1);
        setState("attention");
      }, 350);
      return;
    }
    setState("thinking");
    try {
      await updateProfile.mutateAsync({
        full_name: next.preferred_name,
        primary_goal: next.primary_goal,
        onboarded: true,
        preferences: {
          ...(profile?.preferences ?? {}),
          ...next,
          proactive_reminders: next.proactive_reminders.startsWith("Sim"),
          nexora_persona: "nexora",
          nexora_onboarding_completed: true,
        },
      });
      setDone(true);
      setState("success");
    } catch {
      setState("attention");
      toast.error("Não foi possível salvar seu contexto. Tente novamente.");
    }
  }
  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => setDone(false), 1400);
    return () => clearTimeout(id);
  }, [done]);
  if (done)
    return (
      <div className="nexora-intro">
        <NexoraAvatar state="success" />
        <div className="text-center">
          <p className="text-xs uppercase tracking-[.35em] text-gold">Contexto salvo</p>
          <h1 className="mt-3 font-display text-3xl">
            Perfeito. Já tenho contexto suficiente para começar.
          </h1>
        </div>
      </div>
    );
  return (
    <div className="nexora-intro">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(194,139,78,.13),transparent_43%)]" />
      <NexoraAvatar state={state} />
      <section className="relative w-full max-w-xl text-center" aria-live="polite">
        <p className="text-xs uppercase tracking-[.32em] text-gold">NEXORA · primeiro contato</p>
        <h1 className="mt-4 font-display text-2xl leading-snug sm:text-4xl">{question.text}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {step + 1} de {QUESTIONS.length} · responda do seu jeito
        </p>
        {question.choices ? (
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {question.choices.map((choice) => (
              <Button
                key={choice}
                variant="outline"
                className="rounded-full"
                onClick={() => void submit(choice)}
              >
                {choice}
              </Button>
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-7 flex max-w-md items-end gap-2">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder="Sua resposta…"
              className="min-h-12 resize-none rounded-2xl"
              aria-label="Sua resposta"
            />
            <Button
              size="icon"
              variant={listening ? "default" : "outline"}
              onClick={listen}
              aria-label="Responder por voz"
            >
              <Mic />
            </Button>
            <Button
              size="icon"
              onClick={() => void submit()}
              disabled={!answer.trim() || updateProfile.isPending}
              aria-label="Continuar"
            >
              <Send />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function CommandCenter({ preferredName }: { preferredName: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const subscription = useSubscription();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedText, setFailedText] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [listening, setListening] = useState(false);
  const [idlePrompt, setIdlePrompt] = useState("");
  const [online, setOnline] = useState(true);
  const [actionSucceeded, setActionSucceeded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition>>(null);
  const voiceRef = useRef(new ElevenLabsVoiceProvider());
  const endRef = useRef<HTMLDivElement>(null);
  const { sendMessage, isSending, loadConversationHistory, startConversation } = useChat();
  const voiceOutputEnabled =
    (profile?.preferences as Record<string, unknown>)?.voice_output_enabled === true;
  const conversationsKey = ["workspace", user?.id, "ai-conversations"] as const;
  const conversations = useQuery({
    queryKey: conversationsKey,
    queryFn: () => AIService.listConversations(),
    enabled: !!user,
    staleTime: 30_000,
  });
  const avatarState: NexoraAvatarState = listening
    ? "listening"
    : isSending
      ? "thinking"
      : speaking
        ? "speaking"
        : actionSucceeded
          ? "success"
          : idlePrompt
            ? "attention"
            : "idle";
  const filtered = useMemo(
    () =>
      (Array.isArray(conversations.data) ? conversations.data : []).filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [conversations.data, search],
  );
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, isSending]);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    setOnline(navigator.onLine);
    addEventListener("online", on);
    addEventListener("offline", off);
    return () => {
      removeEventListener("online", on);
      removeEventListener("offline", off);
    };
  }, []);
  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      voiceRef.current.stop();
    },
    [],
  );
  useEffect(() => {
    if (!actionSucceeded) return;
    const timer = window.setTimeout(() => setActionSucceeded(false), 1200);
    return () => clearTimeout(timer);
  }, [actionSucceeded]);
  useEffect(() => {
    let timer: number;
    const reset = () => {
      setIdlePrompt("");
      clearTimeout(timer);
      if (document.visibilityState === "visible")
        timer = window.setTimeout(() => {
          if (document.visibilityState === "visible")
            setIdlePrompt("Posso organizar seu próximo passo.");
        }, 60_000);
    };
    const events = ["pointerdown", "keydown"] as const;
    events.forEach((e) => addEventListener(e, reset));
    document.addEventListener("visibilitychange", reset);
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", reset);
    };
  }, []);
  function fresh() {
    startConversation();
    setMessages([]);
    setActiveId(null);
    setInput("");
    setError(null);
    setHistoryOpen(false);
  }
  async function open(item: AiConversation) {
    try {
      setMessages(await loadConversationHistory(item.id));
      setActiveId(item.id);
      setHistoryOpen(false);
      setError(null);
    } catch {
      setError(
        "Não foi possível abrir o histórico. O restante do Command Center continua disponível.",
      );
    }
  }
  async function send(value = input) {
    const text = value.trim();
    if (!text || isSending || !online) return;
    const optimistic: ChatMessage = { id: createClientId(), role: "user", content: text };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    setError(null);
    setIdlePrompt("");
    try {
      const result = await sendMessage({ content: text, requestId: optimistic.id });
      setMessages((m) => [
        ...m.filter((x) => x.id !== optimistic.id),
        result.userMessage,
        result.assistantMessage,
      ]);
      setActiveId(result.conversationId);
      await queryClient.invalidateQueries({ queryKey: conversationsKey });
      if (voiceOutputEnabled) {
        setSpeaking(true);
        try {
          const advanced = voiceRef.current;
          const provider = (await advanced.isAvailable()) ? advanced : new FallbackVoiceProvider();
          await provider.speak(result.assistantMessage.content);
        } catch {
          toast.info("Voz indisponível agora. A conversa por texto continua funcionando.");
        } finally {
          setSpeaking(false);
        }
      }
      if (result.action) {
        const route =
          result.action.type === "navigation" ? resolveNexoraAction(result.action.name) : null;
        if (!route) {
          console.warn("NEXORA ignored an invalid action", { type: result.action.type });
        } else {
          try {
            setActionSucceeded(true);
            await navigate({ to: route });
          } catch {
            setActionSucceeded(false);
            toast.error("Não foi possível abrir essa área. A resposta foi mantida.");
          }
        }
      }
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setInput(text);
      setFailedText(text);
      setError(
        e instanceof AIServiceError
          ? e.message
          : "A NEXORA não respondeu. Seu texto foi preservado para tentar novamente.",
      );
    }
  }
  function listen() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = createSpeechRecognition();
    if (!recognition)
      return toast.info(
        "Reconhecimento de voz indisponível neste navegador. Digite sua mensagem normalmente.",
      );
    setListening(true);
    recognitionRef.current = recognition;
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (e) =>
      setInput((old) => [old, e.results[0]?.[0]?.transcript].filter(Boolean).join(" "));
    recognition.onerror = () =>
      toast.error("Não consegui transcrever. Sua mensagem digitada foi mantida.");
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      toast.error("Não foi possível iniciar o microfone.");
    }
  }
  async function toggleVoiceOutput() {
    voiceRef.current.stop();
    setSpeaking(false);
    try {
      await updateProfile.mutateAsync({
        preferences: {
          ...(profile?.preferences ?? {}),
          voice_output_enabled: !voiceOutputEnabled,
        },
      });
      toast.success(!voiceOutputEnabled ? "Voz de saída ativada" : "Voz de saída desativada");
    } catch {
      toast.error("Não foi possível salvar a preferência de voz.");
    }
  }
  const capabilities = resolveNexoraCapabilities(subscription.data);
  return (
    <div className="command-center">
      <header className="command-center__presence">
        <div className="flex items-center gap-3">
          <NexoraAvatar state={avatarState} compact />
          <div>
            <p className="text-[10px] uppercase tracking-[.28em] text-gold">
              {capabilities.label} · online
            </p>
            <h1 className="font-display text-xl sm:text-2xl">
              {preferredName ? `Olá, ${preferredName}.` : "Estou com você."}
            </h1>
            <p className="hidden text-sm text-muted-foreground sm:block">
              Converse comigo ou abra qualquer parte do seu sistema.
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void toggleVoiceOutput()}
            aria-label={voiceOutputEnabled ? "Desativar voz de saída" : "Ativar voz de saída"}
            aria-pressed={voiceOutputEnabled}
          >
            {voiceOutputEnabled ? <Volume2 /> : <VolumeX />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHistoryOpen(true)}
            aria-label="Histórico"
          >
            <History />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAppsOpen(true)}
            aria-label="Aplicativos"
          >
            <Grid2X2 />
          </Button>
        </div>
      </header>
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <WifiOff className="h-4 w-4" />
          Sem conexão. Seu rascunho será preservado.
        </div>
      )}
      <main className="command-center__messages" aria-live="polite" aria-busy={isSending}>
        {!messages.length && (
          <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center py-10 text-center">
            <Sparkles className="h-7 w-7 text-gold" />
            <h2 className="mt-4 font-display text-3xl">O que vamos mover hoje?</h2>
            <p className="mt-3 text-muted-foreground">
              Posso pensar, planejar, criar e ajudar você a encontrar funções no NEXORA.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => void send("Planeje minhas prioridades desta semana")}
              >
                Planejar a semana
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => navigate({ to: "/projects" })}
              >
                Abrir projetos
              </Button>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <article
            key={m.id}
            className={`command-message ${m.role === "user" ? "is-user" : "is-assistant"}`}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.role === "assistant" && (
              <Button
                variant="ghost"
                size="icon"
                className="mt-1 h-7 w-7"
                onClick={() => {
                  void navigator.clipboard.writeText(m.content);
                  toast.success("Copiado");
                }}
                aria-label="Copiar resposta"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
          </article>
        ))}
        {isSending && (
          <div className="command-message is-assistant flex items-center gap-2 text-muted-foreground">
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-dot" /> Pensando…
          </div>
        )}
        {idlePrompt && !messages.length && (
          <button
            className="mx-auto block rounded-full border border-gold/20 bg-gold/5 px-4 py-2 text-sm text-gold"
            onClick={() => {
              setInput(idlePrompt);
              setIdlePrompt("");
            }}
          >
            {idlePrompt}
          </button>
        )}
        {error && (
          <div className="mx-auto max-w-xl rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p>{error}</p>
            {failedText && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void send(failedText)}
              >
                Tentar novamente
              </Button>
            )}
          </div>
        )}
        <div ref={endRef} />
      </main>
      <footer className="command-center__composer">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Button
            variant={listening ? "default" : "ghost"}
            size="icon"
            onClick={listen}
            aria-label={listening ? "Ouvindo" : "Usar voz"}
          >
            <Mic />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={listening ? "Ouvindo… revise antes de enviar" : "Converse com a NEXORA…"}
            className="max-h-36 min-h-12 resize-none border-0 bg-transparent focus-visible:ring-0"
            aria-label="Mensagem para NEXORA"
          />
          {isSending ? (
            <Button size="icon" variant="ghost" disabled aria-label="Aguarde">
              <Square />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={() => void send()}
              disabled={!input.trim() || !online}
              aria-label="Enviar"
            >
              <Send />
            </Button>
          )}
        </div>
      </footer>
      <HistorySheet
        open={historyOpen}
        setOpen={setHistoryOpen}
        items={filtered}
        search={search}
        setSearch={setSearch}
        loading={conversations.isLoading}
        error={conversations.isError}
        fresh={fresh}
        openConversation={open}
        premium={!!subscription.data?.isPremium}
      />
      <AppsDialog open={appsOpen} setOpen={setAppsOpen} />
    </div>
  );
}

function HistorySheet({
  open,
  setOpen,
  items,
  search,
  setSearch,
  loading,
  error,
  fresh,
  openConversation,
  premium,
}: {
  open: boolean;
  setOpen(v: boolean): void;
  items: AiConversation[];
  search: string;
  setSearch(v: string): void;
  loading: boolean;
  error: boolean;
  fresh(): void;
  openConversation(i: AiConversation): void;
  premium: boolean;
}) {
  const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = items.filter((item) => new Date(item.updatedAt).getTime() >= recentCutoff);
  const older = items.filter((item) => new Date(item.updatedAt).getTime() < recentCutoff);
  const renderConversation = (item: AiConversation) => (
    <button
      key={item.id}
      onClick={() => void openConversation(item)}
      className="w-full truncate rounded-xl px-3 py-3 text-left text-sm hover:bg-accent"
    >
      {item.title}
    </button>
  );
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[min(90vw,360px)]">
        <SheetHeader>
          <SheetTitle>Conversas</SheetTitle>
          <SheetDescription>
            {premium
              ? "Seu plano inclui histórico completo."
              : "Plano Free mantém histórico dos últimos 30 dias."}
          </SheetDescription>
        </SheetHeader>
        <Button className="mt-5 w-full" onClick={fresh}>
          <Plus />
          Nova conversa
        </Button>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            placeholder="Buscar conversas"
          />
        </div>
        <div className="mt-4 space-y-1 overflow-y-auto">
          {loading && <p className="p-3 text-sm text-muted-foreground">Carregando…</p>}
          {error && <p className="p-3 text-sm text-destructive">Histórico indisponível agora.</p>}
          {!loading && !error && items.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
          )}
          {recent.length > 0 && (
            <section aria-labelledby="recent-conversations">
              <h3
                id="recent-conversations"
                className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Recentes
              </h3>
              {recent.map(renderConversation)}
            </section>
          )}
          {older.length > 0 && (
            <section aria-labelledby="older-conversations">
              <h3
                id="older-conversations"
                className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Anteriores
              </h3>
              {older.map(renderConversation)}
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
function AppsDialog({ open, setOpen }: { open: boolean; setOpen(v: boolean): void }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sistema NEXORA</DialogTitle>
          <DialogDescription>Abra uma função real do seu workspace.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MODULES.filter((m) => m.id !== "search").map((m) => (
            <Link
              key={m.id}
              to={m.path}
              onClick={() => setOpen(false)}
              className="rounded-2xl border border-border p-4 hover:border-gold/40"
            >
              <m.icon className="h-5 w-5 text-gold" />
              <strong className="mt-3 block text-sm">{m.label}</strong>
              <span className="mt-1 block text-xs text-muted-foreground">{m.description}</span>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
