import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getPendingRequestCount, getConnectionStatus } from '../../lib/connections';
import { useAuthStore } from '../../stores/authStore';
import { ScreenBackground } from '../../components/ScreenBackground';
import { Avatar } from '../../components/ui/Avatar';
import { Tag } from '../../components/ui/Tag';
import { GlassCard } from '../../components/ui/GlassCard';
import { ConnectionModal } from '../../components/ConnectionModal';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import type { Profile } from '../../types/database';

interface ChatPreview {
  connectionId: string;
  profile: Profile;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [matchProfile, setMatchProfile] = useState<Profile | null>(null);
  const [matchConnStatus, setMatchConnStatus] = useState<'none' | 'request_sent'>('none');
  const [pendingCount, setPendingCount] = useState(0);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    // Parallel fetches
    const [pendingCnt, connectionsRes, requestsRes, incomingRes] = await Promise.all([
      getPendingRequestCount(user.id),
      supabase
        .from('connections')
        .select('id, user_a, user_b, created_at')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order('created_at', { ascending: false }),
      supabase
        .from('connection_requests')
        .select('receiver_id')
        .eq('sender_id', user.id)
        .eq('status', 'pending'),
      supabase
        .from('connection_requests')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .eq('status', 'pending'),
    ]);

    setPendingCount(pendingCnt);

    const sentToIds = new Set((requestsRes.data ?? []).map((r) => r.receiver_id));
    const receivedFromIds = new Set((incomingRes.data ?? []).map((r) => r.sender_id));
    const connectedIds = new Set<string>();
    const connectionIds = (connectionsRes.data ?? []).map((c) => {
      const otherId = c.user_a === user.id ? c.user_b : c.user_a;
      connectedIds.add(otherId);
      return { connectionId: c.id, otherId };
    });

    // Fetch match: pick a random profile not connected, not pending
    const { data: candidates } = await supabase
      .from('profiles')
      .select('*')
      .eq('onboarding_complete', true)
      .neq('id', user.id)
      .limit(50);

    const eligible = (candidates ?? []).filter(
      (p) => !connectedIds.has(p.id) && !sentToIds.has(p.id) && !receivedFromIds.has(p.id)
    );

    if (eligible.length > 0) {
      const pick = eligible[Math.floor(Math.random() * eligible.length)];
      setMatchProfile(pick);
      // Defensive check: verify actual status in case of any race condition
      const actualStatus = await getConnectionStatus(user.id, pick.id);
      setMatchConnStatus(actualStatus === 'request_sent' ? 'request_sent' : 'none');
    } else {
      setMatchProfile(null);
    }

    // Fetch chat previews (up to 3 most recent connections)
    if (connectionIds.length > 0) {
      const top3 = connectionIds.slice(0, 3);
      const otherIds = top3.map((c) => c.otherId);

      const [profilesRes, messagesRes, readRes] = await Promise.all([
        supabase.from('profiles').select('*').in('id', otherIds),
        supabase
          .from('messages')
          .select('connection_id, content, created_at, sender_id')
          .in('connection_id', top3.map((c) => c.connectionId))
          .order('created_at', { ascending: false }),
        supabase
          .from('message_read_status')
          .select('connection_id, last_read_at')
          .in('connection_id', top3.map((c) => c.connectionId))
          .eq('user_id', user.id),
      ]);

      const profileMap: Record<string, Profile> = {};
      (profilesRes.data ?? []).forEach((p) => { profileMap[p.id] = p; });

      const lastMsgMap: Record<string, { content: string; at: string; senderId: string }> = {};
      (messagesRes.data ?? []).forEach((m) => {
        if (!lastMsgMap[m.connection_id]) {
          lastMsgMap[m.connection_id] = { content: m.content, at: m.created_at, senderId: m.sender_id };
        }
      });

      const readMap: Record<string, string> = {};
      (readRes.data ?? []).forEach((r) => { readMap[r.connection_id] = r.last_read_at; });

      const previews: ChatPreview[] = top3
        .map(({ connectionId, otherId }) => {
          const profile = profileMap[otherId];
          if (!profile) return null;
          const msg = lastMsgMap[connectionId];
          const lastRead = readMap[connectionId];
          const unread = !!msg && msg.senderId !== user.id &&
            (!lastRead || new Date(msg.at) > new Date(lastRead));
          return {
            connectionId,
            profile,
            lastMessage: msg?.content ?? null,
            lastMessageAt: msg?.at ?? null,
            unread,
          } as ChatPreview;
        })
        .filter(Boolean) as ChatPreview[];

      setChats(previews);
    } else {
      setChats([]);
    }

    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  // Re-fetch on every focus so the pending banner updates after accepting/declining requests
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const tabBarHeight = 54 + insets.bottom;

  if (loading) {
    return (
      <ScreenBackground>
        <View style={[styles.loadingWrap, { paddingTop: insets.top }]}>
          <ActivityIndicator color={Colors.teal.main} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: tabBarHeight + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal.main} />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.wordmark}>Sync</Text>
          <View style={styles.headerBtns}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => showToast('Notifications coming soon')}
              activeOpacity={0.7}
            >
              <Feather name="bell" size={16} color={Colors.text.icon} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setMenuVisible((v) => !v)}
              activeOpacity={0.7}
            >
              <Feather name="more-vertical" size={16} color={Colors.text.icon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending requests banner */}
        {pendingCount > 0 && (
          <TouchableOpacity
            style={styles.banner}
            onPress={() => router.push({ pathname: '/(tabs)/chats', params: { tab: 'Requests' } })}
            activeOpacity={0.8}
          >
            <Feather name="user-plus" size={16} color={Colors.rose.soft} />
            <Text style={styles.bannerText}>
              {pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'}
            </Text>
            <Feather name="chevron-right" size={14} color={Colors.rose.soft} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        {/* Today's match */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionLabel}>TODAY'S MATCH</Text>
          {matchProfile ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push(`/profile/${matchProfile.id}`)}
            >
              <View style={styles.matchRow}>
                <Avatar size={48} imageUrl={matchProfile.avatar_url} name={matchProfile.full_name} variant="teal" />
                <View style={styles.matchInfo}>
                  <Text style={styles.matchName}>{matchProfile.full_name}</Text>
                  <Text style={styles.matchSub} numberOfLines={1}>
                    {[matchProfile.major, matchProfile.city].filter(Boolean).join(' — ')}
                  </Text>
                </View>
              </View>
              {matchProfile.interests?.length > 0 && (
                <View style={styles.tagsRow}>
                  {matchProfile.interests.slice(0, 3).map((tag) => (
                    <Tag key={tag} label={tag} />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyMatch}>
              <Feather name="users" size={24} color={Colors.text.hint} />
              <Text style={styles.emptyMatchText}>No new matches right now. Check back later!</Text>
            </View>
          )}
          {matchProfile && (
            matchConnStatus === 'none' ? (
              <TouchableOpacity
                style={styles.connectBtn}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.connectBtnText}>Connect</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.connectBtn, styles.requestedBtn]}>
                <Text style={styles.requestedText}>Requested</Text>
              </View>
            )
          )}
        </GlassCard>

        {/* Recent chats */}
        <GlassCard style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
          <Text style={[styles.sectionLabel, { paddingHorizontal: 14, paddingTop: 14 }]}>
            RECENT CHATS
          </Text>
          {chats.length === 0 ? (
            <View style={styles.emptyChats}>
              <Text style={styles.emptyChatsText}>No conversations yet.</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/discover')}>
                <Text style={styles.emptyChatsLink}>Find someone to connect with</Text>
              </TouchableOpacity>
            </View>
          ) : (
            chats.map((chat, i) => (
              <TouchableOpacity
                key={chat.connectionId}
                style={[styles.chatRow, i < chats.length - 1 && styles.chatRowBorder]}
                onPress={() => router.push(`/chat/${chat.connectionId}`)}
                activeOpacity={0.7}
              >
                <View style={styles.chatAvatarWrap}>
                  <Avatar size={38} imageUrl={chat.profile.avatar_url} name={chat.profile.full_name} variant="teal" />
                  {chat.unread && <View style={styles.unreadDot} />}
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>{chat.profile.full_name}</Text>
                  <Text style={styles.chatPreview} numberOfLines={1}>
                    {chat.lastMessage ?? 'No messages yet'}
                  </Text>
                </View>
                <Text style={styles.chatTime}>{formatTimestamp(chat.lastMessageAt)}</Text>
              </TouchableOpacity>
            ))
          )}
        </GlassCard>
      </ScrollView>

      {/* Backdrop dismiss for dropdown — renders below the dropdown itself */}
      {menuVisible && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => setMenuVisible(false)}
          activeOpacity={0}
        />
      )}

      {/* Floating dropdown — rendered after backdrop so it sits on top */}
      {menuVisible && (
        <TouchableOpacity
          style={[styles.dropdown, { top: insets.top + 54, right: 14 }]}
          onPress={() => { setMenuVisible(false); router.push('/settings'); }}
          activeOpacity={0.8}
        >
          <Feather name="settings" size={14} color={Colors.text.body} style={{ marginRight: 8 }} />
          <Text style={styles.dropdownText}>Settings</Text>
        </TouchableOpacity>
      )}

      {/* Connection modal */}
      {matchProfile && (
        <ConnectionModal
          visible={modalVisible}
          recipientId={matchProfile.id}
          recipientName={matchProfile.full_name}
          recipientAvatarUrl={matchProfile.avatar_url}
          onClose={() => setModalVisible(false)}
          onSent={() => {
            setModalVisible(false);
            setMatchConnStatus('request_sent');
            showToast(`Connection request sent to ${matchProfile.full_name}!`);
          }}
        />
      )}

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 14 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: Typography.letterSpacing.wordmark,
  },
  headerBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.glass.iconBg,
    borderWidth: 0.5,
    borderColor: Colors.glass.iconBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    backgroundColor: Colors.background.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.glass.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 200,
    minWidth: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  dropdownText: { fontSize: 14, color: Colors.text.body },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.rose.bannerBgAlpha,
    borderWidth: 0.5,
    borderColor: Colors.rose.bannerBorderAlpha,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  bannerText: { fontSize: 13, fontWeight: '500', color: Colors.rose.soft },
  card: { marginBottom: 12, gap: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  matchInfo: { flex: 1 },
  matchName: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  matchSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  connectBtn: {
    height: 36,
    backgroundColor: Colors.teal.main,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtnText: { fontSize: 12, fontWeight: '500', color: '#FFFFFF' },
  requestedBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)' },
  requestedText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  emptyMatch: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  emptyMatchText: { fontSize: 13, color: Colors.text.hint, textAlign: 'center' },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  chatRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  chatAvatarWrap: { position: 'relative' },
  unreadDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.teal.main,
    borderWidth: 1.5,
    borderColor: Colors.background.base,
  },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  chatPreview: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  chatTime: { fontSize: 10, color: 'rgba(255,255,255,0.25)' },
  emptyChats: { paddingHorizontal: 14, paddingVertical: 16, gap: 6 },
  emptyChatsText: { fontSize: 13, color: Colors.text.hint },
  emptyChatsLink: { fontSize: 13, color: Colors.teal.light },
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(30,30,40,0.95)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  toastText: { fontSize: 13, color: Colors.text.body, fontWeight: '500' },
});
