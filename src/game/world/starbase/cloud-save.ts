import type { GameEngine } from "@/game/engine/core";
import { hasSupabaseCredentials, supabase } from "@/lib/supabase";
/** Auth-aware bootstrap boundary. A future migration can attach the save RPC here without touching gameplay. */
export async function bootstrapCloudProfile(engine: GameEngine) {
  if (!hasSupabaseCredentials) return;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return;
  const meta = user.user_metadata as Record<string, unknown>;
  engine.state = {
    ...engine.state,
    id: user.id,
    username:
      typeof meta.username === "string"
        ? meta.username
        : typeof meta.name === "string"
          ? meta.name
          : engine.state.username,
    avatar: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
  };
  engine.bus.emit("state", engine.state);
}
export interface CloudSaveAdapter {
  load(userId: string): Promise<unknown>;
  save(userId: string, payload: unknown): Promise<void>;
}
