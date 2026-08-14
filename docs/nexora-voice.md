# NEXORA voice provider contract

The Command Center depends on `VoiceProvider`, not on a vendor SDK. Browser speech synthesis is the optional fallback and browser speech recognition provides transcription. Transcription only updates the composer; the user must review and send it.

## Future ElevenLabs adapter

No ElevenLabs secret belongs in the web application. Add a protected Supabase Edge Function (for example `nexora-voice`) that authenticates the current user, checks the subscription/usage entitlement, maps the persisted persona ID to an allow-listed server-side voice ID, and calls ElevenLabs.

Server-side secrets:

- `ELEVENLABS_API_KEY`: ElevenLabs API credential.
- `ELEVENLABS_VOICE_ID_NOVA`, `ELEVENLABS_VOICE_ID_ATLAS`, `ELEVENLABS_VOICE_ID_LYRA`, `ELEVENLABS_VOICE_ID_ORION`: allow-listed persona mappings.

The client adapter should send `{ text, personaId }` to the Edge Function. The function should respond with an authenticated audio stream (`audio/mpeg` or an agreed chunked media type). The provider owns playback and exposes amplitude samples in the future; `NexoraAvatar` accepts normalized `amplitude` independently of the vendor. Until that function exists, `ElevenLabsVoiceProvider.isAvailable()` remains false and text chat/voice input continue to work.
