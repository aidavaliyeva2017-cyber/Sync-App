import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getConnectionCount, getPendingRequestCount } from '../../lib/connections';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { ScreenBackground } from '../../components/ScreenBackground';
import { Avatar } from '../../components/ui/Avatar';
import { GlassCard } from '../../components/ui/GlassCard';
import { Tag } from '../../components/ui/Tag';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profile, setProfile } = useProfileStore();
  const [loading, setLoading] = useState(!profile);
  const [connCount, setConnCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const profilePromise = profile
      ? Promise.resolve()
      : supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(({ data }) => { if (data) setProfile(data); });

    Promise.all([
      profilePromise,
      getConnectionCount(user.id).then(setConnCount),
      getPendingRequestCount(user.id).then(setPendingCount),
    ]).then(() => setLoading(false));
  }, [user?.id]);

  const tabBarHeight = 54 + insets.bottom;

  if (loading) {
    return (
      <ScreenBackground>
        <View style={[styles.loadingContainer, { paddingTop: insets.top + 20 }]}>
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
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.gearBtn}
            onPress={() => router.push('/settings')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="settings" size={17} color={Colors.text.icon} />
          </TouchableOpacity>
        </View>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <Avatar
            size={80}
            imageUrl={profile?.avatar_url}
            name={profile?.full_name ?? ''}
            variant="teal"
            style={{ marginBottom: 14 }}
          />
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{profile?.full_name}</Text>
            {profile?.is_verified && (
              <View style={styles.verifiedPill}>
                <Feather name="check-circle" size={11} color={Colors.teal.bright} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.username}>@{profile?.username}</Text>
          {(profile?.city || profile?.country) && (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={11} color="rgba(255,255,255,0.45)" />
              <Text style={styles.location}>
                {[profile?.city, profile?.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Connections', value: String(connCount) },
            { label: 'Pending', value: String(pendingCount) },
            { label: 'Matches', value: String(connCount + pendingCount) },
          ].map((stat, i, arr) => (
            <React.Fragment key={stat.label}>
              <View style={styles.statCell}>
                <Text style={styles.statNum}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Interests */}
        {profile?.interests?.length > 0 && (
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>INTERESTS</Text>
            <View style={styles.tagsRow}>
              {profile.interests.map((tag) => (
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
            { label: 'Major', value: profile?.major },
            { label: 'University', value: profile?.university },
            { label: 'Age', value: profile?.age?.toString() },
            { label: 'LinkedIn', value: profile?.linkedin_url, isLink: true },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[
                styles.detailRow,
                i < arr.length - 1 && styles.detailRowBorder,
              ]}
            >
              <Text style={styles.detailLabel}>{row.label}</Text>
              {row.value ? (
                row.isLink ? (
                  <TouchableOpacity onPress={() => Linking.openURL(row.value!)}>
                    <Text style={styles.detailLink} numberOfLines={1}>
                      {row.value}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {row.value}
                  </Text>
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
          {profile?.projects ? (
            <View style={styles.projectsInner}>
              <Text style={styles.projectText}>{profile.projects}</Text>
            </View>
          ) : (
            <Text style={styles.emptyHint}>No projects added yet</Text>
          )}
        </GlassCard>

        {/* Edit profile button */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push('/edit-profile')}
          activeOpacity={0.7}
        >
          <Text style={styles.editBtnText}>Edit profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 14 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: Typography.size.screenTitle,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  gearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    overflow: 'hidden',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
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
  detailRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  detailLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  detailValue: { fontSize: 12, fontWeight: '500', color: Colors.text.primary, maxWidth: '60%' },
  detailLink: { fontSize: 12, fontWeight: '500', color: Colors.teal.light, maxWidth: '60%' },
  detailEmpty: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  projectsInner: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
  },
  projectText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
  emptyHint: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  editBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  editBtnText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.65)' },
});
