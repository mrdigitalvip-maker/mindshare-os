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
import { NexoraAgent } from "@/components/nexora-agent";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { useConversation, useSendChat } from "@/hooks/use-chat";
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
import { colors, radius, spacing, typography } from "@/lib/theme";
import { uploadChatAttachment } from "@/services/chat-attachment-service";
import { ChatServiceError, type ChatMessage } from "@/services/chat-service";
import { actionInvalidationRoots, actionPreview, type NexoraAction } from "@/lib/nexora-actions";
import { applyNexoraAction } from "@/services/nexora-action-service";

const uuid = () => createAssistantRequestId();

export default function Assistant() {
  const {
    prompt,
    conversationId: routeConversationId,
    attachment: attachmentIntent,
  } = useLocalSearchParams<{ prompt?: string; conversationId?: string; attachment?: string }>();
  const conversationId = routeConversationId?.trim() || null;
  const list = useRef<FlatList<ChatMessage>>(null);
  const nearBottom = useRef(true);
  const submitting = useRef(false);
  const handledPrompt = useRef<string | undefined>(undefined);
  const history = useConversation(conversationId);
  const send = useSendChat();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<LocalChatAttachment | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [failed, setFailed] = useState<{
    content: string;
    requestId: string;
    code?: string;
    uploadedAttachment?: ChatAttachment;
  } | null>(null);
  const [optimistic, setOptimistic] = useState<ChatMessage | null>(null);
  const [proposal, setProposal] = useState<{ actions: NexoraAction[]; actionIds: string[] } | null>(
    null,
  );
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const messages = useMemo(
    () => reconcileAssistantMessages(history.data, optimistic),
    [history.data, optimistic],
  );

  useEffect(
    () => () => {
      void Speech.stop();
    },
    [],
  );
  const validateDraft = (next: LocalChatAttachment) => {
    const error = validateChatAttachment(next);
    if (error)
      Alert.alert(
        "Arquivo não suportado",
        error === "ATTACHMENT_SIZE"
          ? "Escolha um arquivo de até 6 MB."
          : "Use JPG, PNG, WEBP ou texto simples.",
      );
    else {
      setAttachment(next);
      setFailed(null);
    }
  };
  const pickGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        return Alert.alert(
          "Acesso às fotos negado",
          "Libere o acesso nas configurações do Android para escolher uma foto.",
        );
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
      if (!permission.granted)
        return Alert.alert(
          "Câmera não autorizada",
          "Libere a câmera nas configurações do Android para fotografar.",
        );
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
  const openAttachmentMenu = () => {
    Keyboard.dismiss();
    setAttachmentMenuOpen(true);
  };
  const runPicker = (picker: "camera" | "gallery" | "document") => {
    setAttachmentMenuOpen(false);
    if (picker === "camera") void takePhoto();
    else if (picker === "gallery") void pickGallery();
    else void pickDocument();
  };

  const submit = useCallback(
    async (value: string, retryId?: string, retryAttachment?: ChatAttachment) => {
      const content = value.trim();
      if ((!content && !attachment) || submitting.current || send.isPending || uploading) return;
      submitting.current = true;
      const id = retryId ?? createAssistantRequestId();
      const preservedDraft = content;
      if (!retryId) setDraft("");
      setFailed(null);
      setUploading(Boolean(attachment && !retryAttachment));
      let uploaded = retryAttachment;
      try {
        uploaded ??= attachment ? await uploadChatAttachment(attachment, id) : undefined;
        const finalContent =
          content ||
          (attachment?.kind === "image" ? "Analise esta imagem." : "Analise este arquivo.");
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
        if (result.proposedActions.length)
          setProposal({
            actions: result.proposedActions,
            actionIds: result.proposedActions.map(() => createAssistantRequestId()),
          });
        setAttachment(null);
        if (!conversationId) router.setParams({ conversationId: result.conversationId });
        setOptimistic(null);
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
    [attachment, conversationId, send, uploading],
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
    if (messages.length && nearBottom.current)
      requestAnimationFrame(() => list.current?.scrollToEnd({ animated: true }));
  }, [messages.length]);
  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", () => {
      if (nearBottom.current)
        requestAnimationFrame(() => list.current?.scrollToEnd({ animated: true }));
    });
    return () => subscription.remove();
  }, []);
  const toggleSpeech = async (item: ChatMessage) => {
    try {
      await Speech.stop();
      if (speakingId === item.id) return setSpeakingId(null);
      setSpeakingId(item.id);
      Speech.speak(item.content, {
        language: "pt-BR",
        onDone: () => setSpeakingId(null),
        onStopped: () => setSpeakingId(null),
        onError: () => {
          setSpeakingId(null);
          Alert.alert("Áudio indisponível", "Não foi possível reproduzir esta resposta.");
        },
      });
    } catch {
      setSpeakingId(null);
      Alert.alert("Áudio indisponível", "Não foi possível reproduzir esta resposta.");
    }
  };

  if (conversationId && history.isPending) return <LoadingState title="Carregando conversa…" />;
  if (history.isError)
    return (
      <ErrorState
        title="Não foi possível carregar agora."
        message="Seu histórico continua salvo. Verifique sua conexão."
        actionLabel="Tentar novamente"
        onAction={() =>
          conversationId ? void history.refetch() : router.replace("/(app)/(tabs)/assistant")
        }
      />
    );
  const errorCopy = failed ? assistantErrorCopy(failed.code) : null;
  const busy = send.isPending || uploading;
  const canSend = canSendAssistantMessage(draft, attachment, busy);
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <NexoraAgent
          state={send.isPending ? "thinking" : failed ? "attention" : "idle"}
          size={52}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar às conversas"
          onPress={() => router.replace("/(app)/(tabs)/assistant")}
          style={styles.back}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.brand}>NEXORA</Text>
          <Text style={styles.status}>{send.isPending ? "Pensando…" : "Pronta para ajudar"}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Novo chat"
          onPress={() => {
            router.replace("/(app)/(tabs)/assistant-chat");
          }}
          style={styles.newButton}
        >
          <Text style={styles.newText}>Novo</Text>
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
              <NexoraAgent state="quiet" size={76} />
              <Text style={styles.emptyTitle}>Como posso ajudar agora?</Text>
              <Text style={styles.emptyBody}>
                Use seus dados reais da NEXORA ou envie uma imagem.
              </Text>
              <View style={styles.starters}>
                {ASSISTANT_QUICK_ACTIONS.map((action) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    key={action.label}
                    onPress={() => {
                      const resolved = resolveQuickAction(action);
                      if (resolved.picker) runPicker(resolved.picker);
                      else setDraft(resolved.draft);
                    }}
                    style={styles.starter}
                  >
                    <Text style={styles.starterText}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.messageRow}>
              {item.role === "assistant" && <Text style={styles.author}>NEXORA</Text>}
              <View style={[styles.message, item.role === "user" ? styles.user : styles.assistant]}>
                {item.attachments.map((file) =>
                  file.kind === "image" && file.previewUri ? (
                    <Image
                      key={file.id}
                      source={{ uri: file.previewUri }}
                      style={styles.sentImage}
                    />
                  ) : (
                    <View key={file.id} style={styles.fileChip}>
                      <Text style={styles.fileName}>▤ {file.name}</Text>
                      <Text style={styles.fileMeta}>
                        {file.mimeType} · {formatFileSize(file.size)}
                      </Text>
                    </View>
                  ),
                )}
                <Text selectable style={styles.messageText}>
                  {item.content}
                </Text>
              </View>
              {item.role === "assistant" && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${speakingId === item.id ? "Parar" : "Ouvir"} resposta da NEXORA`}
                  onPress={() => void toggleSpeech(item)}
                  style={styles.listen}
                >
                  <Text style={styles.listenText}>
                    {speakingId === item.id ? "Parar" : "Ouvir"}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
          ListFooterComponent={
            <>
              {send.isPending && <Text style={styles.thinking}>✦ NEXORA está pensando…</Text>}
              {proposal && (
                <View style={styles.actionCard}>
                  <Text style={styles.actionEyebrow}>ALTERAÇÕES PROPOSTAS</Text>
                  {proposal.actions.map((action, index) => {
                    const preview = actionPreview(action);
                    return (
                      <View key={`${action.action_type}-${index}`} style={styles.actionItem}>
                        <Text style={styles.actionTitle}>{preview.label}</Text>
                        {preview.details.map((detail) => (
                          <Text key={detail} style={styles.actionDetail}>
                            • {detail}
                          </Text>
                        ))}
                      </View>
                    );
                  })}
                  <View style={styles.actionButtons}>
                    <Pressable
                      disabled={applying}
                      onPress={() => {
                        setProposal(null);
                        setApplyMessage("Alterações canceladas. Nada foi modificado.");
                      }}
                      style={styles.cancelAction}
                    >
                      <Text style={styles.actionButtonText}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                      disabled={applying}
                      onPress={() =>
                        void (async () => {
                          const current = proposal;
                          if (!current || applying) return;
                          setApplying(true);
                          setApplyMessage(null);
                          let applied = 0;
                          try {
                            for (let i = 0; i < current.actions.length; i++) {
                              await applyNexoraAction({
                                actionId: current.actionIds[i],
                                requestId: current.actionIds[i],
                                conversationId,
                                confirmed: true,
                                action: current.actions[i],
                              });
                              applied++;
                            }
                            await Promise.all(
                              actionInvalidationRoots(current.actions).map((root) =>
                                queryClient.invalidateQueries({ queryKey: [root] }),
                              ),
                            );
                            setProposal(null);
                            setApplyMessage(
                              `Pronto. ${current.actions.length === 1 ? "A alteração foi aplicada" : `As ${current.actions.length} alterações foram aplicadas`} e confirmada pelo servidor.`,
                            );
                          } catch {
                            setApplyMessage(
                              applied
                                ? `${applied} alteração(ões) foram confirmadas pelo servidor; ${current.actions.length - applied} não foram aplicadas. Revise os dados antes de tentar novamente.`
                                : "Nenhuma alteração foi aplicada. Os dados podem ter mudado; revise e tente novamente.",
                            );
                          } finally {
                            setApplying(false);
                          }
                        })()
                      }
                      style={styles.confirmAction}
                    >
                      {applying ? (
                        <ActivityIndicator color={colors.text} />
                      ) : (
                        <Text style={styles.actionButtonText}>Confirmar</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
              {applyMessage && (
                <Text accessibilityRole="alert" style={styles.applyMessage}>
                  {applyMessage}
                </Text>
              )}
            </>
          }
        />
        {errorCopy && (
          <View accessibilityRole="alert" style={styles.error}>
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>{errorCopy.title}</Text>
              <Text style={styles.errorDetail}>{errorCopy.detail}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tentar enviar novamente"
              disabled={busy}
              onPress={() =>
                void submit(failed!.content, failed!.requestId, failed!.uploadedAttachment)
              }
            >
              <Text style={styles.retry}>Tentar novamente</Text>
            </Pressable>
          </View>
        )}
        {attachment && (
          <View style={styles.preview}>
            {attachment.kind === "image" ? (
              <Image source={{ uri: attachment.uri }} style={styles.thumb} />
            ) : (
              <Text style={styles.docIcon}>▤</Text>
            )}
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.fileName}>
                {attachment.name}
              </Text>
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
        )}
        {attachmentMenuOpen && (
          <View accessibilityRole="menu" style={styles.attachmentMenu}>
            <View style={styles.menuHeading}>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Adicionar ao chat</Text>
                <Text style={styles.menuCaption}>Escolha uma origem compatível</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar opções de anexo"
                onPress={() => setAttachmentMenuOpen(false)}
                hitSlop={8}
              >
                <Text style={styles.menuClose}>×</Text>
              </Pressable>
            </View>
            <View style={styles.menuActions}>
              {(
                [
                  ["camera", "◎", "Câmera"],
                  ["gallery", "▧", "Galeria"],
                  ["document", "▤", "Arquivo .txt"],
                ] as const
              ).map(([value, icon, label]) => (
                <Pressable
                  accessibilityRole="menuitem"
                  accessibilityLabel={label}
                  key={value}
                  onPress={() => runPicker(value)}
                  style={({ pressed }) => [styles.menuAction, pressed && styles.pressed]}
                >
                  <Text style={styles.menuIcon}>{icon}</Text>
                  <Text style={styles.menuActionText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        <View style={styles.composer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar anexo"
            accessibilityState={{ disabled: busy, expanded: attachmentMenuOpen }}
            disabled={busy}
            onPress={openAttachmentMenu}
            style={styles.attach}
          >
            <Text style={styles.attachText}>＋</Text>
          </Pressable>
          <TextInput
            accessibilityLabel="Mensagem para a NEXORA"
            multiline
            scrollEnabled
            blurOnSubmit={false}
            maxLength={12000}
            placeholder="Mensagem para a NEXORA…"
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={(v) => {
              setDraft(v);
              if (failed && v !== failed.content) setFailed(null);
            }}
            style={styles.input}
            textAlignVertical="top"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
            accessibilityState={{ disabled: !canSend, busy }}
            disabled={!canSend}
            onPress={() => void submit(draft)}
            style={[styles.send, !canSend && styles.disabled]}
          >
            {uploading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.sendText}>↑</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  keyboardArea: { flex: 1, minHeight: 0 },
  back: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  backText: { color: colors.text, fontSize: 34, lineHeight: 36 },
  header: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerCopy: { flex: 1 },
  brand: { ...typography.eyebrow, color: colors.primaryBright, letterSpacing: 2 },
  status: { ...typography.caption, color: colors.textMuted },
  newButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  newText: { ...typography.label, color: colors.primaryBright },
  conversation: { flex: 1, minHeight: 0 },
  list: { flexGrow: 1, gap: spacing.md, padding: spacing.md, paddingBottom: spacing.lg },
  emptyList: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
  empty: { alignItems: "center", gap: spacing.sm },
  emptyTitle: { ...typography.heading, color: colors.text, textAlign: "center" },
  emptyBody: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  starters: { width: "100%", gap: spacing.sm, marginTop: spacing.md },
  starter: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  starterText: { ...typography.label, color: colors.text },
  messageRow: { minWidth: 0 },
  author: { ...typography.caption, color: colors.primaryBright, marginBottom: 4, marginLeft: 4 },
  message: {
    maxWidth: 520,
    width: "auto",
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderRadius: radius.lg,
  },
  user: {
    alignSelf: "flex-end",
    backgroundColor: colors.accentMuted,
    borderBottomRightRadius: radius.sm,
  },
  assistant: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceRaised,
    borderBottomLeftRadius: radius.sm,
  },
  messageText: { ...typography.body, color: colors.text },
  listen: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 7 },
  listenText: { ...typography.caption, color: colors.primaryBright },
  thinking: { ...typography.label, color: colors.textMuted, paddingVertical: spacing.md },
  actionCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryBright,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
  },
  actionEyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  actionItem: { gap: spacing.xs },
  actionTitle: { ...typography.label, color: colors.text },
  actionDetail: { ...typography.body, color: colors.textMuted },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelAction: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmAction: {
    minHeight: 44,
    minWidth: 112,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  actionButtonText: { ...typography.label, color: colors.text },
  applyMessage: { ...typography.label, color: colors.text, padding: spacing.md },
  sentImage: { width: 220, height: 150, borderRadius: radius.md, marginBottom: spacing.sm },
  fileChip: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  fileName: { ...typography.label, color: colors.text },
  fileMeta: { ...typography.caption, color: colors.textMuted },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.danger,
  },
  errorTitle: { ...typography.label, color: colors.danger },
  errorDetail: { ...typography.caption, color: colors.textMuted },
  retry: { ...typography.label, color: colors.primaryBright, paddingVertical: spacing.sm },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  thumb: { width: 52, height: 52, borderRadius: radius.sm },
  docIcon: { fontSize: 28, color: colors.primaryBright },
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
    minHeight: 68,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  menuIcon: { color: colors.primaryBright, fontSize: 23 },
  menuActionText: { ...typography.caption, color: colors.text, textAlign: "center" },
  pressed: { opacity: 0.72 },
  composer: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  attach: {
    width: 46,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: colors.surfaceRaised,
  },
  attachText: { color: colors.primaryBright, fontSize: 26 },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: 48,
    maxHeight: 128,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
  },
  send: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  disabled: { opacity: 0.4 },
  sendText: { color: colors.text, fontSize: 24, lineHeight: 26 },
});
