import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from './ui/Avatar';
import { Colors } from '../constants/colors';
import type { Profile } from '../types/database';

interface ChatListItemProps {
  connectionId: string;
  profile: Profile;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
  showSubtitle?: boolean; // major + university — shown on Chats, hidden on Home
  avatarSize?: number;
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
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ChatListItem({
  connectionId,
  profile,
  lastMessage,
  lastMessageAt,
  unread,
  showSubtitle = true,
  avatarSize = 46,
}: ChatListItemProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/chat/${connectionId}`)}
      activeOpacity={0.7}
    >
      {/* Avatar with offline indicator */}
      <View style={styles.avatarWrap}>
        <Avatar size={avatarSize} imageUrl={profile.avatar_url} name={profile.full_name} variant="teal" />
        {/* Presence dot — always offline for now; Layer 6 adds presence */}
        <View style={styles.presenceDot} />
      </View>

      {/* Text */}
      <View style={styles.textCol}>
        <Text style={styles.name} numberOfLines={1}>{profile.full_name}</Text>
        {showSubtitle && (profile.major || profile.university) && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {[profile.major, profile.university].filter(Boolean).join(' · ')}
          </Text>
        )}
        <Text
          style={[styles.preview, unread && styles.previewUnread]}
          numberOfLines={1}
        >
          {lastMessage ?? 'No messages yet'}
        </Text>
      </View>

      {/* Right column */}
      <View style={styles.rightCol}>
        <Text style={[styles.timestamp, unread && styles.timestampUnread]}>
          {formatTimestamp(lastMessageAt)}
        </Text>
        {unread && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  presenceDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: Colors.background.base,
  },
  textCol: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  subtitle: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },
  preview: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  previewUnread: { color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  rightCol: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  timestamp: { fontSize: 10, color: 'rgba(255,255,255,0.25)' },
  timestampUnread: { color: Colors.teal.main },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.teal.main,
  },
});
