import { supabase } from './supabase';

/**
 * Count conversations where the latest message from the other person
 * is newer than the current user's last_read_at for that connection.
 */
export async function fetchUnreadCount(userId: string): Promise<number> {
  const { data: conns } = await supabase
    .from('connections')
    .select('id')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  if (!conns || conns.length === 0) return 0;

  const connectionIds = conns.map((c: any) => c.id);

  const [messagesRes, readRes] = await Promise.all([
    supabase
      .from('messages')
      .select('connection_id, created_at')
      .in('connection_id', connectionIds)
      .neq('sender_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('message_read_status')
      .select('connection_id, last_read_at')
      .in('connection_id', connectionIds)
      .eq('user_id', userId),
  ]);

  const readMap: Record<string, string> = {};
  (readRes.data ?? []).forEach((r: any) => { readMap[r.connection_id] = r.last_read_at; });

  const latestMsgMap: Record<string, string> = {};
  (messagesRes.data ?? []).forEach((m: any) => {
    if (!latestMsgMap[m.connection_id]) {
      latestMsgMap[m.connection_id] = m.created_at;
    }
  });

  let count = 0;
  for (const connId of connectionIds) {
    const msgAt = latestMsgMap[connId];
    if (!msgAt) continue;
    const lastRead = readMap[connId];
    if (!lastRead || new Date(msgAt) > new Date(lastRead)) {
      count++;
    }
  }
  return count;
}
