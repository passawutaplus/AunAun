import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Entry = { refs: number; channel: RealtimeChannel; timer: ReturnType<typeof setTimeout> | null };

const channels = new Map<string, Entry>();
// Removal is deferred so an immediate remount reuses the live channel instead of re-adding
// listeners to a topic that is still subscribed (which throws in realtime-js).
const RELEASE_DELAY_MS = 1000;

/**
 * One realtime channel per topic, shared by every mounted hook that asks for it.
 * `setup` attaches the postgres_changes listeners and runs only when the channel is created,
 * so listeners must not close over per-mount state.
 */
export function retainSharedChannel(
  topic: string,
  setup: (channel: RealtimeChannel) => RealtimeChannel,
): () => void {
  let entry = channels.get(topic);
  if (!entry) {
    entry = { refs: 0, channel: setup(supabase.channel(topic)).subscribe(), timer: null };
    channels.set(topic, entry);
  }
  if (entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }
  entry.refs += 1;
  const held = entry;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    held.refs -= 1;
    if (held.refs > 0) return;
    held.timer = setTimeout(() => {
      if (held.refs > 0) return;
      channels.delete(topic);
      void supabase.removeChannel(held.channel);
    }, RELEASE_DELAY_MS);
  };
}
