import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from './ui/Avatar';
import { Colors } from '../constants/colors';
import { acceptConnectionRequest, declineConnectionRequest } from '../lib/connections';

export interface RequestCardData {
  id: string;         // connection_request id
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  senderMajor: string;
  introNote: string | null;
}

interface RequestCardProps {
  request: RequestCardData;
  onAccepted: (requestId: string, senderName: string) => void;
  onDeclined: (requestId: string) => void;
}

export function RequestCard({ request, onAccepted, onDeclined }: RequestCardProps) {
  const router = useRouter();

  const handleAccept = async () => {
    await acceptConnectionRequest(request.id);
    onAccepted(request.id, request.senderName);
  };

  const handleDecline = () => {
    Alert.alert(
      `Decline request from ${request.senderName}?`,
      '',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            await declineConnectionRequest(request.id);
            onDeclined(request.id);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => router.push(`/profile/${request.senderId}`)}
        activeOpacity={0.7}
      >
        <Avatar
          size={44}
          imageUrl={request.senderAvatarUrl}
          name={request.senderName}
          variant="teal"
        />
        <View style={styles.nameCol}>
          <Text style={styles.name}>{request.senderName}</Text>
          <Text style={styles.major} numberOfLines={1}>{request.senderMajor}</Text>
        </View>
      </TouchableOpacity>

      {request.introNote ? (
        <Text style={styles.note} numberOfLines={2}>"{request.introNote}"</Text>
      ) : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.8}>
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} activeOpacity={0.8}>
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
      </View>
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
    gap: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameCol: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  major: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  note: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionsRow: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    flex: 1,
    height: 36,
    backgroundColor: Colors.teal.main,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { fontSize: 12, fontWeight: '500', color: '#FFFFFF' },
  declineBtn: {
    flex: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
});
