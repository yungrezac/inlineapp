import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Calendar, Users as UsersIcon, MessageCircle } from 'lucide-react-native';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  sports: string[];
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
  is_following: boolean;
}

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  likes: number;
  created_at: string;
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }
      setCurrentUserId(user.id);
      fetchProfile();
      fetchUserPosts();
    } catch (error) {
      console.error('Error checking user:', error);
      router.replace('/auth');
    }
  }

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First, fetch basic profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          bio,
          sports,
          created_at,
          posts:posts(count)
        `)
        .eq('id', id)
        .single();

      if (profileError) throw profileError;

      // Fetch follower count
      const { data: followersData, error: followersError } = await supabase
        .from('follows')
        .select('count')
        .eq('following_id', id);

      if (followersError) throw followersError;

      // Fetch following count
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select('count')
        .eq('follower_id', id);

      if (followingError) throw followingError;

      // Check if current user is following this profile
      const { data: isFollowingData, error: isFollowingError } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', id);

      if (isFollowingError) throw isFollowingError;

      const profile = {
        ...profileData,
        followers_count: followersData[0]?.count || 0,
        following_count: followingData[0]?.count || 0,
        posts_count: profileData.posts[0]?.count || 0,
        is_following: isFollowingData.length > 0,
      };

      setProfile(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserPosts() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          created_at,
          likes(count)
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const postsWithCounts = data.map(post => ({
        ...post,
        likes: post.likes[0]?.count || 0,
      }));

      setPosts(postsWithCounts);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    }
  }

  async function handleFollow() {
    if (!profile) return;

    setFollowLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (profile.is_following) {
        await supabase
          .from('follows')
          .delete()
          .match({ follower_id: user.id, following_id: profile.id });
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: profile.id });
      }

      setProfile({
        ...profile,
        followers_count: profile.is_following ? profile.followers_count - 1 : profile.followers_count + 1,
        is_following: !profile.is_following,
      });
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleMessage() {
    try {
      if (!profile || !currentUserId) return;

      // Check if chat already exists
      const { data: existingChats } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', currentUserId);

      if (!existingChats) return;

      const chatIds = existingChats.map(chat => chat.chat_id);

      const { data: existingChat } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', profile.id)
        .in('chat_id', chatIds)
        .single();

      if (existingChat) {
        // Chat exists, navigate to it
        router.push(`/chat/${existingChat.chat_id}`);
      } else {
        // Create new chat
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert({})
          .select()
          .single();

        if (chatError) throw chatError;

        // Add participants
        await supabase
          .from('chat_participants')
          .insert([
            { chat_id: newChat.id, user_id: currentUserId },
            { chat_id: newChat.id, user_id: profile.id }
          ]);

        router.push(`/chat/${newChat.id}`);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  }

  const getTimeSince = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diff = now.getTime() - past.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дн. назад`;
    if (days < 30) return `${Math.floor(days / 7)} нед. назад`;
    if (days < 365) return `${Math.floor(days / 30)} мес. назад`;
    return `${Math.floor(days / 365)} г. назад`;
  };

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity 
      style={styles.postCard}
      onPress={() => router.push(`/post/${item.id}`)}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.postImage} />
      ) : (
        <View style={styles.postContent}>
          <Text numberOfLines={4} style={styles.postText}>{item.content}</Text>
        </View>
      )}
      <View style={styles.postStats}>
        <Text style={styles.postLikes}>{item.likes} likes</Text>
        <Text style={styles.postTime}>{getTimeSince(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Профиль не найден</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: profile?.full_name || 'Профиль',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
            >
              <ArrowLeft size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Image
            source={{ 
              uri: profile.avatar_url || DEFAULT_AVATAR
            }}
            style={styles.avatar}
          />

          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.followers_count}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.following_count}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.posts_count}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.followButton,
                profile.is_following && styles.followingButton
              ]}
              onPress={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.followButtonText}>
                  {profile.is_following ? 'Отписаться' : 'Подписаться'}
                </Text>
              )}
            </TouchableOpacity>

            {currentUserId !== profile.id && (
              <TouchableOpacity
                style={styles.messageButton}
                onPress={handleMessage}
              >
                <MessageCircle size={20} color="white" />
                <Text style={styles.messageButtonText}>Сообщение</Text>
              </TouchableOpacity>
            )}
          </View>

          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Calendar size={16} color="#8E8E93" />
              <Text style={styles.infoText}>
                На RollerMate с {new Date(profile.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {profile.sports && profile.sports.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Виды спорта</Text>
            <View style={styles.sportsContainer}>
              {profile.sports.map((sport, index) => (
                <View key={index} style={styles.sportTag}>
                  <Text style={styles.sportText}>{sport}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Посты</Text>
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.postsGrid}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Нет постов</Text>
            }
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c1c1e',
  },
  statLabel: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  followButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginRight: 8,
  },
  followingButton: {
    backgroundColor: '#8E8E93',
  },
  followButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bio: {
    fontSize: 16,
    color: '#1c1c1e',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  infoContainer: {
    width: '100%',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8E8E93',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1c1c1e',
  },
  sportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sportTag: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  sportText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  postsGrid: {
    marginTop: 8,
  },
  postCard: {
    flex: 1,
    margin: 4,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  postImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#F2F2F7',
  },
  postContent: {
    padding: 8,
    height: 150,
    justifyContent: 'center',
  },
  postText: {
    fontSize: 14,
    color: '#1c1c1e',
    lineHeight: 20,
  },
  postStats: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postLikes: {
    fontSize: 12,
    color: '#8e8e93',
  },
  postTime: {
    fontSize: 12,
    color: '#8e8e93',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
  },
});