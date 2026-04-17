import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { subscribeToChatList, unsubscribe } from '../../lib/realtime';
import { useAuthStore } from '../../stores/authStore';
import { ScreenBackground } from '../../components/ScreenBackground';
import { RequestCard, type RequestCardData } from '../../components/RequestCard';
import { ChatListItem } from '../../components/ChatListItem';
import { Avatar } from '../../components/ui/Avatar';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import type { Profile } from '../../types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Tab = 'All' | 'Unread' | 'Requests';

interface ChatPreview {
  connectionId: string;
  profile: Profile;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
}

interface OutgoingRequest {
  id: string;
  receiverId: string;
  receiverName: string;
  receiverAvatarUrl: string | null;
  receiverMajor: string;
}

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<Tab>((params.tab as Tab) ?? 'All');
  const [conversations, setConversations] = useState<ChatPreview[]>([]);
  const [search, setSearch] = useState('');
  const [incoming, setIncoming] = useState<RequestCardData[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');
  const channelRef = useRef<RealtimeChannel | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    const { data: conns } = await supabase
      .from('connections')
      .select('id, user_a, user_b')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

    if (!conns || conns.length === 0) {
      setConversations([]);
      return;
    }

    const connectionIds = conns.map((c: any) => c.id);
    const otherUserMap: Record<string, string> = {};
    conns.forEach((c: any) => {
      otherUserMap[c.id] = c.user_a === user.id ? c.user_b : c.user_a;
    });
    const otherIds = Object.values(otherUserMap);

    const [profilesRes, messagesRes, readRes] = await Promise.all([
      supabase.from('profiles').select('*').in('id', otherIds),
      supabase
        .from('messages')
        .select('connection_id, content, created_at, sender_id')
        .in('connection_id', connectionIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('message_read_status')
        .select('connection_id, last_read_at')
        .in('connection_id', connectionIds)
        .eq('user_id', user.id),
    ]);

    const profileMap: Record<string, Profile> = {};
    (profilesRes.data ?? []).forEach((p: any) => { profileMap[p.id] = p; });

    const lastMsgMap: Record<string, { content: string; at: string; senderId: string }> = {};
    (messagesRes.data ?? []).forEach((m: any) => {
      if (!lastMsgMap[m.connection_id]) {
        lastMsgMap[m.connection_id] = { content: m.content, at: m.created_at, senderId: m.sender_id };
      }
    });

    const readMap: Record<string, string> = {};
    (readRes.data ?? []).forEach((r: any) => { readMap[r.connection_id] = r.last_read_at; });

    const previews: ChatPreview[] = conns
      .map((c: any) => {
        const otherId = otherUserMap[c.id];
        const profile = profileMap[otherId];
        if (!profile) return null;
        const msg = lastMsgMap[c.id];
        const lastRead = readMap[c.id];
        const unread = !!msg && msg.senderId !== user.id &&
          (!lastRead || new Date(msg.at) > new Date(lastRead));
        return {
          connectionId: c.id,
          profile,
          lastMessage: msg?.content ?? null,
          lastMessageAt: msg?.at ?? null,
          unread,
        } as ChatPreview;
      })
      .filter(Boolean) as ChatPreview[];

    previews.sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    setConversations(previews);
  }, [user?.id]);

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;

    const [incomingRes, outgoingRes] = await Promise.all([
      supabase
        .from('connection_requests')
        .select('id, sender_id, intro_note, profiles!connection_requests_sender_id_fkey(full_name, avatar_url, major)')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('connection_requests')
        .select('id, receiver_id, profiles!connection_requests_receiver_id_fkey(full_name, avatar_url, major)')
        .eq('sender_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    setIncoming(
      (incomingRes.data ?? []).map((row: any) => ({
        id: row.id,
        senderId: row.sender_id,
        senderName: row.profiles?.full_name ?? 'Unknown',
        senderAvatarUrl: row.profiles?.avatar_url ?? null,
        senderMajor: row.profiles?.major ?? '',
        introNote: row.intro_note,
      }))
    );

    setOutgoing(
      (outgoingRes.data ?? []).map((row: any) => ({
        id: row.id,
        receiverId: row.receiver_id,
        receiverName: row.profiles?.full_name ?? 'Unknown',
        receiverAvatarUrl: row.profiles?.avatar_url ?? null,
        receiverMajor: row.profiles?.major ?? '',
      }))
    );
  }, [user?.id]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchConversations(), fetchRequests()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchConversations, fetchRequests]);

  // Re-fetch every time this tab comes into focus (picks up new connections after accept)
  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  useEffect(() => {
    if (params.tab) setActiveTab(params.tab as Tab);
  }, [params.tab]);

  // Realtime: update chat list preview on new messages
  useEffect(() => {
    if (!user?.id || conversations.length === 0) return;

    const connectionIds = conversations.map((c) => c.connectionId);

    channelRef.current = subscribeToChatList(connectionIds, (newMsg) => {
      setConversations((prev) =>
        prev
          .map((chat) => {
            if (chat.connectionId !== newMsg.connection_id) return chat;
            return {
              ...chat,
              lastMessage: newMsg.content,
              lastMessageAt: newMsg.created_at,
              unread: chat.unread || newMsg.sender_id !== user.id,
            };
          })
          .sort((a, b) => {
            if (!a.lastMessageAt && !b.lastMessageAt) return 0;
            if (!a.lastMessageAt) return 1;
            if (!b.lastMessageAt) return -1;
            return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
          })
      );
    });

    return () => { unsubscribe(channelRef.current); };
  }, [user?.id, conversations.length]);

  const handleCancelRequest = (req: OutgoingRequest) => {
    Alert.alert(
      `Cancel request to ${req.receiverName}?`,
      '',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel request',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('connection_requests').delete().eq('id', req.id);
            setOutgoing((prev) => prev.filter((r) => r.id !== req.id));
          },
        },
      ]
    );
  };

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const tabBarHeight = 54 + insets.bottom;
  const unreadCount = conversations.filter((c) => c.unread).length;
  const totalRequestsBadge = incoming.length;

  const filteredConversations = search
    ? conversations.filter((c) =>
        c.profile.full_name.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;
  const unreadConversations = filteredConversations.filter((c) => c.unread);

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        {/* Header */}
        <Text style={styles.screenTitle}>Chats</Text>
        <Text style={styles.subtitle}>
          {conversations.length} {conversations.length === 1 ? 'connection' : 'connections'}
        </Text>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={14} color="rgba(255,255,255,0.3)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={14} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {(['All', 'Unread', 'Requests'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
              {tab === 'All' && unreadCount > 0 && (
                <View style={[styles.unreadBadge, activeTab === 'All' && styles.unreadBadgeOnActive]}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
              {tab === 'Requests' && totalRequestsBadge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalRequestsBadge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {loading ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator color={Colors.teal.main} />
          </View>
        ) : activeTab === 'All' ? (
          filteredConversations.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Feather name="message-square" size={32} color={Colors.text.hint} />
              <Text style={styles.emptyText}>
                {search ? 'No results found' : 'No chats yet'}
              </Text>
              {!search && (
                <Text style={styles.emptySubtext}>Find students to connect with!</Text>
              )}
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal.main} />
              }
            >
              {filteredConversations.map((chat, i) => (
                <React.Fragment key={chat.connectionId}>
                  <ChatListItem
                    connectionId={chat.connectionId}
                    profile={chat.profile}
                    lastMessage={chat.lastMessage}
                    lastMessageAt={chat.lastMessageAt}
                    unread={chat.unread}
                    showSubtitle={true}
                  />
                  {i < filteredConversations.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </ScrollView>
          )
        ) : activeTab === 'Unread' ? (
          unreadConversations.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Feather name="check-circle" size={32} color={Colors.text.hint} />
              <Text style={styles.emptyText}>All caught up!</Text>
              <Text style={styles.emptySubtext}>No unread messages</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal.main} />
              }
            >
              {unreadConversations.map((chat, i) => (
                <React.Fragment key={chat.connectionId}>
                  <ChatListItem
                    connectionId={chat.connectionId}
                    profile={chat.profile}
                    lastMessage={chat.lastMessage}
                    lastMessageAt={chat.lastMessageAt}
                    unread={chat.unread}
                    showSubtitle={true}
                  />
                  {i < unreadConversations.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </ScrollView>
          )
        ) : (
          // Requests tab
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal.main} />
            }
          >
            {/* INCOMING section */}
            <Text style={styles.sectionLabel}>INCOMING</Text>
            {incoming.length === 0 ? (
              <View style={styles.sectionEmpty}>
                <Text style={styles.sectionEmptyText}>No incoming requests</Text>
              </View>
            ) : (
              incoming.map((req) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  onAccepted={(id, name) => {
                    setIncoming((prev) => prev.filter((r) => r.id !== id));
                    showToast(`You and ${name} are now connected!`);
                    // Refresh conversations then switch to All tab so the new chat is visible
                    fetchConversations().then(() => setActiveTab('All'));
                  }}
                  onDeclined={(id) => setIncoming((prev) => prev.filter((r) => r.id !== id))}
                />
              ))
            )}

            {/* OUTGOING section */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>OUTGOING</Text>
            {outgoing.length === 0 ? (
              <View style={styles.sectionEmpty}>
                <Text style={styles.sectionEmptyText}>No outgoing requests</Text>
              </View>
            ) : (
              outgoing.map((req) => (
                <View key={req.id} style={styles.outCard}>
                  <TouchableOpacity
                    style={styles.outHeaderRow}
                    onPress={() => router.push(`/profile/${req.receiverId}`)}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      size={44}
                      imageUrl={req.receiverAvatarUrl}
                      name={req.receiverName}
                      variant="teal"
                    />
                    <View style={styles.outNameCol}>
                      <Text style={styles.outName}>{req.receiverName}</Text>
                      <Text style={styles.outMajor} numberOfLines={1}>{req.receiverMajor}</Text>
                    </View>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>Pending</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancelRequest(req)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelText}>Cancel request</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14 },
  screenTitle: {
    fontSize: Typography.size.screenTitle,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    padding: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: { backgroundColor: Colors.teal.main },
  tabText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  tabTextActive: { color: '#FFFFFF' },
  unreadBadge: {
    backgroundColor: Colors.teal.main,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeOnActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  unreadBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  badge: {
    backgroundColor: Colors.rose.main,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 14,
  },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '500', color: Colors.text.body },
  emptySubtext: { fontSize: 13, color: Colors.text.hint, textAlign: 'center', paddingHorizontal: 32 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingLeft: 2,
  },
  sectionEmpty: {
    paddingVertical: 14,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  sectionEmptyText: { fontSize: 13, color: Colors.text.hint },
  outCard: {
    backgroundColor: Colors.glass.default,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: Colors.glass.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  outHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  outNameCol: { flex: 1 },
  outName: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  outMajor: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  pendingBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingText: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  cancelBtn: {
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(226,75,74,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 12, fontWeight: '500', color: Colors.error },
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
