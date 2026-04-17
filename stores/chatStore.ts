import { create } from 'zustand';
import type { ConversationPreview, Message } from '../types/database';

interface ChatState {
  conversations: ConversationPreview[];
  messages: Record<string, Message[]>; // keyed by connection_id
  totalUnread: number;
  setConversations: (conversations: ConversationPreview[]) => void;
  setMessages: (connectionId: string, messages: Message[]) => void;
  appendMessage: (connectionId: string, message: Message) => void;
  setTotalUnread: (count: number) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  messages: {},
  totalUnread: 0,

  setConversations: (conversations) => set({ conversations }),

  setMessages: (connectionId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [connectionId]: messages },
    })),

  appendMessage: (connectionId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [connectionId]: [...(state.messages[connectionId] ?? []), message],
      },
    })),

  setTotalUnread: (totalUnread) => set({ totalUnread }),

  reset: () => set({ conversations: [], messages: {}, totalUnread: 0 }),
}));
