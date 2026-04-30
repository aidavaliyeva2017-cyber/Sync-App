import { create } from 'zustand';
import type { Notification } from '../types/database';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  appendNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  markAllAsSeen: () => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.is_read).length,
    }),

  appendNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: !notification.is_read
        ? state.unreadCount + 1
        : state.unreadCount,
    })),

  markAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  setUnreadCount: (unreadCount) => set({ unreadCount }),

  incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

  // Clears the bell badge without writing to the DB (seen ≠ read)
  markAllAsSeen: () => set({ unreadCount: 0 }),

  reset: () => set({ notifications: [], unreadCount: 0 }),
}));
