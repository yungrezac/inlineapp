import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, Platform, Share, FlatList } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Camera, CreditCard as Edit3, MapPin, X, Plus, Check, Share2, MessageCircle, Award, ChevronRight } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  sports: string[] | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
}

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  likes: number;
  created_at: string;
}

const AVAILABLE_SPORTS = [
  'Роликовые коньки',
  'Скейтборд',
  'Велосипед',
  'Самокат',
  'Лонгборд',
  'Беговые лыжи',
];

const PROFILE_FIELDS = [
  'full_name',
  'avatar_url',
  'bio',
  'city',
  'experience_years',
  'skates',
  'sports',
  'skating_style'
];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSportsModal, setShowSportsModal] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [showMessagePreview, setShowMessagePreview] = useState(false);

  const completionPercentage = useMemo(() => {
    if (!profile) return 0;
    const completedFields = PROFILE_FIELDS.filter(field => {
      const value = profile[field];
      return value && (Array.isArray(value) ? value.length > 0 : true);
    });
    return Math.round((completedFields.length / PROFILE_FIELDS.length) * 100);
  }, [profile]);

  const isVerified = useMemo(() => {
    if (!profile) return false;
    return completionPercentage >= 80;
  }, [completionPercentage]);

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // First, get the basic profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Then get the followers count
      const { count: followersCount, error: followersError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

      if (followersError) throw followersError;

      // Get the following count
      const { count: followingCount, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

      if (followingError) throw followingError;

      // Get the posts count
      const { count: postsCount, error: postsError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (postsError) throw postsError;

      const profile = {
        ...profileData,
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        posts_count: postsCount || 0,
      };

      setProfile(profile);
      setEditedProfile(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserPosts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, content, image_url, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Get likes count for each post
      const postsWithLikes = await Promise.all(
        posts.map(async (post) => {
          const { count } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          return {
            ...post,
            likes: count || 0,
          };
        })
      );

      setUserPosts(postsWithLikes);
    } catch (error) {
      console.error('Error fetching user posts:', error);
      setError('Failed to load posts');
    }
  }

  async function fetchFollowers() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower:profiles!follows_follower_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('following_id', user.id);

      if (error) throw error;

      setFollowers(data.map(d => d.follower));
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  }

  async function fetchFollowing() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('follows')
        .select(`
          following:profiles!follows_following_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('follower_id', user.id);

      if (error) throw error;

      setFollowing(data.map(d => d.following));
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  }

  async function pickImage() {
    try {
      const result = await ImagePicker.launchImagePickerAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        
        const fileName = `avatar-${Date.now()}.jpg`;
        
        let file;
        if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const blob = await response.blob();
          file = new File([blob], fileName, { type: 'image/jpeg' });
        } else {
          file = {
            uri,
            name: fileName,
            type: 'image/jpeg',
          };
        }

        const { data, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        setEditedProfile({ ...editedProfile, avatar_url: publicUrl });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Ошибка при загрузке изображения');
    }
  }

  async function saveProfile() {
    if (!profile?.id) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editedProfile.full_name,
          bio: editedProfile.bio,
          avatar_url: editedProfile.avatar_url,
          sports: editedProfile.sports,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, ...editedProfile });
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Ошибка при сохранении профиля');
    } finally {
      setSaving(false);
    }
  }

  function toggleSport(sport: string) {
    const currentSports = editedProfile.sports || [];
    const newSports = currentSports.includes(sport)
      ? currentSports.filter(s => s !== sport)
      : [...currentSports, sport];
    
    setEditedProfile({ ...editedProfile, sports: newSports });
  }

  const handleShare = async () => {
    try {
      await Share.share({
        title: profile?.full_name || 'Профиль роллера',
        message: `Посмотрите профиль ${profile?.full_name || 'роллера'} на RollerMate!`,
        url: `https://rollermate.app/profile/${profile?.id}`,
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity style={styles.postCard}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.postImage} />
      ) : (
        <View style={styles.postContent}>
          <Text numberOfLines={4} style={styles.postText}>{item.content}</Text>
        </View>
      )}
      <View style={styles.postStats}>
        <Text style={styles.postLikes}>{item.likes} likes</Text>
      </View>
    </TouchableOpacity>
  );

  const renderUser = ({ item }: { item: Profile }) => (
    <View style={styles.userListItem}>
      <Image
        source={{ uri: item.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200' }}
        style={styles.userListAvatar}
      />
      <Text style={styles.userListName}>{item.full_name || 'Anonymous'}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Профиль',
          headerRight: () => (
            <View style={styles.headerButtons}>
              {!isEditing && (
                <TouchableOpacity
                  onPress={handleShare}
                  style={styles.headerButton}
                >
                  <Share2 size={24} color="#007AFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  if (isEditing) {
                    saveProfile();
                  } else {
                    setIsEditing(true);
                  }
                }}
                disabled={saving}
                style={styles.headerButton}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <>
                    {isEditing ? (
                      <Check size={24} color="#007AFF" />
                    ) : (
                      <Edit3 size={24} color="#007AFF" />
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView style={styles.container}>
        <Animated.View 
          entering={FadeIn}
          style={styles.header}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={{ 
                uri: (isEditing ? editedProfile.avatar_url : profile?.avatar_url) || 
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'
              }}
              style={styles.avatar}
            />
            {isEditing && (
              <TouchableOpacity style={styles.editAvatarButton} onPress={pickImage}>
                <Camera size={20} color="white" />
              </TouchableOpacity>
            )}
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Award size={16} color="#007AFF" />
              </View>
            )}
          </View>

          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={editedProfile.full_name || ''}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, full_name: text })}
              placeholder="Ваше имя"
              placeholderTextColor="#8E8E93"
            />
          ) : (
            <Text style={styles.name}>{profile?.full_name || 'Аноним'}</Text>
          )}

          <View style={styles.stats}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => {
                setShowFollowers(true);
                fetchFollowers();
              }}
            >
              <Text style={styles.statNumber}>{profile?.followers_count || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => {
                setShowFollowing(true);
                fetchFollowing();
              }}
            >
              <Text style={styles.statNumber}>{profile?.following_count || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile?.posts_count || 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>

          {isEditing ? (
            <TextInput
              style={styles.bioInput}
              value={editedProfile.bio || ''}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, bio: text })}
              placeholder="Расскажите о себе"
              placeholderTextColor="#8E8E93"
              multiline
            />
          ) : (
            profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>
          )}

          <View style={styles.completionContainer}>
            <View style={styles.completionBar}>
              <Animated.View 
                style={[
                  styles.completionProgress,
                  { width: `${completionPercentage}%` }
                ]}
              />
            </View>
            <Text style={styles.completionText}>
              Профиль заполнен на {completionPercentage}%
            </Text>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowMessagePreview(true)}
            >
              <MessageCircle size={24} color="#007AFF" />
              <Text style={styles.actionText}>Сообщение</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Share2 size={24} color="#007AFF" />
              <Text style={styles.actionText}>Поделиться</Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Виды спорта</Text>
            {isEditing && (
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setShowSportsModal(true)}
              >
                <Plus size={20} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.sportsContainer}>
            {(isEditing ? editedProfile.sports : profile?.sports)?.map((sport, index) => (
              <View key={index} style={styles.sportTag}>
                <Text style={styles.sportText}>{sport}</Text>
                {isEditing && (
                  <TouchableOpacity
                    onPress={() => toggleSport(sport)}
                    style={styles.removeSportButton}
                  >
                    <X size={16} color="#1976d2" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Posts</Text>
          </View>
          <FlatList
            data={userPosts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.postsGrid}
          />
        </View>

        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => {
            if (isEditing) {
              saveProfile();
            } else {
              setIsEditing(true);
            }
          }}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              {isEditing ? (
                <Check size={20} color="white" />
              ) : (
                <Edit3 size={20} color="white" />
              )}
              <Text style={styles.editProfileButtonText}>
                {isEditing ? 'Сохранить' : 'Редактировать профиль'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Modal
          visible={showSportsModal}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Выберите виды спорта</Text>
                <TouchableOpacity 
                  onPress={() => setShowSportsModal(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {AVAILABLE_SPORTS.map((sport) => (
                <TouchableOpacity
                  key={sport}
                  style={styles.sportOption}
                  onPress={() => toggleSport(sport)}
                >
                  <Text style={styles.sportOptionText}>{sport}</Text>
                  {editedProfile.sports?.includes(sport) && (
                    <Check size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        <Modal
          visible={showFollowers}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Followers</Text>
                <TouchableOpacity 
                  onPress={() => setShowFollowers(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={followers}
                renderItem={renderUser}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.userList}
              />
            </View>
          </View>
        </Modal>

        <Modal
          visible={showFollowing}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Following</Text>
                <TouchableOpacity 
                  onPress={() => setShowFollowing(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={following}
                renderItem={renderUser}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.userList}
              />
            </View>
          </View>
        </Modal>

        <Modal
          visible={showMessagePreview}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowMessagePreview(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Сообщения</Text>
                <TouchableOpacity 
                  onPress={() => setShowMessagePreview(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.messagePreview}>
                <Text style={styles.messageText}>
                  Функция сообщений будет доступна в следующем обновлении!
                </Text>
              </View>
            </View>
          </View>
        </Modal>
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
  header: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 16,
    paddingHorizontal: 20,
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
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  bio: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  bioInput: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    width: '100%',
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    fontSize: 14,
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    padding: 4,
  },
  sportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sportTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sportText: {
    color: '#1976d2',
    fontSize: 14,
  },
  removeSportButton: {
    marginLeft: 6,
  },
  editProfileButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editProfileButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  sportOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sportOptionText: {
    fontSize: 16,
    color: '#1c1c1e',
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
  },
  postContent: {
    padding: 8,
    height: 150,
    justifyContent: 'center',
  },
  postText: {
    fontSize: 14,
    color: '#1c1c1e',
  },
  postStats: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  postLikes: {
    fontSize: 12,
    color: '#8e8e93',
  },
  userList: {
    paddingVertical: 8,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userListAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userListName: {
    fontSize: 16,
    color: '#1c1c1e',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionContainer: {
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  completionBar: {
    height: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 2,
    overflow: 'hidden',
  },
  completionProgress: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  completionText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    
    shadowRadius: 4,
    elevation: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  actionButton: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  actionText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  messagePreview: {
    padding: 20,
    alignItems: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});