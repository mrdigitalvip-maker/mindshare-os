export type SpeechState = { speakingId: string | null };
export function nextSpeechState(state: SpeechState, requestedId: string): SpeechState {
  return { speakingId: state.speakingId === requestedId ? null : requestedId };
}
