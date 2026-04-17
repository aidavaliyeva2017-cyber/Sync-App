import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeMessage {
  id: string;
  connection_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

/**
 * Subscribe to new messages in a specific chat thread.
 * Returns the channel so the caller can unsubscribe on unmount.
 */
export function subscribeToChat(
  connectionId: string,
  onNewMessage: (message: RealtimeMessage) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`chat:${connectionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `connection_id=eq.${connectionId}`,
      },
      (payload) => {
        onNewMessage(payload.new as RealtimeMessage);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to any new messages across a set of connections (for the chat list).
 * Calls onUpdate whenever any new message arrives so the list can re-fetch.
 */
export function subscribeToChatList(
  connectionIds: string[],
  onUpdate: (message: RealtimeMessage) => void
): RealtimeChannel | null {
  if (connectionIds.length === 0) return null;

  // Supabase realtime filter supports `in` only via a single channel per connection_id,
  // so we subscribe broadly and filter client-side for the IDs we care about.
  const idSet = new Set(connectionIds);

  const channel = supabase
    .channel('chat_list')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        const msg = payload.new as RealtimeMessage;
        if (idSet.has(msg.connection_id)) {
          onUpdate(msg);
        }
      }
    )
    .subscribe();

  return channel;
}

export async function unsubscribe(channel: RealtimeChannel | null): Promise<void> {
  if (channel) {
    await supabase.removeChannel(channel);
  }
}

/** Mark all messages in a connection as read for the current user. */
export async function markChatRead(connectionId: string, userId: string): Promise<void> {
  await supabase
    .from('message_read_status')
    .upsert(
      { connection_id: connectionId, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: 'connection_id,user_id' }
    );
}
