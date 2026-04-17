import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { ScreenBackground } from '../../components/ScreenBackground';
import { StudentCard } from '../../components/StudentCard';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import type { Profile } from '../../types/database';

const FILTER_CHIPS = [
  'Design', 'AI / Machine Learning', 'Startups', 'Engineering',
  'Data Science', 'Business', 'Marketing', 'Sustainability',
  'Computer Science', 'Product Management',
];

import type { ConnectionStatus } from '../../components/StudentCard';

type ConnectType = 'All' | 'In-person' | 'Online';
type ConnStatus = ConnectionStatus;

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const tabBarHeight = 54 + insets.bottom;

  const [search, setSearch] = useState('');
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [connectType, setConnectType] = useState<ConnectType>('All');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [connStatuses, setConnStatuses] = useState<Record<string, ConnStatus>>({});
  const [requestIds, setRequestIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProfiles = useCallback(async (searchVal: string, chips: string[], type: ConnectType) => {
    if (!user?.id) return;
    setLoading(true);

    let query = supabase
      .from('profiles')
      .select('*')
      .eq('onboarding_complete', true)
      .neq('id', user.id);

    if (searchVal.trim()) {
      query = query.or(
        `full_name.ilike.%${searchVal.trim()}%,major.ilike.%${searchVal.trim()}%`
      );
    }

    if (chips.length > 0) {
      query = query.contains('interests', chips);
    }

    if (type === 'In-person') {
      query = query.or('connect_preference.eq.in-person,connect_preference.eq.both');
    } else if (type === 'Online') {
      query = query.or('connect_preference.eq.online,connect_preference.eq.both');
    }
    // 'All' — no filter applied

    const { data, error } = await query.limit(50);
    if (error) console.error('[Discover] profiles fetch error:', error);
    console.log('[Discover] profiles fetched:', data?.length ?? 0, 'user:', user.id);
    setProfiles(data ?? []);
    setLoading(false);

    // Fetch connection statuses for all returned profiles
    if (data && data.length > 0) {
      const ids = data.map((p) => p.id);

      const [connRes, reqRes] = await Promise.all([
        supabase
          .from('connections')
          .select('user_a, user_b')
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
        supabase
          .from('connection_requests')
          .select('id, sender_id, receiver_id')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('status', 'pending'),
      ]);

      const statusMap: Record<string, ConnStatus> = {};
      ids.forEach((id) => { statusMap[id] = 'none'; });

      connRes.data?.forEach((c) => {
        const other = c.user_a === user.id ? c.user_b : c.user_a;
        if (statusMap[other] !== undefined) statusMap[other] = 'connected';
      });

      const requestIdMap: Record<string, string> = {};
      reqRes.data?.forEach((r) => {
        if (r.sender_id === user.id && statusMap[r.receiver_id] !== undefined) {
          statusMap[r.receiver_id] = 'pending_sent';
        } else if (r.receiver_id === user.id && statusMap[r.sender_id] !== undefined) {
          statusMap[r.sender_id] = 'pending_received';
          requestIdMap[r.sender_id] = r.id;
        }
      });

      setConnStatuses(statusMap);
      setRequestIds(requestIdMap);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    fetchProfiles('', [], connectType);
  }, [fetchProfiles]);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProfiles(val, activeChips, connectType);
    }, 300);
  };

  const toggleChip = (chip: string) => {
    const next = activeChips.includes(chip)
      ? activeChips.filter((c) => c !== chip)
      : [...activeChips, chip];
    setActiveChips(next);
    fetchProfiles(search, next, connectType);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        {/* Header */}
        <Text style={styles.screenTitle}>Discover</Text>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.3)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, major..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={search}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => { setSearch(''); fetchProfiles('', activeChips, connectType); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={16} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0, marginBottom: 12 }}
        >
          {FILTER_CHIPS.map((chip) => {
            const active = activeChips.includes(chip);
            return (
              <TouchableOpacity
                key={chip}
                onPress={() => toggleChip(chip)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: 8,
                  backgroundColor: active ? 'rgba(27,138,143,0.25)' : 'rgba(255,255,255,0.06)',
                  borderWidth: 0.5,
                  borderColor: active ? Colors.teal.tagBorderAlpha : 'rgba(255,255,255,0.12)',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: active ? Colors.teal.light : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {chip}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Connect type toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Connect type</Text>
          <View style={styles.togglePills}>
            {(['All', 'In-person', 'Online'] as ConnectType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.togglePill, connectType === type && styles.togglePillActive]}
                onPress={() => { setConnectType(type); fetchProfiles(search, activeChips, type); }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.togglePillText,
                    connectType === type && styles.togglePillTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Results */}
        <Text style={styles.resultsLabel}>
          RESULTS ({loading ? '…' : profiles.length})
        </Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.teal.main} />
          </View>
        ) : profiles.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="users" size={32} color={Colors.text.hint} />
            <Text style={styles.emptyText}>No students found</Text>
            <Text style={styles.emptySubtext}>Try broadening your search</Text>
          </View>
        ) : (
          <FlatList
            data={profiles}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <StudentCard
                profile={item}
                connectionStatus={connStatuses[item.id] ?? 'none'}
                requestId={requestIds[item.id]}
                onStatusChange={(profileId, newStatus) =>
                  setConnStatuses((prev) => ({ ...prev, [profileId]: newStatus }))
                }
                onToast={showToast}
              />
            )}
            contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
            showsVerticalScrollIndicator={false}
          />
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
    marginBottom: 14,
  },
  searchBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchIcon: {},
  searchInput: { flex: 1, fontSize: 14, color: '#FFFFFF' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  toggleLabel: { fontSize: 13, color: Colors.text.body },
  togglePills: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 3,
  },
  togglePill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 17,
  },
  togglePillActive: { backgroundColor: Colors.teal.main },
  togglePillText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  togglePillTextActive: { color: '#FFFFFF' },
  resultsLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '500', color: Colors.text.body },
  emptySubtext: { fontSize: 13, color: Colors.text.hint },
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
