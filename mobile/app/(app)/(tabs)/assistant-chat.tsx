import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Speech from "expo-speech";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

import { ErrorState, LoadingState } from "@/components/screen-state";
import { useConversation, useConversations, useSendChat } from "@/hooks/use-chat";
import { isGenericConversationTitle } from "@/lib/assistant-conversations";
import { assistantErrorCopy, createAssistantRequestId } from "@/lib/chat-contract";
import {
  ASSISTANT_QUICK_ACTIONS,
  attachmentFromPickerAsset,
  canSendAssistantMessage,
  removeAssistantAttachment,
  resolveQuickAction,
} from "@/lib/assistant-composer";
import { reconcileAssistantMessages } from "@/lib/assistant-messages";
import {
  formatFileSize,
  validateChatAttachment,
  type ChatAttachment,
  type LocalChatAttachment,
} from "@/lib/chat-attachments";
import {
  actionInvalidationRoots,
  actionPreview,
  actionReceipt,
  actionResultRoute,
  type NexoraAction,
  type NexoraActionStatus,
} from "@/lib/nexora-actions";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";
import { uploadChatAttachment } from "@/services/chat-attachment-service";
import { transcribeAssistantRecording } from "@/services/assistant-voice-service";
import { ChatServiceError, type ChatMessage } from "@/services/chat-service";
import { applyNexoraAction, NexoraActionError } from "@/services/nexora-action-service";

const uuid = () => createAssistantRequestId();

type ProposalItem = {
  action: NexoraAction;
  actionId: string;
  requestId: string;
  status: NexoraActionStatus;
  resourceId?: string;
  message?: string;
  canRetry?: boolean;
};

const copy = {
  "pt-BR": {
    title: "KIVRYN",
    subtitle: "Assistant",
    newChat: "Novo chat",
    history: "Conversas",
    search: "Buscar conversas",
    noHistory: "Nenhuma conversa encontrada.",
    emptyTitle: "Como posso ajudar?",
    emptyBody: "Pergunte, planeje ou peça uma ação. A conversa ocupa o centro; o restante fica fora do caminho.",
    message: "Mensagem para a KIVRYN…",
    thinking: "KIVRYN está pensando…",
    activity: "Atualizada",
    generic: "Conversa com a KIVRYN",
    speak: "Falar com a KIVRYN",
    stopVoice: "Parar gravação",
    transcribing: "Transcrevendo voz…",
    microphoneDenied: "Permita o acesso ao microfone para usar a entrada de voz.",
    transcriptionFailed: "Não foi possível transcrever o áudio.",
    voiceConversation: "Conversa por voz",
    voiceConversationActive: "Conversa por voz ativa",
    voiceConversationBody: "Ative para enviar a fala transcrita e ouvir a resposta automaticamente.",
    voiceConversationBodyActive: "Toque no microfone para cada turno. Ações continuam exigindo confirmação manual.",
    activateVoiceConversation: "Ativar",
    endVoiceConversation: "Encerrar",
  },
  en: {
    title: "KIVRYN",
    subtitle: "Assistant",
    newChat: "New chat",
    history: "Conversations",
    search: "Search conversations",
    noHistory: "No conversations found.",
    emptyTitle: "How can I help?",
    emptyBody: "Ask, plan or request an action. The conversation stays central and everything else stays out of the way.",
    message: "Message KIVRYN…",
    thinking: "KIVRYN is thinking…",
    activity: "Updated",
    generic: "Conversation with KIVRYN",
    speak: "Speak to KIVRYN",
    stopVoice: "Stop recording",
    transcribing: "Transcribing voice…",
    microphoneDenied: "Allow microphone access to use voice input.",
    transcriptionFailed: "The audio could not be transcribed.",
    voiceConversation: "Voice conversation",
    voiceConversationActive: "Voice conversation active",
    voiceConversationBody: "Enable to send transcribed speech and hear replies automatically.",
    voiceConversationBodyActive: "Tap the microphone for each turn. Actions still require manual confirmation.",
    activateVoiceConversation: "Enable",
    endVoiceConversation: "End",
  },
} as const;

export default function AssistantChat() {
  const {
    prompt,
    conversationId: routeConversationId,
    attachment: attachmentIntent,
  } = useLocalSearchParams<{ prompt?: string; conversationId?: string; attachment?: string }>();
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const conversationId = routeConversationId?.trim() || null;
  const list = useRef<FlatList<ChatMessage>>(null);
  const nearBottom = useRef(true);
  const submitting = useRef(false);
  const applyingActions = useRef(new Set<string>());
  const handledPrompt = useRef<string | undefined>(undefined);
  const voiceSession = useRef(0);
  const history = useConversation(conversationId);
  const conversations = useConversations();
  const send = useSendChat();
  const queryClient = useQueryClient();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 200);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceConversationMode, setVoiceConversationMode] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<LocalChatAttachment | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [failed, setFailed] = useState<{
    content: string;
    requestId: string;
    code?: string;
    uploadedAttachment?: ChatAttachment;
  } | null>(null);
  const [optimistic, setOptimistic] = useState<ChatMessage | null>(null);
  const [proposal, setProposal] = useState<{
    conversationId: string;
    items: ProposalItem[];
  } | null>(null);

  const messages = useMemo(
    () => reconcileAssistantMessages(history.data, optimistic),
    [history.data, optimistic],
  );
  const filteredConversations = useMemo(() => {
    const query = historySearch.trim().toLocaleLowerCase();
    return (conversations.data ?? []).filter((item) => {
      const title = isGenericConversationTitle(item.title) ? text.generic : item.title ?? text.generic;
      return !query || title.toLocaleLowerCase().includes(query);
    });
  }, [conversations.data, historySearch, text.generic]);

  useEffect(
    () => () => {
      voiceSession.current += 1;
      void Speech.stop();
      void audioRecorder.stop().catch(() => undefined);
      void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    },
    [audioRecorder],
  );

  const validateDraft = (next: LocalChatAttachment) => {
    const error = validateChatAttachment(next);
    if (error) {
      Alert.alert(
        "Arquivo não suportado",
        error === "ATTACHMENT_SIZE"
          ? "Escolha um arquivo de até 6 MB."
          : "Use JPG, PNG, WEBP ou texto simples.",
      );
      return;
    }
    setAttachment(next);
    setFailed(null);
  };

  const pickGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Acesso às fotos negado",
          "Libere o acesso nas configurações do Android para escolher uma foto.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled) return;
      const next = attachmentFromPickerAsset(result.assets[0], "image", uuid());
      if (next) validateDraft(next);
    } catch {
      Alert.alert("Galeria indisponível", "Não foi possível abrir suas fotos agora.");
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Câmera não autorizada",
          "Libere a câmera nas configurações do Android para fotografar.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 });
      if (result.canceled) return;
      const next = attachmentFromPickerAsset(result.assets[0], "image", uuid());
      if (next) validateDraft(next);
    } catch {
      Alert.alert("Câmera indisponível", "Não foi possível abrir a câmera neste aparelho.");
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/plain",
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const next = attachmentFromPickerAsset(result.assets[0], "document", uuid());
      if (next) validateDraft(next);
    } catch {
      Alert.alert("Arquivo indisponível", "Não foi possível abrir o seletor de arquivos.");
    }
  };

  const runPicker = (picker: "camera" | "gallery" | "document") => {
    setAttachmentMenuOpen(false);
    if (picker === "camera") void takePhoto();
    else if (picker === "gallery") void pickGallery();
    else void pickDocument();
  };

  const startNewChat = useCallback(() => {
    voiceSession.current += 1;
    void Speech.stop();
    if (recorderState.isRecording) void audioRecorder.stop().catch(() => undefined);
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    applyingActions.current.clear();
    handledPrompt.current = undefined;
    setProposal(null);
    setVoiceConversationMode(false);
    setDraft("");
    setAttachment(null);
    setFailed(null);
    setOptimistic(null);
    setHistoryOpen(false);
    router.replace("/(app)/(tabs)/assistant-chat");
  }, [audioRecorder, recorderState.isRecording]);

  const openConversation = useCallback((id: string) => {
    voiceSession.current += 1;
    void Speech.stop();
    if (recorderState.isRecording) void audioRecorder.stop().catch(() => undefined);
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    applyingActions.current.clear();
    setProposal(null);
    setVoiceConversationMode(false);
    setFailed(null);
    setOptimistic(null);
    setHistoryOpen(false);
    router.replace({ pathname: "/(app)/(tabs)/assistant-chat", params: { conversationId: id } });
  }, [audioRecorder, recorderState.isRecording]);

  const speakAssistantMessage = useCallback(
    async (item: ChatMessage) => {
      await Speech.stop();
      setSpeakingId(item.id);
      Speech.speak(item.content, {
        language: resolvedLocale === "pt-BR" ? "pt-BR" : "en-US",
        onDone: () => setSpeakingId(null),
        onStopped: () => setSpeakingId(null),
        onError: () => {
          setSpeakingId(null);
          Alert.alert("Áudio indisponível", "Não foi possível reproduzir esta resposta.");
        },
      });
    },
    [resolvedLocale],
  );

  const toggleVoiceConversationMode = useCallback(() => {
    if (send.isPending || uploading || transcribing || recorderState.isRecording) return;
    if (voiceConversationMode) {
      void Speech.stop();
      setSpeakingId(null);
      setVoiceConversationMode(false);
      return;
    }
    if (attachment) {
      Alert.alert(
        text.voiceConversation,
        resolvedLocale === "en"
          ? "Remove the attachment before starting a voice conversation."
          : "Remova o anexo antes de iniciar uma conversa por voz.",
      );
      return;
    }
    setVoiceConversationMode(true);
  }, [
    attachment,
    recorderState.isRecording,
    resolvedLocale,
    send.isPending,
    text.voiceConversation,
    transcribing,
    uploading,
    voiceConversationMode,
  ]);

  const submit = useCallback(
    async (
      value: string,
      retryId?: string,
      retryAttachment?: ChatAttachment,
      options: { fromVoice?: boolean } = {},
    ) => {
      const content = value.trim();
      const currentAttachment = options.fromVoice ? null : attachment;
      if (
        (!content && !currentAttachment) ||
        submitting.current ||
        send.isPending ||
        uploading ||
        (!options.fromVoice && (transcribing || recorderState.isRecording))
      ) return;
      submitting.current = true;
      setProposal(null);
      const id = retryId ?? createAssistantRequestId();
      const preservedDraft = content;
      if (!retryId) setDraft("");
      setFailed(null);
      setUploading(Boolean(currentAttachment && !retryAttachment));
      let uploaded = retryAttachment;
      try {
        uploaded ??= currentAttachment ? await uploadChatAttachment(currentAttachment, id) : undefined;
        const finalContent =
          content || (currentAttachment?.kind === "image" ? "Analise esta imagem." : "Analise este arquivo.");
        setOptimistic({
          id,
          role: "user",
          content: finalContent,
          createdAt: null,
          attachments: uploaded ? [uploaded] : [],
        });
        const result = await send.mutateAsync({
          message: finalContent,
          conversationId,
          requestId: id,
          attachments: uploaded ? [uploaded] : [],
        });
        setProposal(
          result.proposedActions.length
            ? {
                conversationId: result.conversationId,
                items: result.proposedActions.map((action) => {
                  const stableId = createAssistantRequestId();
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
        setAttachment(null);
        if (!conversationId) router.setParams({ conversationId: result.conversationId });
        setOptimistic(null);
        if (voiceConversationMode) {
          await speakAssistantMessage(result.assistantMessage);
        }
      } catch (error) {
        const code = error instanceof ChatServiceError ? error.code : undefined;
        if (__DEV__) {
          const diagnostic =
            error instanceof ChatServiceError
              ? {
                  code: error.code,
                  category: error.category,
                  status: error.status,
                  stage: error.stage,
                  diagnosticId: error.diagnosticId,
                }
              : { code: "unexpected", stage: "client" };
          console.warn("[assistant-send]", diagnostic);
        }
        setOptimistic(null);
        setFailed({ content, requestId: id, code, uploadedAttachment: uploaded });
        if (!retryId) setDraft(preservedDraft);
      } finally {
        submitting.current = false;
        setUploading(false);
      }
    },
    [
      attachment,
      conversationId,
      recorderState.isRecording,
      send,
      speakAssistantMessage,
      transcribing,
      uploading,
      voiceConversationMode,
    ],
  );

  useEffect(() => {
    if ((!conversationId || history.isSuccess) && prompt && handledPrompt.current !== prompt) {
      handledPrompt.current = prompt;
      void submit(prompt);
    }
  }, [conversationId, history.isSuccess, prompt, submit]);

  useEffect(() => {
    if (attachmentIntent === "open") setAttachmentMenuOpen(true);
  }, [attachmentIntent]);

  useEffect(() => {
    if (proposal && conversationId && proposal.conversationId !== conversationId) setProposal(null);
  }, [conversationId, proposal]);

  useEffect(() => {
    if (messages.length && nearBottom.current) {
      requestAnimationFrame(() => list.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", () => {
      if (nearBottom.current) {
        requestAnimationFrame(() => list.current?.scrollToEnd({ animated: true }));
      }
    });
    return () => subscription.remove();
  }, []);

  const startVoiceInput = async () => {
    if (send.isPending || uploading || transcribing || recorderState.isRecording) return;
    if (
      voiceConversationMode &&
      proposal?.items.some((item) => item.status === "pending" || item.status === "failed")
    ) {
      Alert.alert(
        text.voiceConversation,
        resolvedLocale === "en"
          ? "Review the proposed action before continuing the voice conversation."
          : "Revise a ação proposta antes de continuar a conversa por voz.",
      );
      return;
    }
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(text.speak, text.microphoneDenied);
        return;
      }
      await Speech.stop();
      setSpeakingId(null);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      voiceSession.current += 1;
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      Alert.alert(text.speak, text.transcriptionFailed);
    }
  };

  const stopVoiceInput = async () => {
    if (!recorderState.isRecording || transcribing) return;
    const session = voiceSession.current;
    let transcriptToSend = "";
    setTranscribing(true);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error("missing_recording");
      const transcript = await transcribeAssistantRecording(uri, resolvedLocale);
      if (transcript && session === voiceSession.current) {
        setFailed(null);
        if (voiceConversationMode) {
          transcriptToSend = transcript;
          setDraft("");
        } else {
          setDraft((current) => {
            const base = current.trim();
            return base ? `${base} ${transcript}` : transcript;
          });
        }
      }
    } catch {
      Alert.alert(text.speak, text.transcriptionFailed);
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      setTranscribing(false);
    }
    if (transcriptToSend) {
      await submit(transcriptToSend, undefined, undefined, { fromVoice: true });
    }
  };

  const toggleSpeech = async (item: ChatMessage) => {
    try {
      if (speakingId === item.id) {
        await Speech.stop();
        setSpeakingId(null);
        return;
      }
      await speakAssistantMessage(item);
    } catch {
      setSpeakingId(null);
      Alert.alert("Áudio indisponível", "Não foi possível reproduzir esta resposta.");
    }
  };

  const updateProposalItem = (actionId: string, patch: Partial<ProposalItem>) =>
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

  const confirmAction = async (item: ProposalItem) => {
    if (
      applyingActions.current.has(item.actionId) ||
      !proposal ||
      proposal.conversationId !== conversationId ||
      !["pending", "failed"].includes(item.status)
    ) {
      return;
    }
    applyingActions.current.add(item.actionId);
    updateProposalItem(item.actionId, { status: "applying", message: undefined });
    try {
      const result = await applyNexoraAction({
        actionId: item.actionId,
        requestId: item.requestId,
        conversationId: proposal.conversationId,
        confirmed: true,
        action: item.action,
      });
      updateProposalItem(item.actionId, {
        status: "applied",
        resourceId: result.resourceId,
        message: actionReceipt(item.action),
        canRetry: false,
      });
      await Promise.allSettled(
        actionInvalidationRoots([item.action]).map((root) =>
          queryClient.invalidateQueries({ queryKey: [root] }),
        ),
      );
    } catch (error) {
      const safe =
        error instanceof NexoraActionError
          ? error.safe
          : { kind: "unexpected", message: "Não foi possível aplicar a alteração.", retry: true };
      if (__DEV__) console.warn("[nexora-action]", { kind: safe.kind });
      updateProposalItem(item.actionId, {
        status: "failed",
        message: safe.message,
        canRetry: safe.retry,
      });
    } finally {
      applyingActions.current.delete(item.actionId);
    }
  };

  if (conversationId && history.isPending) return <LoadingState title="Carregando conversa…" />;
  if (history.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar agora."
        message="Seu histórico continua salvo. Verifique sua conexão."
        actionLabel="Tentar novamente"
        onAction={() => void history.refetch()}
      />
    );
  }

  const errorCopy = failed ? assistantErrorCopy(failed.code) : null;
  const busy = send.isPending || uploading || transcribing;
  const canSend = canSendAssistantMessage(
    draft,
    attachment,
    busy || recorderState.isRecording,
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.history}
          onPress={() => setHistoryOpen(true)}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.brand}>{text.title}</Text>
          <Text style={styles.status}>{send.isPending ? text.thinking : text.subtitle}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.newChat}
          onPress={startNewChat}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Text style={styles.newIcon}>＋</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "android" ? "height" : "padding"}
        keyboardVerticalOffset={0}
        style={styles.keyboardArea}
      >
        <FlatList
          ref={list}
          style={styles.conversation}
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onScroll={({ nativeEvent }) => {
            const distance =
              nativeEvent.contentSize.height -
              nativeEvent.layoutMeasurement.height -
              nativeEvent.contentOffset.y;
            nearBottom.current = distance < 120;
          }}
          scrollEventThrottle={80}
          contentContainerStyle={messages.length ? styles.list : styles.emptyList}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyMark}>
                <Text style={styles.emptySpark}>✦</Text>
              </View>
              <Text style={styles.emptyTitle}>{text.emptyTitle}</Text>
              <Text style={styles.emptyBody}>{text.emptyBody}</Text>
              <View style={styles.starters}>
                {ASSISTANT_QUICK_ACTIONS.slice(0, 4).map((action) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    key={action.label}
                    onPress={() => {
                      const resolved = resolveQuickAction(action);
                      if (resolved.picker) runPicker(resolved.picker);
                      else setDraft(resolved.draft);
                    }}
                    style={({ pressed }) => [styles.starter, pressed && styles.pressed]}
                  >
                    <Text numberOfLines={2} style={styles.starterText}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.role === "user" && styles.userRow]}>
              {item.role === "assistant" ? <Text style={styles.author}>KIVRYN</Text> : null}
              <View style={item.role === "user" ? styles.userMessage : styles.assistantMessage}>
                {item.attachments.map((file) =>
                  file.kind === "image" && file.previewUri ? (
                    <Image key={file.id} source={{ uri: file.previewUri }} style={styles.sentImage} />
                  ) : (
                    <View key={file.id} style={styles.fileChip}>
                      <Text style={styles.fileName}>▤ {file.name}</Text>
                      <Text style={styles.fileMeta}>{file.mimeType} · {formatFileSize(file.size)}</Text>
                    </View>
                  ),
                )}
                <Text selectable style={styles.messageText}>{item.content}</Text>
              </View>
              {item.role === "assistant" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${speakingId === item.id ? "Parar" : "Ouvir"} resposta da KIVRYN`}
                  onPress={() => void toggleSpeech(item)}
                  style={({ pressed }) => [styles.listen, pressed && styles.pressed]}
                >
                  <Text style={styles.listenText}>{speakingId === item.id ? "Parar" : "Ouvir"}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
          ListFooterComponent={
            <>
              {send.isPending ? <Text style={styles.thinking}>✦ {text.thinking}</Text> : null}
              {proposal ? (
                <View style={styles.actionCard}>
                  <Text style={styles.actionEyebrow}>
                    {proposal.items.length === 1 ? "ALTERAÇÃO PROPOSTA" : "ALTERAÇÕES PROPOSTAS"}
                  </Text>
                  {proposal.items.map((item) => {
                    const preview = actionPreview(item.action);
                    const resultRoute = item.resourceId
                      ? actionResultRoute(item.action, item.resourceId)
                      : null;
                    return (
                      <View key={item.actionId} style={styles.actionItem}>
                        <Text style={styles.actionTitle}>{preview.label}</Text>
                        {preview.details.map((detail) => (
                          <Text key={detail} style={styles.actionDetail}>• {detail}</Text>
                        ))}
                        {item.message ? (
                          <Text accessibilityRole="alert" style={styles.actionStatus}>{item.message}</Text>
                        ) : null}
                        {item.status === "pending" || item.status === "failed" ? (
                          <View style={styles.actionButtons}>
                            <Pressable
                              onPress={() =>
                                updateProposalItem(item.actionId, {
                                  status: "cancelled",
                                  message: "Alteração cancelada. Nada foi modificado.",
                                  canRetry: false,
                                })
                              }
                              style={styles.cancelAction}
                            >
                              <Text style={styles.actionButtonMuted}>Cancelar</Text>
                            </Pressable>
                            {(item.status === "pending" || item.canRetry) ? (
                              <Pressable onPress={() => void confirmAction(item)} style={styles.confirmAction}>
                                <Text style={styles.actionButtonText}>
                                  {item.status === "failed" ? "Tentar novamente" : "Confirmar"}
                                </Text>
                              </Pressable>
                            ) : null}
                          </View>
                        ) : item.status === "applying" ? (
                          <View style={styles.applyingRow}>
                            <ActivityIndicator color={colors.primaryBright} />
                            <Text style={styles.actionDetail}>Aplicando…</Text>
                          </View>
                        ) : null}
                        {resultRoute && item.status === "applied" ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => router.push(resultRoute.href)}
                            style={styles.openResult}
                          >
                            <Text style={styles.actionButtonText}>{resultRoute.label}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </>
          }
        />

        {errorCopy ? (
          <View accessibilityRole="alert" style={styles.error}>
            <View style={styles.flex}>
              <Text style={styles.errorTitle}>{errorCopy.title}</Text>
              <Text style={styles.errorDetail}>{errorCopy.detail}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tentar enviar novamente"
              disabled={busy}
              onPress={() => void submit(failed!.content, failed!.requestId, failed!.uploadedAttachment)}
            >
              <Text style={styles.retry}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : null}

        {attachment ? (
          <View style={styles.preview}>
            {attachment.kind === "image" ? (
              <Image source={{ uri: attachment.uri }} style={styles.thumb} />
            ) : (
              <Text style={styles.docIcon}>▤</Text>
            )}
            <View style={styles.flex}>
              <Text numberOfLines={1} style={styles.fileName}>{attachment.name}</Text>
              <Text style={styles.fileMeta}>
                {attachment.mimeType} · {formatFileSize(attachment.size)}
                {uploading ? " · Enviando…" : " · Pronto"}
              </Text>
            </View>
            {uploading ? (
              <ActivityIndicator color={colors.primaryBright} />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover anexo ${attachment.name}`}
                onPress={() => {
                  setAttachment(removeAssistantAttachment());
                  setFailed(null);
                }}
              >
                <Text style={styles.remove}>×</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {attachmentMenuOpen ? (
          <View accessibilityRole="menu" style={styles.attachmentMenu}>
            <View style={styles.menuHeading}>
              <View style={styles.flex}>
                <Text style={styles.menuTitle}>Adicionar ao chat</Text>
                <Text style={styles.menuCaption}>Imagem, câmera ou arquivo de texto.</Text>
              </View>
              <Pressable onPress={() => setAttachmentMenuOpen(false)} hitSlop={8}>
                <Text style={styles.menuClose}>×</Text>
              </Pressable>
            </View>
            <View style={styles.menuActions}>
              {([
                ["camera", "◎", "Câmera"],
                ["gallery", "▧", "Galeria"],
                ["document", "▤", "Arquivo"],
              ] as const).map(([value, icon, label]) => (
                <Pressable
                  accessibilityRole="menuitem"
                  accessibilityLabel={label}
                  key={value}
                  onPress={() => runPicker(value)}
                  style={({ pressed }) => [styles.menuAction, pressed && styles.pressed]}
                >
                  <Text style={styles.menuActionIcon}>{icon}</Text>
                  <Text style={styles.menuActionText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.composerWrap}>
          <View style={styles.voiceConversationBar}>
            <View style={styles.voiceConversationCopy}>
              <Text style={styles.voiceConversationTitle}>
                {voiceConversationMode ? text.voiceConversationActive : text.voiceConversation}
              </Text>
              <Text style={styles.voiceConversationBody}>
                {voiceConversationMode ? text.voiceConversationBodyActive : text.voiceConversationBody}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: voiceConversationMode }}
              disabled={send.isPending || uploading || transcribing || recorderState.isRecording}
              onPress={toggleVoiceConversationMode}
              style={({ pressed }) => [
                styles.voiceConversationToggle,
                voiceConversationMode && styles.voiceConversationToggleActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.voiceConversationToggleText}>
                {voiceConversationMode ? text.endVoiceConversation : text.activateVoiceConversation}
              </Text>
            </Pressable>
          </View>
          <View style={styles.composer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adicionar anexo"
              accessibilityState={{ disabled: busy || voiceConversationMode, expanded: attachmentMenuOpen }}
              disabled={busy || voiceConversationMode}
              onPress={() => {
                Keyboard.dismiss();
                setAttachmentMenuOpen(true);
              }}
              style={({ pressed }) => [styles.attach, pressed && styles.pressed]}
            >
              <Text style={styles.attachText}>＋</Text>
            </Pressable>
            <TextInput
              accessibilityLabel="Mensagem para a KIVRYN"
              multiline
              scrollEnabled
              blurOnSubmit={false}
              maxLength={12000}
              placeholder={text.message}
              placeholderTextColor={colors.textMuted}
              value={draft}
              onChangeText={(value) => {
                setDraft(value);
                if (failed && value !== failed.content) setFailed(null);
              }}
              style={styles.input}
              textAlignVertical="top"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                recorderState.isRecording ? text.stopVoice : transcribing ? text.transcribing : text.speak
              }
              accessibilityState={{
                disabled: send.isPending || uploading || transcribing,
                busy: transcribing,
              }}
              disabled={send.isPending || uploading || transcribing}
              onPress={() =>
                recorderState.isRecording ? void stopVoiceInput() : void startVoiceInput()
              }
              style={({ pressed }) => [
                styles.voiceButton,
                recorderState.isRecording && styles.voiceRecording,
                pressed && styles.pressed,
              ]}
            >
              {transcribing ? (
                <ActivityIndicator color={colors.primaryBright} />
              ) : (
                <Text style={styles.voiceText}>{recorderState.isRecording ? "■" : "●"}</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar mensagem"
              accessibilityState={{ disabled: !canSend, busy }}
              disabled={!canSend}
              onPress={() => void submit(draft)}
              style={({ pressed }) => [styles.sendButton, !canSend && styles.disabled, pressed && canSend && styles.pressed]}
            >
              {uploading ? <ActivityIndicator color={colors.background} /> : <Text style={styles.sendText}>↑</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent
        visible={historyOpen}
        onRequestClose={() => setHistoryOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setHistoryOpen(false)} />
          <SafeAreaView edges={["top", "bottom"]} style={styles.historyPanel}>
            <View style={styles.historyHeader}>
              <View>
                <Text style={styles.historyTitle}>{text.history}</Text>
                <Text style={styles.historyCaption}>KIVRYN Assistant</Text>
              </View>
              <Pressable onPress={() => setHistoryOpen(false)} style={styles.closeHistory}>
                <Text style={styles.closeHistoryText}>×</Text>
              </Pressable>
            </View>
            <Pressable onPress={startNewChat} style={({ pressed }) => [styles.historyNew, pressed && styles.pressed]}>
              <Text style={styles.historyNewIcon}>＋</Text>
              <Text style={styles.historyNewText}>{text.newChat}</Text>
            </Pressable>
            <TextInput
              value={historySearch}
              onChangeText={setHistorySearch}
              placeholder={text.search}
              placeholderTextColor={colors.textMuted}
              style={styles.historySearch}
            />
            {conversations.isError ? (
              <View style={styles.historyError}>
                <Text style={styles.errorDetail}>Não foi possível carregar as conversas.</Text>
                <Pressable onPress={() => void conversations.refetch()}>
                  <Text style={styles.retry}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={filteredConversations}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.historyList}
                ListEmptyComponent={
                  conversations.isPending ? (
                    <ActivityIndicator color={colors.primaryBright} style={styles.historyLoader} />
                  ) : (
                    <Text style={styles.historyEmpty}>{text.noHistory}</Text>
                  )
                }
                renderItem={({ item }) => {
                  const title = isGenericConversationTitle(item.title) ? text.generic : item.title ?? text.generic;
                  const active = item.id === conversationId;
                  const date = new Date(item.updatedAt).toLocaleDateString(
                    resolvedLocale === "pt-BR" ? "pt-BR" : "en-US",
                    { day: "2-digit", month: "short" },
                  );
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={title}
                      onPress={() => openConversation(item.id)}
                      style={({ pressed }) => [
                        styles.historyRow,
                        active && styles.historyRowActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.historyRowCopy}>
                        <Text numberOfLines={1} style={styles.historyRowTitle}>{title}</Text>
                        <Text style={styles.historyRowMeta}>{text.activity} {date}</Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  keyboardArea: { flex: 1, minHeight: 0 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
  header: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  menuIcon: { color: colors.text, fontSize: 24 },
  newIcon: { color: colors.text, fontSize: 28, lineHeight: 30 },
  headerTitle: { flex: 1, alignItems: "center", justifyContent: "center" },
  brand: { ...typography.label, color: colors.text, letterSpacing: 0.3 },
  status: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  conversation: { flex: 1, minHeight: 0 },
  list: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  empty: { alignItems: "center" },
  emptyMark: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: colors.surfaceRaised,
  },
  emptySpark: { color: colors.primaryBright, fontSize: 22 },
  emptyTitle: { ...typography.heading, color: colors.text, textAlign: "center", marginTop: spacing.md },
  emptyBody: {
    ...typography.body,
    maxWidth: 320,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  starters: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  starter: {
    maxWidth: "48%",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    backgroundColor: colors.background,
  },
  starterText: { ...typography.caption, color: colors.text, textAlign: "center" },
  messageRow: { width: "100%", minWidth: 0 },
  userRow: { alignItems: "flex-end" },
  author: { ...typography.caption, color: colors.textMuted, marginBottom: 6 },
  userMessage: {
    maxWidth: "86%",
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderRadius: 20,
    borderBottomRightRadius: 7,
    backgroundColor: colors.surfaceRaised,
  },
  assistantMessage: {
    width: "100%",
    paddingVertical: 2,
  },
  messageText: { ...typography.body, color: colors.text, lineHeight: 24 },
  listen: { alignSelf: "flex-start", paddingVertical: 7, paddingRight: spacing.md },
  listenText: { ...typography.caption, color: colors.textMuted },
  thinking: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.md },
  sentImage: { width: 220, height: 150, borderRadius: radius.md, marginBottom: spacing.sm },
  fileChip: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  fileName: { ...typography.label, color: colors.text },
  fileMeta: { ...typography.caption, color: colors.textMuted },
  actionCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  actionEyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  actionItem: { gap: spacing.xs },
  actionTitle: { ...typography.label, color: colors.text },
  actionDetail: { ...typography.body, color: colors.textMuted },
  actionStatus: { ...typography.label, color: colors.text, marginTop: spacing.xs },
  applyingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  actionButtons: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.sm },
  cancelAction: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmAction: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: 21,
    backgroundColor: colors.primary,
  },
  openResult: {
    alignSelf: "flex-start",
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: 21,
    backgroundColor: colors.primary,
  },
  actionButtonText: { ...typography.label, color: colors.text },
  actionButtonMuted: { ...typography.label, color: colors.textMuted },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorTitle: { ...typography.label, color: colors.danger },
  errorDetail: { ...typography.caption, color: colors.textMuted },
  retry: { ...typography.label, color: colors.primaryBright, paddingVertical: spacing.sm },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  thumb: { width: 46, height: 46, borderRadius: radius.sm },
  docIcon: { fontSize: 26, color: colors.primaryBright },
  remove: { fontSize: 28, color: colors.textMuted, paddingHorizontal: 8 },
  attachmentMenu: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    elevation: 12,
  },
  menuHeading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  menuTitle: { ...typography.label, color: colors.text },
  menuCaption: { ...typography.caption, color: colors.textMuted },
  menuClose: { color: colors.textMuted, fontSize: 28, lineHeight: 32, paddingHorizontal: 4 },
  menuActions: { flexDirection: "row", gap: spacing.sm },
  menuAction: {
    flex: 1,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  menuActionIcon: { color: colors.primaryBright, fontSize: 22 },
  menuActionText: { ...typography.caption, color: colors.text },
  voiceConversationBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  voiceConversationCopy: { flex: 1, minWidth: 0 },
  voiceConversationTitle: { ...typography.label, color: colors.text },
  voiceConversationBody: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  voiceConversationToggle: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderActive,
  },
  voiceConversationToggleActive: { backgroundColor: colors.surfaceRaised },
  voiceConversationToggleText: { ...typography.label, color: colors.primaryBright },
  composerWrap: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: Math.max(spacing.sm, 10),
    backgroundColor: colors.background,
  },
  composer: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 28,
    backgroundColor: colors.surfaceRaised,
  },
  attach: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  attachText: { color: colors.text, fontSize: 25 },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: 44,
    maxHeight: 128,
    paddingHorizontal: spacing.sm,
    paddingTop: 11,
    paddingBottom: 9,
    color: colors.text,
  },
  voiceButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  voiceRecording: {
    backgroundColor: colors.surface,
  },
  voiceText: { color: colors.primaryBright, fontSize: 18, lineHeight: 20 },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.text,
  },
  sendText: { color: colors.background, fontSize: 23, lineHeight: 25 },
  modalRoot: { flex: 1, flexDirection: "row" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  historyPanel: {
    width: "86%",
    maxWidth: 360,
    flex: 1,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  historyHeader: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyTitle: { ...typography.heading, color: colors.text },
  historyCaption: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  closeHistory: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  closeHistoryText: { color: colors.textMuted, fontSize: 28 },
  historyNew: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  historyNewIcon: { color: colors.text, fontSize: 22 },
  historyNewText: { ...typography.label, color: colors.text },
  historySearch: {
    ...typography.body,
    height: 46,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 23,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  historyList: { paddingVertical: spacing.md, gap: 3 },
  historyLoader: { marginTop: spacing.xl },
  historyEmpty: { ...typography.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  historyError: { gap: spacing.sm, paddingVertical: spacing.lg },
  historyRow: { minHeight: 58, justifyContent: "center", paddingHorizontal: spacing.sm, borderRadius: radius.md },
  historyRowActive: { backgroundColor: colors.surfaceRaised },
  historyRowCopy: { minWidth: 0 },
  historyRowTitle: { ...typography.label, color: colors.text },
  historyRowMeta: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
});
