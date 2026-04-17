import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { fetchUnreadCount } from '../../lib/queries';

type FeatherIconName = keyof typeof Feather.glyphMap;

interface TabIconProps {
  name: FeatherIconName;
  color: string;
  focused: boolean;
}

function TabIcon({ name, color }: TabIconProps) {
  return <Feather name={name} size={18} color={color} />;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { totalUnread, setTotalUnread } = useChatStore();
  const tabBarHeight = 54 + insets.bottom;

  useEffect(() => {
    if (!user?.id) return;

    const refreshUnread = async () => {
      const count = await fetchUnreadCount(user.id);
      setTotalUnread(count);
    };

    refreshUnread();

    const channel = supabase
      .channel(`tab_unread:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refreshUnread)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_read_status' }, refreshUnread)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'message_read_status' }, refreshUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.nav.background,
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(255,255,255,0.08)',
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: Colors.nav.active,
        tabBarInactiveTintColor: Colors.nav.inactive,
        tabBarLabelStyle: {
          fontSize: Typography.size.navLabel,
          fontWeight: Typography.weight.navLabel,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="search" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="message-square" color={color} focused={focused} />
          ),
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors.teal.main,
            fontSize: 10,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="user" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
