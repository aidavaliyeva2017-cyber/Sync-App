import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { subscribeToChat, unsubscribe, markChatRead } from '../../lib/realtime';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { fetchUnreadCount } from '../../lib/queries';
import { ScreenBackground } from '../../components/ScreenBackground';
import { Avatar } from '../../components/ui/Avatar';
import { SkeletonMessageBubble } from '../../components/ui/Skeleton';
import { Colors } from '../../constants/colors';
import type { Profile } from '../../types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  connection_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  optimistic?: boolean;
}

const URL_REGEX = /https?:\/\/[^\s]+/g;

function MessageText({ content }: { content: string }) {
  const parts = content.split(URL_REGEX);
  const urls = content.match(URL_REGEX) ?? [];

  if (urls.length === 0) {
    return <Text style={styles.bubbleText}>{content}</Text>;
  }

  const nodes: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part) nodes.push(<Text key={`t${i}`} style={styles.bubbleText}>{part}</Text>);
    if (urls[i]) {
      nodes.push(
        <Text
          key={`u${i}`}
          style={[styles.bubbleText, styles.bubbleLink]}
          onPress={() => Linking.openURL(urls[i])}
        >
          {urls[i]}
        </Text>
      );
    }
  });

  return <Text>{nodes}</Text>;
}

export default function ChatThreadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: connectionId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const { setTotalUnread } = useChatStore();

  useFocusEffect(
    useCallback(() => {
      if (!connectionId || !user?.id) return;
      const markRead = async () => {
        await markChatRead(connectionId, user.id);
        const count = await fetchUnreadCount(user.id);
        setTotalUnread(count);
      };
      markRead();
    }, [connectionId, user?.id])
  );

  const fetchData = useCallback(async () => {
    if (!connectionId || !user?.id) return;

    try {
      const { data: conn } = await supabase
        .from('connections')
        .select('user_a, user_b')
        .eq('id', connectionId)
        .single();

      if (conn) {
        const otherId = conn.user_a === user.id ? conn.user_b : conn.user_a;
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherId)
          .single();
        if (profile) setOtherProfile(profile);
      }

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: true });

      setMessages(msgs ?? []);
      await markChatRead(connectionId, user.id);
    } catch (err) {
      console.error('[chat] fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }, [connectionId, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!connectionId) return;

    channelRef.current = subscribeToChat(connectionId, (newMsg) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === newMsg.id);
        if (exists) return prev;
        const filtered = prev.filter(
          (m) => !(m.optimistic && m.sender_id === newMsg.sender_id && m.content === newMsg.content)
        );
        return [...filtered, newMsg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      if (user?.id) markChatRead(connectionId, user.id);
    });

    return () => { unsubscribe(channelRef.current); };
  }, [connectionId]);

  const handleSend = async () => {
    if (!inputText.trim() || !user?.id || !connectionId) return;
    const text = inputText.trim();
    setInputText('');

    const optimisticId = `opt_${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      connection_id: connectionId,
      sender_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    setSending(true);
    try {
      await supabase.from('messages').insert({
        connection_id: connectionId,
        sender_id: user.id,
        content: text,
      });
    } catch (err) {
      console.error('[chat] send error:', err);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMine = item.sender_id === user?.id;
    const prev = messages[index - 1];
    const sameSenderAsPrev = prev && prev.sender_id === item.sender_id;
    const gap = sameSenderAsPrev ? 4 : 16;

    const time = new Date(item.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={[styles.messageWrap, { marginTop: gap }, isMine ? styles.wrapRight : styles.wrapLeft]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <MessageText content={item.content} />
        </View>
        <Text style={[styles.messageTime, isMine ? styles.timeRight : styles.timeLeft]}>{time}</Text>
      </View>
    );
  };

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={24} color={Colors.text.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.topBarCenter}
            onPress={() => otherProfile && router.push(`/profile/${otherProfile.id}`)}
            activeOpacity={0.7}
          >
            <Avatar
              size={32}
              imageUrl={otherProfile?.avatar_url}
              name={otherProfile?.full_name ?? ''}
              variant="teal"
            />
            <Text style={styles.topBarName} numberOfLines={1}>
              {otherProfile?.full_name ?? ''}
            </Text>
          </TouchableOpacity>

          <View style={{ width: 40 }} />
        </View>

        {/* Messages */}
        {loading ? (
          <ScrollView
            contentContainerStyle={styles.skeletonList}
            showsVerticalScrollIndicator={false}
          >
            <SkeletonMessageBubble mine={false} />
            <SkeletonMessageBubble mine />
            <SkeletonMessageBubble mine={false} />
            <SkeletonMessageBubble mine />
            <SkeletonMessageBubble mine={false} />
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyThread}>
                <Text style={styles.emptyThreadText}>
                  You and {otherProfile?.full_name ?? 'them'} are now connected! Say hello.
                </Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          {inputText.trim().length > 0 && (
            <TouchableOpacity
              style={[styles.sendBtn, sending && { opacity: 0.6 }]}
              onPress={handleSend}
              disabled={sending}
              activeOpacity={0.8}
            >
              <Feather name="arrow-up" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  topBarCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  topBarName: { fontSize: 16, fontWeight: '600', color: Colors.text.primary, flexShrink: 1 },
  skeletonList: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageList: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageWrap: { maxWidth: '75%' },
  wrapRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  wrapLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  bubbleMine: {
    backgroundColor: 'rgba(27,138,143,0.25)',
    borderWidth: 0.5,
    borderColor: 'rgba(27,138,143,0.15)',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 20 },
  bubbleLink: { color: Colors.teal.light, textDecorationLine: 'underline' },
  messageTime: { fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 },
  timeRight: { textAlign: 'right' },
  timeLeft: { textAlign: 'left' },
  emptyThread: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 48 },
  emptyThreadText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.teal.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
