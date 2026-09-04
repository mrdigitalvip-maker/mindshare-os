declare module "expo-image-picker" {
  export function requestMediaLibraryPermissionsAsync(): Promise<{
    granted: boolean;
    canAskAgain?: boolean;
  }>;
  export function requestCameraPermissionsAsync(): Promise<{
    granted: boolean;
    canAskAgain?: boolean;
  }>;
  export function launchImageLibraryAsync(options: unknown): Promise<{
    canceled: boolean;
    assets: Array<{ uri: string; fileName?: string | null; mimeType?: string; fileSize?: number }>;
  }>;
  export function launchCameraAsync(options: unknown): Promise<{
    canceled: boolean;
    assets: Array<{ uri: string; fileName?: string | null; mimeType?: string; fileSize?: number }>;
  }>;
}
declare module "expo-document-picker" {
  export function getDocumentAsync(options: unknown): Promise<{
    canceled: boolean;
    assets: Array<{ uri: string; name: string; mimeType?: string; size?: number }>;
  }>;
}
declare module "expo-speech" {
  export function stop(): Promise<void>;
  export function speak(
    text: string,
    options?: {
      language?: string;
      onDone?: () => void;
      onStopped?: () => void;
      onError?: () => void;
    },
  ): void;
}
