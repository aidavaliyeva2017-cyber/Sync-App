import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Avatar } from './ui/Avatar';
import { Tag } from './ui/Tag';
import { ConnectionModal } from './ConnectionModal';
import { acceptConnectionRequest, declineConnectionRequest } from '../lib/connections';
import { Colors } from '../constants/colors';
import type { Profile } from '../types/database';

export type ConnectionStatus = 'none' | 'connected' | 'pending_sent' | 'pending_received';

interface StudentCardProps {
  profile: Profile;
  connectionStatus?: ConnectionStatus;
  requestId?: string;        // needed for pending_received accept/decline
  connectionId?: string;     // needed for connected → Message navigation
  onStatusChange?: (profileId: string, newStatus: ConnectionStatus) => void;
  onToast?: (msg: string) => void;
}

export function StudentCard({
  profile,
  connectionStatus = 'none',
  requestId,
  connectionId,
  onStatusChange,
  onToast,
}: StudentCardProps) {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const subtitle = [profile.major, profile.university].filter(Boolean).join(' — ');

  return (
    <View style={styles.card}>
      {/* Top row: avatar + name + subtitle */}
      <View style={styles.headerRow}>
        <Avatar
          size={44}
          imageUrl={profile.avatar_url}
          name={profile.full_name}
          variant="teal"
        />
        <View style={styles.nameCol}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.full_name}
            </Text>
            {profile.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
          {/* Connect preference pill */}
          {profile.connect_preference && (
            <View style={styles.prefPill}>
              {(profile.connect_preference === 'in-person' || profile.connect_preference === 'both') && (
                <Feather name="map-pin" size={10} color="rgba(255,255,255,0.4)" />
              )}
              {(profile.connect_preference === 'online' || profile.connect_preference === 'both') && (
                <Feather name="globe" size={10} color="rgba(255,255,255,0.4)" />
              )}
              <Text style={styles.prefText}>
                {profile.connect_preference === 'in-person'
                  ? 'In-person'
                  : profile.connect_preference === 'online'
                  ? 'Online'
                  : 'In-person & Online'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Interest tags */}
      {profile.interests?.length > 0 && (
        <View style={styles.tagsRow}>
          {profile.interests.slice(0, 3).map((tag) => (
            <Tag key={tag} label={tag} />
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        {connectionStatus === 'none' && (
          <>
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.connectBtnText}>Connect</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => router.push(`/profile/${profile.id}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.viewBtnText}>View profile</Text>
            </TouchableOpacity>
          </>
        )}

        {connectionStatus === 'pending_sent' && (
          <>
            <View style={[styles.connectBtn, styles.requestedBtn]}>
              <Text style={styles.requestedText}>Requested</Text>
            </View>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => router.push(`/profile/${profile.id}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.viewBtnText}>View profile</Text>
            </TouchableOpacity>
          </>
        )}

        {connectionStatus === 'pending_received' && (
          <>
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={async () => {
                if (!requestId) return;
                await acceptConnectionRequest(requestId);
                onStatusChange?.(profile.id, 'connected');
                onToast?.(`You and ${profile.full_name} are now connected!`);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.connectBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewBtn, { borderColor: 'rgba(226,75,74,0.4)' }]}
              onPress={async () => {
                if (!requestId) return;
                await declineConnectionRequest(requestId);
                onStatusChange?.(profile.id, 'none');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewBtnText, { color: Colors.error }]}>Decline</Text>
            </TouchableOpacity>
          </>
        )}

        {connectionStatus === 'connected' && (
          <TouchableOpacity
            style={styles.messageBtn}
            onPress={() => connectionId && router.push(`/chat/${connectionId}`)}
            activeOpacity={0.8}
          >
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Connection modal */}
      <ConnectionModal
        visible={modalVisible}
        recipientId={profile.id}
        recipientName={profile.full_name}
        recipientAvatarUrl={profile.avatar_url}
        onClose={() => setModalVisible(false)}
        onSent={() => {
          setModalVisible(false);
          onStatusChange?.(profile.id, 'pending_sent');
          onToast?.(`Connection request sent to ${profile.full_name}!`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glass.default,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: Colors.glass.border,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameCol: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 14, fontWeight: '600', color: Colors.text.primary, flexShrink: 1 },
  verifiedBadge: {
    backgroundColor: Colors.teal.verifiedBg,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  verifiedText: { fontSize: 10, color: Colors.teal.bright, fontWeight: '500' },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  prefPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  prefText: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  connectBtn: {
    flex: 1,
    height: 36,
    backgroundColor: Colors.teal.main,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtnText: { fontSize: 12, fontWeight: '500', color: '#FFFFFF' },
  requestedBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  requestedText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  viewBtn: {
    flex: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  messageBtn: {
    flex: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBtnText: { fontSize: 12, fontWeight: '500', color: Colors.text.body },
});
