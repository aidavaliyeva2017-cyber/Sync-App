import { supabase } from './supabase';

export type ConnectionStatus = 'none' | 'connected' | 'request_sent' | 'request_received';

export async function getConnectionStatus(
  currentUserId: string,
  otherUserId: string
): Promise<ConnectionStatus> {
  const [connRes, reqRes] = await Promise.all([
    supabase
      .from('connections')
      .select('id')
      .or(
        `and(user_a.eq.${currentUserId},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${currentUserId})`
      )
      .limit(1),
    supabase
      .from('connection_requests')
      .select('sender_id, receiver_id')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
      )
      .eq('status', 'pending')
      .limit(1),
  ]);

  if (connRes.data && connRes.data.length > 0) return 'connected';
  if (reqRes.data && reqRes.data.length > 0) {
    return reqRes.data[0].sender_id === currentUserId ? 'request_sent' : 'request_received';
  }
  return 'none';
}

export async function sendConnectionRequest(
  senderId: string,
  receiverId: string,
  introNote?: string
): Promise<void> {
  // 1. Check if receiver already sent a pending request to sender (mutual → auto-accept)
  const { data: mutual } = await supabase
    .from('connection_requests')
    .select('id')
    .eq('sender_id', receiverId)
    .eq('receiver_id', senderId)
    .eq('status', 'pending')
    .single();

  if (mutual) {
    await acceptConnectionRequest(mutual.id);
    return;
  }

  // 2. Check for any pre-existing row from sender → receiver (unique constraint blocks re-insert)
  const { data: prior } = await supabase
    .from('connection_requests')
    .select('id, status')
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .single();

  if (prior) {
    if (prior.status === 'pending') {
      return; // already sent
    }

    if (prior.status === 'accepted') {
      // Request was accepted but the connections row may be missing — it was silently
      // blocked by a missing RLS INSERT policy. Self-heal by inserting it now.
      // Requires migration 003 to be applied in Supabase first.
      const userA = senderId < receiverId ? senderId : receiverId;
      const userB = senderId < receiverId ? receiverId : senderId;
      const { error: healError } = await supabase
        .from('connections')
        .insert({ user_a: userA, user_b: userB });
      // '23505' = unique_violation: row already exists, safe to ignore
      if (healError && healError.code !== '23505') {
        throw healError;
      }
      return;
    }

    // prior.status === 'declined': re-activate via UPDATE (INSERT would violate unique constraint)
    const { error } = await supabase
      .from('connection_requests')
      .update({ status: 'pending', intro_note: introNote?.trim() || null })
      .eq('id', prior.id);
    if (error) throw error;
    return;
  }

  // 3. No prior row — fresh insert
  const { error } = await supabase.from('connection_requests').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    intro_note: introNote?.trim() || null,
    status: 'pending',
  });
  if (error) throw error;
}

export async function acceptConnectionRequest(requestId: string): Promise<void> {
  // Fetch the request to get sender/receiver
  const { data: req } = await supabase
    .from('connection_requests')
    .select('sender_id, receiver_id')
    .eq('id', requestId)
    .single();

  if (!req) return;

  const userA = req.sender_id < req.receiver_id ? req.sender_id : req.receiver_id;
  const userB = req.sender_id < req.receiver_id ? req.receiver_id : req.sender_id;

  // Fetch both profiles in parallel — needed for push notification
  const [senderRes, acceptorRes] = await Promise.all([
    supabase.from('profiles').select('full_name, expo_push_token').eq('id', req.sender_id).single(),
    supabase.from('profiles').select('full_name').eq('id', req.receiver_id).single(),
  ]);

  // Update request status
  await supabase
    .from('connection_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  // Insert connection — fall back to fetching existing row if unique constraint fires
  let connId: string | null = null;

  const { data: inserted, error: insertError } = await supabase
    .from('connections')
    .insert({ user_a: userA, user_b: userB })
    .select('id')
    .single();

  if (inserted) {
    connId = inserted.id;
  } else if (insertError) {
    // Connection already exists — fetch it
    const { data: existing } = await supabase
      .from('connections')
      .select('id')
      .eq('user_a', userA)
      .eq('user_b', userB)
      .single();
    connId = existing?.id ?? null;
  }

  // Initialise read status for both users.
  // Requires migration 004 to be applied (policy: "Connection participants can initialise read status").
  if (connId) {
    const now = new Date().toISOString();
    await supabase.from('message_read_status').upsert(
      [
        { connection_id: connId, user_id: req.sender_id, last_read_at: now },
        { connection_id: connId, user_id: req.receiver_id, last_read_at: now },
      ],
      { onConflict: 'connection_id,user_id' }
    );
  }

  // Push notification to the original sender
  const pushToken = senderRes.data?.expo_push_token;
  const acceptorName = acceptorRes.data?.full_name ?? 'Someone';
  if (pushToken) {
    await sendExpoPushNotification(
      pushToken,
      'Connection accepted!',
      `${acceptorName} accepted your connection request.`,
    );
  }
}

async function sendExpoPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
): Promise<void> {
  if (!expoPushToken.startsWith('ExponentPushToken')) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: expoPushToken, title, body, sound: 'default' }),
    });
  } catch {
    // Non-critical — a failed push must not block the connection being created
  }
}

export async function declineConnectionRequest(requestId: string): Promise<void> {
  await supabase
    .from('connection_requests')
    .update({ status: 'declined' })
    .eq('id', requestId);
}

export async function getConnectionCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('connections')
    .select('id', { count: 'exact', head: true })
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);
  return count ?? 0;
}

export async function getPendingRequestCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('connection_requests')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('status', 'pending');
  return count ?? 0;
}
