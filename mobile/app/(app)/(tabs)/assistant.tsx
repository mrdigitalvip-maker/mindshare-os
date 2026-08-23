import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Speech from "expo-speech";
import { AppScreen } from "@/components/app-screen";
import { NexoraAgent } from "@/components/nexora-agent";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { useRecentConversation, useSendChat } from "@/hooks/use-chat";
import { assistantErrorCopy, createAssistantRequestId } from "@/lib/chat-contract";
import {
  formatFileSize,
  validateChatAttachment,
  type ChatAttachment,
  type LocalChatAttachment,
} from "@/lib/chat-attachments";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { uploadChatAttachment } from "@/services/chat-attachment-service";
import { ChatServiceError, type ChatMessage } from "@/services/chat-service";

const STARTERS = [
  "Organizar meu dia",
  "Revisar minhas tarefas",
  "Ajudar com um projeto",
  "Analisar uma imagem",
] as const;
const uuid = () => createAssistantRequestId();

export default function Assistant() {
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const list = useRef<FlatList<ChatMessage>>(null);
  const handledPrompt = useRef<string | undefined>(undefined);
  const history = useRecentConversation();
  const send = useSendChat();
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<LocalChatAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newConversation, setNewConversation] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [failed, setFailed] = useState<{
    content: string;
    requestId: string;
    code?: string;
  } | null>(null);
  const [optimistic, setOptimistic] = useState<ChatMessage | null>(null);
  const messages = useMemo(() => {
    const persisted = newConversation ? [] : (history.data?.messages ?? []);
    return optimistic ? [...persisted, optimistic] : persisted;
  }, [history.data?.messages, newConversation, optimistic]);

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
    else setAttachment(next);
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
      const asset = result.assets[0];
      validateDraft({
        id: uuid(),
        uri: asset.uri,
        kind: "image",
        name: asset.fileName || "foto.jpg",
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize || 0,
      });
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
      const asset = result.assets[0];
      validateDraft({
        id: uuid(),
        uri: asset.uri,
        kind: "image",
        name: asset.fileName || "camera.jpg",
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize || 0,
      });
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
      const asset = result.assets[0];
      validateDraft({
        id: uuid(),
        uri: asset.uri,
        kind: "document",
        name: asset.name,
        mimeType: asset.mimeType || "text/plain",
        size: asset.size || 0,
      });
    } catch {
      Alert.alert("Arquivo indisponível", "Não foi possível abrir o seletor de arquivos.");
    }
  };
  const openAttachmentMenu = () =>
    Alert.alert("Adicionar", "Escolha uma origem", [
      { text: "Foto da galeria", onPress: () => void pickGallery() },
      { text: "Câmera", onPress: () => void takePhoto() },
      { text: "Arquivo de texto", onPress: () => void pickDocument() },
      { text: "Cancelar", style: "cancel" },
    ]);

  const submit = useCallback(
    async (value: string, retryId?: string) => {
      const content = value.trim();
      if ((!content && !attachment) || send.isPending || uploading) return;
      const id = retryId ?? createAssistantRequestId();
      setFailed(null);
      setUploading(Boolean(attachment));
      try {
        const uploaded = attachment ? await uploadChatAttachment(attachment, id) : undefined;
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
        await send.mutateAsync({
          message: finalContent,
          conversationId: newConversation ? null : (history.data?.conversationId ?? null),
          requestId: id,
          attachments: uploaded ? [uploaded] : [],
        });
        setDraft("");
        setAttachment(null);
        setNewConversation(false);
        setOptimistic(null);
      } catch (error) {
        const code = error instanceof ChatServiceError ? error.code : undefined;
        setOptimistic(null);
        setFailed({ content, requestId: id, code });
      } finally {
        setUploading(false);
      }
    },
    [attachment, history.data?.conversationId, newConversation, send, uploading],
  );

  useEffect(() => {
    if (history.isSuccess && prompt && handledPrompt.current !== prompt) {
      handledPrompt.current = prompt;
      void submit(prompt);
    }
  }, [history.isSuccess, prompt, submit]);
  useEffect(() => {
    if (messages.length) requestAnimationFrame(() => list.current?.scrollToEnd({ animated: true }));
  }, [messages.length]);
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

  if (history.isPending) return <LoadingState title="Carregando conversa…" />;
  if (history.isError)
    return (
      <ErrorState
        title="Não foi possível carregar agora."
        message="Seu histórico continua salvo. Verifique sua conexão."
        actionLabel="Tentar novamente"
        onAction={() => void history.refetch()}
      />
    );
  const errorCopy = failed ? assistantErrorCopy(failed.code) : null;
  return (
    <AppScreen keyboard padded={false}>
      <View style={styles.header}>
        <NexoraAgent
          state={send.isPending ? "thinking" : failed ? "attention" : "idle"}
          size={52}
        />
        <View style={styles.headerCopy}>
          <Text style={styles.brand}>NEXORA</Text>
          <Text style={styles.status}>{send.isPending ? "Pensando…" : "Pronta para ajudar"}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setNewConversation(true);
            setDraft("");
            setAttachment(null);
            setFailed(null);
          }}
          style={styles.newButton}
        >
          <Text style={styles.newText}>Nova</Text>
        </Pressable>
      </View>
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={messages.length ? styles.list : styles.emptyList}
        ListEmptyComponent={
          <View style={styles.empty}>
            <NexoraAgent state="quiet" size={76} />
            <Text style={styles.emptyTitle}>Como posso ajudar agora?</Text>
            <Text style={styles.emptyBody}>
              Use seus dados reais da NEXORA ou envie uma imagem.
            </Text>
            <View style={styles.starters}>
              {STARTERS.map((starter) => (
                <Pressable
                  key={starter}
                  onPress={() =>
                    starter === "Analisar uma imagem" ? openAttachmentMenu() : void submit(starter)
                  }
                  style={styles.starter}
                >
                  <Text style={styles.starterText}>{starter}</Text>
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
                  <Image key={file.id} source={{ uri: file.previewUri }} style={styles.sentImage} />
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
              <Pressable onPress={() => void toggleSpeech(item)} style={styles.listen}>
                <Text style={styles.listenText}>{speakingId === item.id ? "Parar" : "Ouvir"}</Text>
              </Pressable>
            )}
          </View>
        )}
        ListFooterComponent={
          send.isPending ? <Text style={styles.thinking}>✦ NEXORA está pensando…</Text> : null
        }
      />
      {errorCopy && (
        <View accessibilityRole="alert" style={styles.error}>
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>{errorCopy.title}</Text>
            <Text style={styles.errorDetail}>{errorCopy.detail}</Text>
          </View>
          <Pressable onPress={() => void submit(failed!.content, failed!.requestId)}>
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
            <Pressable accessibilityLabel="Remover arquivo" onPress={() => setAttachment(null)}>
              <Text style={styles.remove}>×</Text>
            </Pressable>
          )}
        </View>
      )}
      <View style={styles.composer}>
        <Pressable
          accessibilityLabel="Adicionar anexo"
          disabled={send.isPending || uploading}
          onPress={openAttachmentMenu}
          style={styles.attach}
        >
          <Text style={styles.attachText}>＋</Text>
        </Pressable>
        <TextInput
          accessibilityLabel="Mensagem para a NEXORA"
          multiline
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
          accessibilityLabel="Enviar mensagem"
          disabled={(!draft.trim() && !attachment) || send.isPending || uploading}
          onPress={() => void submit(draft)}
          style={[
            styles.send,
            ((!draft.trim() && !attachment) || send.isPending || uploading) && styles.disabled,
          ]}
        >
          {uploading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.sendText}>↑</Text>
          )}
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
