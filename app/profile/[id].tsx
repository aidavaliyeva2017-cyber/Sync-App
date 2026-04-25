import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { acceptConnectionRequest, declineConnectionRequest } from '../../lib/connections';
import { ConnectionModal } from '../../components/ConnectionModal';
import { Toast } from '../../components/ui/Toast';
import { useAuthStore } from '../../stores/authStore';
import { ScreenBackground } from '../../components/ScreenBackground';
import { Avatar } from '../../components/ui/Avatar';
import { GlassCard } from '../../components/ui/GlassCard';
import { Tag } from '../../components/ui/Tag';
import { Button } from '../../components/ui/Button';
import { SkeletonProfile, Skeleton } from '../../components/ui/Skeleton';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import type { Profile } from '../../types/database';

type ConnStatus = 'none' | 'connected' | 'pending_sent' | 'pending_received';

export default function ProfileViewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [connStatus, setConnStatus] = useState<ConnStatus>('none');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    if (!id || !user?.id) return;
    Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase
        .from('connections')
        .select('id')
        .or(
          `and(user_a.eq.${user.id},user_b.eq.${id}),and(user_a.eq.${id},user_b.eq.${user.id})`
        )
        .limit(1),
      supabase
        .from('connection_requests')
        .select('id, sender_id, status')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`
        )
        .eq('status', 'pending')
        .limit(1),
    ]).then(([profileRes, connRes, reqRes]) => {
      if (profileRes.data) setProfile(profileRes.data);
      if (connRes.data && connRes.data.length > 0) {
        setConnStatus('connected');
        setConnectionId(connRes.data[0].id);
      } else if (reqRes.data && reqRes.data.length > 0) {
        const req = reqRes.data[0];
        setConnStatus(req.sender_id === user.id ? 'pending_sent' : 'pending_received');
        setRequestId(req.id);
      }
      setLoading(false);
    });
  }, [id, user?.id]);

  if (!loading && !profile) {
    return (
      <ScreenBackground>
        <View style={[styles.loadingWrap, { paddingTop: insets.top }]}>
          <Feather name="user-x" size={32} color={Colors.text.hint} />
          <Text style={styles.emptyText}>This profile is no longer available</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: Colors.teal.bright, fontSize: 14 }}>Go back</Text>
          </TouchableOpacity>
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
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={24} color={Colors.text.primary} />
        </TouchableOpacity>

        {loading ? (
          <>
            <SkeletonProfile />
            <View style={{ height: 16 }} />
            <View style={styles.statsRow}>
              {[0, 1, 2].map((i) => (
                <React.Fragment key={i}>
                  <View style={styles.statCell}>
                    <Skeleton width={36} height={18} borderRadius={9} />
                    <View style={{ height: 4 }} />
                    <Skeleton width={60} height={10} borderRadius={5} />
                  </View>
                  {i < 2 && <View style={styles.statDivider} />}
                </React.Fragment>
              ))}
            </View>
            <GlassCard style={styles.card}>
              <Skeleton width={80} height={10} borderRadius={5} />
              <View style={{ height: 8, flexDirection: 'row', gap: 6 }}>
                <Skeleton width={60} height={22} borderRadius={11} />
                <Skeleton width={50} height={22} borderRadius={11} />
              </View>
            </GlassCard>
          </>
        ) : (
          <>
            {/* Avatar + identity */}
            <View style={styles.avatarSection}>
              <Avatar
                size={80}
                imageUrl={profile!.avatar_url}
                name={profile!.full_name}
                variant="teal"
                style={{ marginBottom: 14 }}
              />
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{profile!.full_name}</Text>
                {profile!.is_verified && (
                  <View style={styles.verifiedPill}>
                    <Feather name="check-circle" size={11} color={Colors.teal.bright} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
              <Text style={styles.username}>@{profile!.username}</Text>
              {(profile!.city || profile!.country) && (
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={11} color="rgba(255,255,255,0.45)" />
                  <Text style={styles.location}>
                    {[profile!.city, profile!.country].filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { label: 'Major', value: profile!.major ?? '—' },
                { label: 'University', value: profile!.university ? profile!.university.split(' ').slice(0, 2).join(' ') : '—' },
                { label: 'Age', value: profile!.age?.toString() ?? '—' },
              ].map((stat, i, arr) => (
                <React.Fragment key={stat.label}>
                  <View style={styles.statCell}>
                    <Text style={styles.statNum} numberOfLines={1}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={styles.statDivider} />}
                </React.Fragment>
              ))}
            </View>

            {/* Interests */}
            {profile!.interests?.length > 0 && (
              <GlassCard style={styles.card}>
                <Text style={styles.sectionLabel}>INTERESTS</Text>
                <View style={styles.tagsRow}>
                  {profile!.interests.map((tag) => (
                    <Tag key={tag} label={tag} />
                  ))}
                </View>
              </GlassCard>
            )}

            {/* Details */}
            <GlassCard style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
              <Text style={[styles.sectionLabel, { paddingHorizontal: 14, paddingTop: 14 }]}>
                DETAILS
              </Text>
              {[
                { label: 'Major', value: profile!.major },
                { label: 'University', value: profile!.university },
                { label: 'Age', value: profile!.age?.toString() },
                { label: 'LinkedIn', value: profile!.linkedin_url, isLink: true },
              ].map((row, i, arr) => (
                <View
                  key={row.label}
                  style={[styles.detailRow, i < arr.length - 1 && styles.detailRowBorder]}
                >
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  {row.value ? (
                    row.isLink ? (
                      <TouchableOpacity onPress={() => Linking.openURL(row.value!)}>
                        <Text style={styles.detailLink} numberOfLines={1}>{row.value}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.detailValue} numberOfLines={1}>{row.value}</Text>
                    )
                  ) : (
                    <Text style={styles.detailEmpty}>Not specified</Text>
                  )}
                </View>
              ))}
            </GlassCard>

            {/* Projects */}
            <GlassCard style={styles.card}>
              <Text style={styles.sectionLabel}>CURRENT PROJECTS</Text>
              {profile!.projects ? (
                <View style={styles.projectsInner}>
                  <Text style={styles.projectText}>{profile!.projects}</Text>
                </View>
              ) : (
                <Text style={styles.emptyHint}>No projects shared yet</Text>
              )}
            </GlassCard>
          </>
        )}
      </ScrollView>

      {/* Action bar — only show once loaded */}
      {!loading && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}>
          {connStatus === 'none' && (
            <Button
              label="Connect"
              onPress={() => setModalVisible(true)}
              variant="primary"
              fullWidth
              style={styles.actionBtn}
            />
          )}
          {connStatus === 'connected' && (
            <Button
              label="Message"
              onPress={() => {
                if (connectionId) {
                  router.push(`/chat/${connectionId}`);
                }
              }}
              variant="primary"
              fullWidth
              style={styles.actionBtn}
            />
          )}
          {connStatus === 'pending_sent' && (
            <Button
              label="Request sent"
              onPress={() => {}}
              variant="ghost"
              fullWidth
              disabled
              style={styles.actionBtn}
            />
          )}
          {connStatus === 'pending_received' && (
            <View style={styles.twoButtonRow}>
              <Button
                label="Accept"
                onPress={async () => {
                  if (!requestId) return;
                  await acceptConnectionRequest(requestId);
                  // Fetch the newly-created connection ID
                  const { data: conn } = await supabase
                    .from('connections')
                    .select('id')
                    .or(
                      `and(user_a.eq.${user!.id},user_b.eq.${id}),and(user_a.eq.${id},user_b.eq.${user!.id})`
                    )
                    .limit(1)
                    .single();
                  if (conn) setConnectionId(conn.id);
                  setConnStatus('connected');
                  showToast(`You and ${profile?.full_name} are now connected!`, 'success');
                }}
                variant="primary"
                style={[styles.actionBtn, { flex: 1 }]}
              />
              <Button
                label="Decline"
                onPress={async () => {
                  if (!requestId) return;
                  await declineConnectionRequest(requestId);
                  setConnStatus('none');
                  setRequestId(null);
                }}
                variant="ghost"
                style={[styles.actionBtn, { flex: 1 }]}
              />
            </View>
          )}
        </View>
      )}

      {/* Connection modal */}
      {profile && (
        <ConnectionModal
          visible={modalVisible}
          recipientId={profile.id}
          recipientName={profile.full_name}
          recipientAvatarUrl={profile.avatar_url}
          onClose={() => setModalVisible(false)}
          onSent={() => {
            setModalVisible(false);
            setConnStatus('pending_sent');
            showToast(`Connection request sent to ${profile.full_name}!`, 'success');
          }}
        />
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 14 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: Colors.text.body, textAlign: 'center', marginTop: 8 },
  backBtn: { height: 40, justifyContent: 'center', marginBottom: 16 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  displayName: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.teal.verifiedBg,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  verifiedText: { fontSize: 11, color: Colors.teal.bright, fontWeight: '500' },
  username: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: Colors.glass.border,
    marginBottom: 14,
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  statDivider: { width: 0.5, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 10 },
  card: { marginBottom: 10, gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailRowBorder: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)' },
  detailLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  detailValue: { fontSize: 12, fontWeight: '500', color: Colors.text.primary, maxWidth: '60%' },
  detailLink: { fontSize: 12, fontWeight: '500', color: Colors.teal.light, maxWidth: '60%' },
  detailEmpty: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  projectsInner: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12 },
  projectText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
  emptyHint: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    backgroundColor: Colors.background.base,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  actionBtn: { height: 48 },
  twoButtonRow: { flexDirection: 'row', gap: 10 },
});
