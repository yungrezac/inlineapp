import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart, MessageCircle, Users, CornerDownRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

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

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, []);

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

      // Mark notifications as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const getNotificationContent = (notification: Notification) => {
    const user = notification.user;
    
    switch (notification.type) {
      case 'like':
        return {
          icon: <Heart size={24} color="#FF3B30" fill="#FF3B30" />,
          text: `${user.full_name} лайкнул ваш пост`,
          onPress: () => router.push(`/post/${notification.data.post_id}`),
        };
      case 'comment':
        return {
          icon: <MessageCircle size={24} color="#007AFF" />,
          text: `${user.full_name} прокомментировал ваш пост`,
          onPress: () => router.push(`/post/${notification.data.post_id}`),
        };
      case 'follow':
        return {
          icon: <Users size={24} color="#34C759" />,
          text: `${user.full_name} подписался на вас`,
          onPress: () => router.push(`/${notification.data.follower_id}`),
        };
      case 'comment_like':
        return {
          icon: <Heart size={24} color="#FF3B30" fill="#FF3B30" />,
          text: `${user.full_name} лайкнул ваш комментарий`,
          onPress: () => router.push(`/post/${notification.data.post_id}`),
        };
      case 'reply':
        return {
          icon: <CornerDownRight size={24} color="#007AFF" />,
          text: `${user.full_name} ответил на ваш комментарий`,
          onPress: () => router.push(`/post/${notification.data.post_id}`),
        };
      default:
        return {
          icon: null,
          text: 'Новое уведомление',
          onPress: () => {},
        };
    }
  };

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

  const renderNotification = ({ item }: { item: Notification }) => {
    const { icon, text, onPress } = getNotificationContent(item);

    return (
      <Animated.View
        entering={FadeIn}
        style={[
          styles.notificationItem,
          !item.read && styles.unreadNotification,
        ]}
      >
        <TouchableOpacity
          style={styles.notificationContent}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: item.user.avatar_url }}
            style={styles.avatar}
          />
          <View style={styles.textContainer}>
            <Text style={styles.notificationText}>{text}</Text>
            <Text style={styles.timestamp}>
              {getTimeAgo(item.created_at)}
            </Text>
          </View>
          <View style={styles.iconContainer}>
            {icon}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Нет уведомлений</Text>
            <Text style={styles.emptyStateText}>
              Здесь будут появляться уведомления о лайках, комментариях и новых подписчиках
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  notificationItem: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  unreadNotification: {
    backgroundColor: '#F0F9FF',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  notificationText: {
    fontSize: 15,
    color: '#1c1c1e',
    marginBottom: 4,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 13,
    color: '#8e8e93',
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 20,
  },
});