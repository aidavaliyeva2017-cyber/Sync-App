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
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { acceptConnectionRequest, declineConnectionRequest } from '../lib/connections';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { ScreenBackground } from '../components/ScreenBackground';
import { Toast } from '../components/ui/Toast';
import { SkeletonChatRow } from '../components/ui/Skeleton';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import type { Notification } from '../types/database';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hour${diffH === 1 ? '' : 's'} ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) {
    return `Yesterday at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffD < 7) return `${diffD} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function extractInitials(title: string): string {
  // Try to pull a name from the start of the title (e.g. "Lena K. wants…" → "LK")
  const words = title.split(' ');
  const nameWords = words.filter((w) => w.length > 0 && /^[A-Z]/.test(w));
  if (nameWords.length === 0) return '';
  const first = nameWords[0][0] ?? '';
  // second word may be a last-name initial like "K."
  const second = nameWords[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

const TYPE_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  connection_request: 'user-plus',
  connection_accepted: 'check-circle',
  new_message: 'message-circle',
  new_match: 'star',
};

// ─── component ──────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { setUnreadCount, markAllAsSeen } = useNotificationStore();

  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Load pref flags from AsyncStorage
      const [reqPref, msgPref, matchPref] = await Promise.all([
        AsyncStorage.getItem('@sync/notif_connection_requests'),
        AsyncStorage.getItem('@sync/notif_messages'),
        AsyncStorage.getItem('@sync/notif_matches'),
      ]);
      const showRequests = reqPref !== 'false';
      const showMessages = msgPref !== 'false';
      const showMatches = matchPref !== 'false';

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter by pref settings
      const filtered = (data ?? []).filter((n: Notification) => {
        if (n.type === 'connection_request' && !showRequests) return false;
        if (n.type === 'new_message' && !showMessages) return false;
        if (n.type === 'new_match' && !showMatches) return false;
        return true;
      });

      setItems(filtered);
      const unread = filtered.filter((n: Notification) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('[notifications] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      // Immediately clear the bell badge when this screen is opened (seen ≠ read)
      markAllAsSeen();
      fetchNotifications();
    }, [fetchNotifications, markAllAsSeen])
  );

  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  // ── mark read ──────────────────────────────────────────────────────────────

  const markOneRead = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(
      Math.max(0, items.filter((n) => !n.is_read && n.id !== id).length)
    );
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  }, [items]);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  }, [user?.id]);

  // ── navigate on tap ────────────────────────────────────────────────────────

  const handleTap = useCallback(
    async (item: Notification) => {
      if (!item.is_read) await markOneRead(item.id);

      switch (item.type) {
        case 'connection_accepted':
        case 'new_message':
          if (item.reference_id) router.push(`/chat/${item.reference_id}`);
          break;
        case 'new_match':
          if (item.reference_id) router.push(`/profile/${item.reference_id}`);
          else router.push('/(tabs)/home');
          break;
        case 'connection_request':
          // handled by inline Accept/Decline — tap on body still goes to requests tab
          router.push({ pathname: '/(tabs)/chats', params: { tab: 'Requests' } });
          break;
      }
    },
    [markOneRead]
  );

  // ── accept / decline inline ────────────────────────────────────────────────

  const handleAccept = useCallback(
    async (item: Notification) => {
      if (!item.reference_id) return;
      setActioningId(item.id);
      try {
        await acceptConnectionRequest(item.reference_id);
        await markOneRead(item.id);
        setItems((prev) => prev.filter((n) => n.id !== item.id));
        // Extract the name from title for toast
        const name = item.title.split(' ').slice(0, 2).join(' ');
        showToast(`You and ${name} are now connected!`, 'success');
      } catch (err) {
        console.error('[notifications] accept error:', err);
        showToast('Failed to accept request', 'error');
      } finally {
        setActioningId(null);
      }
    },
    [markOneRead]
  );

  const handleDecline = useCallback(
    async (item: Notification) => {
      if (!item.reference_id) return;
      setActioningId(item.id);
      try {
        await declineConnectionRequest(item.reference_id);
        await markOneRead(item.id);
        setItems((prev) => prev.filter((n) => n.id !== item.id));
      } catch (err) {
        console.error('[notifications] decline error:', err);
        showToast('Failed to decline request', 'error');
      } finally {
        setActioningId(null);
      }
    },
    [markOneRead]
  );

  // ── render item ────────────────────────────────────────────────────────────

  const renderItem = (item: Notification, index: number) => {
    const isRequest = item.type === 'connection_request';
    const isActioning = actioningId === item.id;
    const initials = extractInitials(item.title);
    const isNewMatch = item.type === 'new_match';
    // Alternate avatar colour for visual variety
    const avatarVariant = index % 3 === 1 ? 'rose' : 'teal';

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.item, !item.is_read && styles.itemUnread]}
        onPress={() => handleTap(item)}
        activeOpacity={0.75}
      >
        {/* Unread indicator bar */}
        {!item.is_read && <View style={styles.unreadBar} />}

        {/* Avatar / icon */}
        <View style={[
          styles.avatarCircle,
          avatarVariant === 'rose'
            ? styles.avatarRose
            : styles.avatarTeal,
        ]}>
          {isNewMatch || !initials ? (
            <Feather
              name={TYPE_ICON[item.type] ?? 'bell'}
              size={16}
              color={avatarVariant === 'rose' ? Colors.rose.soft : Colors.teal.light}
            />
          ) : (
            <Text style={[
              styles.avatarInitials,
              { color: avatarVariant === 'rose' ? Colors.rose.soft : Colors.teal.light },
            ]}>
              {initials}
            </Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.itemContent}>
          <Text
            style={[styles.itemTitle, !item.is_read && styles.itemTitleUnread]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.body ? (
            <Text style={styles.itemBody} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
          <Text style={styles.itemTime}>{formatRelativeTime(item.created_at)}</Text>

          {/* Inline Accept / Decline for connection_request */}
          {isRequest && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.acceptBtn, isActioning && { opacity: 0.6 }]}
                onPress={() => handleAccept(item)}
                disabled={isActioning}
                activeOpacity={0.8}
              >
                {isActioning ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.acceptText}>Accept</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.declineBtn, isActioning && { opacity: 0.6 }]}
                onPress={() => handleDecline(item)}
                disabled={isActioning}
                activeOpacity={0.8}
              >
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── group by date ──────────────────────────────────────────────────────────

  const todayItems = items.filter((n) => isToday(n.created_at));
  const earlierItems = items.filter((n) => !isToday(n.created_at));
  const unreadCount = items.filter((n) => !n.is_read).length;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <ScreenBackground>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backBtn}
        >
          <Feather name="chevron-left" size={24} color={Colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.screenTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={markAllRead}
          disabled={unreadCount === 0}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.markAllText, unreadCount === 0 && { opacity: 0.3 }]}>
            Mark all read
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <ScrollView contentContainerStyle={styles.skeletonWrap}>
          <SkeletonChatRow />
          <View style={styles.divider} />
          <SkeletonChatRow />
          <View style={styles.divider} />
          <SkeletonChatRow />
          <View style={styles.divider} />
          <SkeletonChatRow />
        </ScrollView>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Feather name="bell-off" size={24} color={Colors.text.hint} />
          </View>
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySub}>
            You'll be notified about connections, messages, and matches here.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 32 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.teal.main}
            />
          }
        >
          {todayItems.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>NEW</Text>
              {todayItems.map((item, i) => (
                <React.Fragment key={item.id}>
                  {renderItem(item, i)}
                  {i < todayItems.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </>
          )}

          {earlierItems.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, todayItems.length > 0 && { marginTop: 24 }]}>
                EARLIER
              </Text>
              {earlierItems.map((item, i) => (
                <React.Fragment key={item.id}>
                  {renderItem(item, todayItems.length + i)}
                  {i < earlierItems.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </>
          )}
        </ScrollView>
      )}

      <Toast
        visible={toastVisible}
        message={toastMsg}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
      />
    </ScreenBackground>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { width: 32, alignItems: 'flex-start' },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 4,
  },
  screenTitle: {
    fontSize: Typography.size.screenTitle,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  countBadge: {
    backgroundColor: Colors.teal.main,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  markAllText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.teal.bright,
  },
  skeletonWrap: { paddingTop: 8 },
  list: { paddingTop: 8, paddingHorizontal: 0 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    marginBottom: 4,
    marginTop: 8,
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    position: 'relative',
  },
  itemUnread: {
    // subtle highlight — the teal left bar provides the main visual cue
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.teal.main,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarTeal: { backgroundColor: 'rgba(27,138,143,0.20)' },
  avatarRose: { backgroundColor: 'rgba(212,107,158,0.20)' },
  avatarInitials: { fontSize: 13, fontWeight: '700' },
  itemContent: { flex: 1 },
  itemTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
    marginBottom: 2,
  },
  itemTitleUnread: { color: Colors.text.primary, fontWeight: '600' },
  itemBody: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 17,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  itemTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  acceptBtn: {
    height: 32,
    paddingHorizontal: 18,
    backgroundColor: Colors.teal.main,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  acceptText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  declineBtn: {
    height: 32,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  declineText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: Colors.text.body },
  emptySub: {
    fontSize: 13,
    color: Colors.text.hint,
    textAlign: 'center',
    lineHeight: 19,
  },
});
