import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Avatar } from './ui/Avatar';
import { Colors } from '../constants/colors';
import { sendConnectionRequest } from '../lib/connections';
import { useAuthStore } from '../stores/authStore';

interface ConnectionModalProps {
  visible: boolean;
  recipientId: string;
  recipientName: string;
  recipientAvatarUrl?: string | null;
  onClose: () => void;
  onSent: () => void;
}

export function ConnectionModal({
  visible,
  recipientId,
  recipientName,
  recipientAvatarUrl,
  onClose,
  onSent,
}: ConnectionModalProps) {
  const { user } = useAuthStore();
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const handleSend = async () => {
    if (!user) return;
    setSending(true);
    setSendError('');
    try {
      await sendConnectionRequest(user.id, recipientId, note);
      setNote('');
      onSent();
    } catch (err: any) {
      console.error('[ConnectionModal] sendConnectionRequest failed:', err);
      setSendError('Failed to send request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setNote('');
    setSendError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* Sheet */}
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Recipient */}
          <View style={styles.recipientRow}>
            <Avatar
              size={44}
              imageUrl={recipientAvatarUrl}
              name={recipientName}
              variant="teal"
            />
            <Text style={styles.recipientName}>{recipientName}</Text>
          </View>

          {/* Note input */}
          <TextInput
            style={styles.noteInput}
            placeholder="Write a short intro note... (optional)"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={note}
            onChangeText={(t) => setNote(t.slice(0, 200))}
            multiline
            maxLength={200}
            textAlignVertical="top"
            autoFocus={false}
          />
          <Text style={styles.counter}>{note.length}/200</Text>

          {sendError ? (
            <Text style={styles.errorText}>{sendError}</Text>
          ) : null}

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendBtnText}>Send request</Text>
            )}
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: 'rgba(20,20,30,0.98)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 4,
  },
  recipientRow: {
    alignItems: 'center',
    gap: 10,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  noteInput: {
    height: 96,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  counter: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'right',
    marginTop: -8,
  },
  errorText: {
    fontSize: 13,
    color: '#E24B4A',
    textAlign: 'center',
    marginTop: -4,
  },
  sendBtn: {
    height: 48,
    backgroundColor: Colors.teal.main,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  cancelBtn: { alignItems: 'center', paddingVertical: 4 },
  cancelText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
});
