import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getPendingRequestCount } from '../../lib/connections';
import { generateMatch } from '../../lib/matching';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { ScreenBackground } from '../../components/ScreenBackground';
import { Avatar } from '../../components/ui/Avatar';
import { Tag } from '../../components/ui/Tag';
import { GlassCard } from '../../components/ui/GlassCard';
import { ConnectionModal } from '../../components/ConnectionModal';
import { Toast } from '../../components/ui/Toast';
import { NetworkBanner } from '../../components/ui/NetworkBanner';
import { SkeletonMatchCard, SkeletonChatRow } from '../../components/ui/Skeleton';
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
  const { profile } = useProfileStore();
  const { unreadCount: notifUnread, setUnreadCount: setNotifUnread } = useNotificationStore();

  const [matchProfile, setMatchProfile] = useState<Profile | null>(null);
  const [matchReason, setMatchReason] = useState('');
  const [matchConnStatus, setMatchConnStatus] = useState<'none' | 'request_sent'>('none');
  const [pendingCount, setPendingCount] = useState(0);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setNetworkError(false);

    try {
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

      // Smart match algorithm
      if (profile) {
        try {
          const match = await generateMatch(user.id, profile);
          if (match) {
            // Verify the match isn't already connected/pending
            const alreadyConn = connectedIds.has(match.profile.id);
            const alreadySent = sentToIds.has(match.profile.id);
            const alreadyReceived = receivedFromIds.has(match.profile.id);
            if (!alreadyConn && !alreadySent && !alreadyReceived) {
              setMatchProfile(match.profile);
              setMatchReason(match.reason);
              setMatchConnStatus('none');
            } else if (alreadySent) {
              setMatchProfile(match.profile);
              setMatchReason(match.reason);
              setMatchConnStatus('request_sent');
            } else {
              setMatchProfile(null);
              setMatchReason('');
            }
          } else {
            setMatchProfile(null);
            setMatchReason('');
          }
        } catch (err) {
          console.error('[home] match generation error:', err);
          setMatchProfile(null);
        }
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
            const p = profileMap[otherId];
            if (!p) return null;
            const msg = lastMsgMap[connectionId];
            const lastRead = readMap[connectionId];
            const unread =
              !!msg &&
              msg.senderId !== user.id &&
              (!lastRead || new Date(msg.at) > new Date(lastRead));
            return {
              connectionId,
              profile: p,
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
      // Notification unread count for bell badge
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setNotifUnread(count ?? 0);
    } catch (err) {
      console.error('[home] fetchData error:', err);
      setNetworkError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, profile]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const tabBarHeight = 54 + insets.bottom;

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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.teal.main}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.wordmark}>Sync</Text>
          <View style={styles.headerBtns}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/notifications')}
              activeOpacity={0.7}
            >
              <Feather name="bell" size={16} color={Colors.text.icon} />
              {notifUnread > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {notifUnread > 9 ? '9+' : notifUnread}
                  </Text>
                </View>
              )}
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
            onPress={() =>
              router.push({ pathname: '/(tabs)/chats', params: { tab: 'Requests' } })
            }
            activeOpacity={0.8}
          >
            <Feather name="user-plus" size={16} color={Colors.rose.soft} />
            <Text style={styles.bannerText}>
              {pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'}
            </Text>
            <Feather
              name="chevron-right"
              size={14}
              color={Colors.rose.soft}
              style={{ marginLeft: 'auto' }}
            />
          </TouchableOpacity>
        )}

        {/* Today's match */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionLabel}>TODAY'S MATCH</Text>
          {loading ? (
            <SkeletonMatchCard />
          ) : matchProfile ? (
            <>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push(`/profile/${matchProfile.id}`)}
              >
                <View style={styles.matchRow}>
                  <Avatar
                    size={48}
                    imageUrl={matchProfile.avatar_url}
                    name={matchProfile.full_name}
                    variant="teal"
                  />
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
                {matchReason ? (
                  <Text style={styles.matchReason}>Why this match: {matchReason}</Text>
                ) : null}
              </TouchableOpacity>
              {matchConnStatus === 'none' ? (
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
              )}
            </>
          ) : (
            <View style={styles.emptyMatch}>
              <View style={styles.emptyMatchIconWrap}>
                <Feather name="users" size={24} color={Colors.teal.main} />
              </View>
              <Text style={styles.emptyMatchTitle}>No new matches right now</Text>
              <Text style={styles.emptyMatchSub}>Check back tomorrow!</Text>
            </View>
          )}
        </GlassCard>

        {/* Recent chats */}
        <GlassCard style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
          <Text style={[styles.sectionLabel, { paddingHorizontal: 14, paddingTop: 14 }]}>
            RECENT CHATS
          </Text>
          {loading ? (
            <>
              <SkeletonChatRow />
              <View style={styles.chatRowBorder} />
              <SkeletonChatRow />
              <View style={styles.chatRowBorder} />
              <SkeletonChatRow />
            </>
          ) : chats.length === 0 ? (
            <View style={styles.emptyChats}>
              <Feather name="message-circle" size={22} color={Colors.text.hint} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyChatsText}>Start connecting to begin chatting</Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/discover')}
                style={styles.discoverBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.discoverBtnText}>Discover students</Text>
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
                  <Avatar
                    size={38}
                    imageUrl={chat.profile.avatar_url}
                    name={chat.profile.full_name}
                    variant="teal"
                  />
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

      {/* Backdrop dismiss for dropdown */}
      {menuVisible && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => setMenuVisible(false)}
          activeOpacity={0}
        />
      )}

      {/* Floating dropdown */}
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
            showToast(`Connection request sent to ${matchProfile.full_name}!`, 'success');
          }}
        />
      )}

      <NetworkBanner visible={networkError} onRetry={() => { setLoading(true); fetchData(); }} />

      <Toast
        visible={toastVisible}
        message={toastMsg}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 14 },
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
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  matchReason: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
    fontStyle: 'italic',
  },
  connectBtn: {
    height: 36,
    backgroundColor: Colors.teal.main,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  connectBtnText: { fontSize: 12, fontWeight: '500', color: '#FFFFFF' },
  requestedBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  requestedText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  emptyMatch: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  emptyMatchIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(27,138,143,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(27,138,143,0.25)',
  },
  emptyMatchTitle: { fontSize: 14, fontWeight: '600', color: Colors.text.body },
  emptyMatchSub: { fontSize: 12, color: Colors.text.hint },
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
  emptyChats: {
    paddingHorizontal: 14,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyChatsText: { fontSize: 13, color: Colors.text.hint, textAlign: 'center' },
  discoverBtn: {
    marginTop: 4,
    height: 34,
    paddingHorizontal: 18,
    backgroundColor: Colors.teal.main,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverBtnText: { fontSize: 12, fontWeight: '500', color: '#FFFFFF' },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.rose.main,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: Colors.background.base,
  },
  bellBadgeText: { fontSize: 8, fontWeight: '700', color: '#FFFFFF' },
});
