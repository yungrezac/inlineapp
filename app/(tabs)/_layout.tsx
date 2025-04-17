import { Tabs } from 'expo-router';
import { Chrome as Home, Map, Users as Users2, MessageSquare, User } from 'lucide-react-native';
import { TouchableOpacity, Text, Platform, View, Modal, FlatList, Image, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'comment_like' | 'reply';
  data: any;
  read: boolean;
  created_at: string;
  user: {
    full_name: string;
    avatar_url: string;
  };
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';

export default function TabLayout() {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchUnreadCounts();
    
    const notificationsChannel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, () => {
        fetchUnreadNotifications();
        fetchNotifications();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => {
        fetchUnreadMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  async function fetchUnreadCounts() {
    await Promise.all([
      fetchUnreadNotifications(),
      fetchUnreadMessages(),
      fetchNotifications(),
    ]);
  }

  async function fetchUnreadNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setUnreadNotifications(count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setUnreadNotifications(0);
    }
  }

  async function fetchUnreadMessages() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: participatedChats } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (!participatedChats) return;

      const chatIds = participatedChats.map(chat => chat.chat_id);

      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('chat_id', chatIds)
        .is('read_at', null)
        .neq('user_id', user.id);

      setUnreadMessages(count || 0);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
      setUnreadMessages(0);
    }
  }

  async function fetchNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          user:profiles!notifications_user_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }

  async function markNotificationsAsRead() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setUnreadNotifications(0);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diff = now.getTime() - past.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 60) return `${minutes} мин.`;
    if (hours < 24) return `${hours} ч.`;
    if (days < 7) return `${days} дн.`;
    return past.toLocaleDateString();
  };

  const getNotificationContent = (notification: Notification) => {
    const user = notification.user;
    
    switch (notification.type) {
      case 'like':
        return {
          text: `${user.full_name} лайкнул ваш пост`,
          onPress: () => {
            setShowNotifications(false);
            router.push(`/post/${notification.data.post_id}`);
          },
        };
      case 'comment':
        return {
          text: `${user.full_name} прокомментировал ваш пост`,
          onPress: () => {
            setShowNotifications(false);
            router.push(`/post/${notification.data.post_id}`);
          },
        };
      case 'follow':
        return {
          text: `${user.full_name} подписался на вас`,
          onPress: () => {
            setShowNotifications(false);
            router.push(`/${notification.data.follower_id}`);
          },
        };
      default:
        return {
          text: 'Новое уведомление',
          onPress: () => {},
        };
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const { text, onPress } = getNotificationContent(item);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && styles.unreadNotification
        ]}
        onPress={onPress}
      >
        <Image
          source={{ uri: item.user.avatar_url || DEFAULT_AVATAR }}
          style={styles.notificationAvatar}
        />
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>{text}</Text>
          <Text style={styles.notificationTime}>
            {getTimeAgo(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: Platform.OS === 'ios' ? 80 : 60,
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                setShowNotifications(true);
                markNotificationsAsRead();
              }}
              style={styles.notificationButton}
            >
              <View style={styles.notificationIconContainer}>
                {unreadNotifications > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadNotifications}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Лента',
            tabBarIcon: ({ color, size }) => (
              <Animated.View entering={FadeIn} exiting={FadeOut}>
                <Home size={size - 2} color={color} strokeWidth={2} />
              </Animated.View>
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Карта',
            tabBarIcon: ({ color, size }) => (
              <Animated.View entering={FadeIn} exiting={FadeOut}>
                <Map size={size - 2} color={color} strokeWidth={2} />
              </Animated.View>
            ),
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: 'Чаты',
            tabBarIcon: ({ color, size }) => (
              <Animated.View entering={FadeIn} exiting={FadeOut}>
                <View style={{ position: 'relative' }}>
                  <MessageSquare size={size - 2} color={color} strokeWidth={2} />
                  {unreadMessages > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadMessages}
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            ),
          }}
        />
        <Tabs.Screen
          name="rollers"
          options={{
            title: 'Роллеры',
            tabBarIcon: ({ color, size }) => (
              <Animated.View entering={FadeIn} exiting={FadeOut}>
                <Users2 size={size - 2} color={color} strokeWidth={2} />
              </Animated.View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Профиль',
            tabBarIcon: ({ color, size }) => (
              <Animated.View entering={FadeIn} exiting={FadeOut}>
                <User size={size - 2} color={color} strokeWidth={2} />
              </Animated.View>
            ),
          }}
        />
      </Tabs>

      <Modal
        visible={showNotifications}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotifications(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNotifications(false)}
        >
          <View style={styles.notificationsContainer}>
            <View style={styles.notificationsHeader}>
              <Text style={styles.notificationsTitle}>Уведомления</Text>
            </View>
            <FlatList
              data={notifications}
              renderItem={renderNotification}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.notificationsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Нет уведомлений</Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  notificationButton: {
    padding: 12,
  },
  notificationIconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  notificationsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 60,
    right: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '75%',
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  notificationsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  notificationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  notificationsList: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  unreadNotification: {
    backgroundColor: '#F0F9FF',
  },
  notificationAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 15,
    color: '#1C1C1E',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 13,
    color: '#8E8E93',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
});