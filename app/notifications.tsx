// Update the getNotificationContent function to add navigation
const getNotificationContent = (notification: Notification) => {
  const user = notification.user;
  
  switch (notification.type) {
    case 'like':
      return {
        icon: <Heart size={24} color="#FF3B30" fill="#FF3B30" />,
        text: `${user.full_name} liked your post`,
        onPress: () => router.push(`/post/${notification.data.post_id}`),
      };
    case 'comment':
      return {
        icon: <MessageCircle size={24} color="#007AFF" />,
        text: `${user.full_name} commented on your post`,
        onPress: () => router.push(`/post/${notification.data.post_id}`),
      };
    case 'follow':
      return {
        icon: <Users size={24} color="#34C759" />,
        text: `${user.full_name} started following you`,
        onPress: () => router.push(`/${notification.data.follower_id}`),
      };
    default:
      return {
        icon: null,
        text: 'New notification',
        onPress: () => {},
      };
  }
};