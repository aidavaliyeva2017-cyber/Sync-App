import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { ScreenBackground } from '../../components/ScreenBackground';
import { StudentCard } from '../../components/StudentCard';
import { Toast } from '../../components/ui/Toast';
import { NetworkBanner } from '../../components/ui/NetworkBanner';
import { SkeletonStudentCard } from '../../components/ui/Skeleton';
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
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [networkError, setNetworkError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const fetchProfiles = useCallback(
    async (searchVal: string, chips: string[], type: ConnectType) => {
      if (!user?.id) return;
      setLoading(true);
      setNetworkError(false);

      try {
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

        const { data, error } = await query.limit(20);
        if (error) throw error;

        setProfiles(data ?? []);

        // Batch-fetch all connection statuses in two queries
        if (data && data.length > 0) {
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
          data.forEach((p) => { statusMap[p.id] = 'none'; });

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
      } catch (err) {
        console.error('[Discover] fetch error:', err);
        setNetworkError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    fetchProfiles('', [], connectType);
  }, [fetchProfiles]);

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

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfiles(search, activeChips, connectType);
  };

  const hasActiveFilters = search.trim().length > 0 || activeChips.length > 0 || connectType !== 'All';

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        {/* Header */}
        <Text style={styles.screenTitle}>Discover</Text>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.3)" />
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
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {FILTER_CHIPS.map((chip) => {
            const active = activeChips.includes(chip);
            return (
              <TouchableOpacity
                key={chip}
                onPress={() => toggleChip(chip)}
                activeOpacity={0.7}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip}</Text>
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
                <Text style={[styles.togglePillText, connectType === type && styles.togglePillTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Results label */}
        <Text style={styles.resultsLabel}>
          RESULTS ({loading ? '…' : profiles.length})
        </Text>

        {/* Content */}
        {loading ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
          >
            <SkeletonStudentCard />
            <SkeletonStudentCard />
            <SkeletonStudentCard />
          </ScrollView>
        ) : profiles.length === 0 ? (
          <View style={styles.emptyWrap}>
            {hasActiveFilters ? (
              <>
                <View style={styles.emptyIconWrap}>
                  <Feather name="search" size={24} color={Colors.text.hint} />
                </View>
                <Text style={styles.emptyText}>No students found</Text>
                <Text style={styles.emptySubtext}>Try broadening your search or filters</Text>
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => {
                    setSearch('');
                    setActiveChips([]);
                    setConnectType('All');
                    fetchProfiles('', [], 'All');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearBtnText}>Clear all filters</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.emptyIconWrap}>
                  <Feather name="users" size={24} color={Colors.teal.main} />
                </View>
                <Text style={styles.emptyText}>Sync is growing!</Text>
                <Text style={styles.emptySubtext}>
                  You're one of our first members. More students are joining every day.
                </Text>
              </>
            )}
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
                onToast={(msg) => showToast(msg, 'success')}
              />
            )}
            contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.teal.main}
              />
            }
          />
        )}
      </View>

      <NetworkBanner
        visible={networkError}
        onRetry={() => {
          setLoading(true);
          fetchProfiles(search, activeChips, connectType);
        }}
      />

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
  searchInput: { flex: 1, fontSize: 14, color: '#FFFFFF' },
  chipsScroll: { flexGrow: 0, flexShrink: 0, marginBottom: 12 },
  chipsContent: { paddingRight: 14 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipActive: {
    backgroundColor: 'rgba(27,138,143,0.25)',
    borderColor: Colors.teal.tagBorderAlpha,
  },
  chipText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  chipTextActive: { color: Colors.teal.light },
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
  togglePill: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: 17 },
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
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
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
  emptyText: { fontSize: 15, fontWeight: '600', color: Colors.text.body, textAlign: 'center' },
  emptySubtext: { fontSize: 13, color: Colors.text.hint, textAlign: 'center' },
  clearBtn: {
    marginTop: 8,
    height: 34,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { fontSize: 12, fontWeight: '500', color: Colors.text.body },
});
