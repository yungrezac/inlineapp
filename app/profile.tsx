import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Camera, CreditCard as Edit3, MapPin, X, Plus, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  sports: string[] | null;
  skates: string[] | null;
  experience_years: number | null;
  city: string | null;
  skating_style: string[] | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
}

const AVAILABLE_SPORTS = [
  'Роликовые коньки',
  'Скейтборд',
  'Велосипед',
  'Самокат',
  'Лонгборд',
  'Беговые лыжи',
];

const AVAILABLE_STYLES = [
  'Фрискейт',
  'Слалом',
  'Агрессив',
  'Фитнес',
  'Спидскейтинг',
  'Даунхилл',
  'Фигурное катание',
];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSportsModal, setShowSportsModal] = useState(false);
  const [showStylesModal, setShowStylesModal] = useState(false);
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
      fetchProfile();
    } catch (error) {
      console.error('Error checking user:', error);
      router.replace('/auth');
    }
  }

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }

      let query = supabase
        .from('profiles')
        .select(`
          *,
          followers:follows!follows_following_id_fkey(count),
          following:follows!follows_follower_id_fkey(count),
          posts:posts(count)
        `)
        .eq('id', user.id)
        .single();

      const { data: profileData, error: profileError } = await query;

      if (profileError) throw profileError;

      const profile = {
        ...profileData,
        followers_count: profileData.followers[0]?.count || 0,
        following_count: profileData.following[0]?.count || 0,
        posts_count: profileData.posts[0]?.count || 0,
      };

      setProfile(profile);
      setEditedProfile(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function pickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
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
          skates: editedProfile.skates,
          experience_years: editedProfile.experience_years,
          city: editedProfile.city,
          skating_style: editedProfile.skating_style,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, ...editedProfile });
      setIsEditing(false);
      setShowSportsModal(false);
      setShowStylesModal(false);
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

  function toggleStyle(style: string) {
    const currentStyles = editedProfile.skating_style || [];
    const newStyles = currentStyles.includes(style)
      ? currentStyles.filter(s => s !== style)
      : [...currentStyles, style];
    
    setEditedProfile({ ...editedProfile, skating_style: newStyles });
  }

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
          ),
        }}
      />

      <ScrollView style={styles.container}>
        <View style={styles.header}>
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
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile?.followers_count || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile?.following_count || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>

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

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Город</Text>
          </View>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedProfile.city || ''}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, city: text })}
              placeholder="Укажите ваш город"
              placeholderTextColor="#8E8E93"
            />
          ) : (
            profile?.city && <Text style={styles.sectionText}>{profile.city}</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Стаж катания</Text>
          </View>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedProfile.experience_years?.toString() || ''}
              onChangeText={(text) => {
                const years = parseInt(text) || 0;
                setEditedProfile({ ...editedProfile, experience_years: years });
              }}
              placeholder="Сколько лет вы катаетесь"
              keyboardType="number-pad"
              placeholderTextColor="#8E8E93"
            />
          ) : (
            profile?.experience_years && (
              <Text style={styles.sectionText}>
                {profile.experience_years} {profile.experience_years === 1 ? 'год' : 'лет'}
              </Text>
            )
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ролики</Text>
          </View>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={(editedProfile.skates || []).join(', ')}
              onChangeText={(text) => {
                const skates = text.split(',').map(s => s.trim()).filter(Boolean);
                setEditedProfile({ ...editedProfile, skates });
              }}
              placeholder="Перечислите ваши ролики через запятую"
              placeholderTextColor="#8E8E93"
              multiline
            />
          ) : (
            profile?.skates && profile.skates.length > 0 && (
              <View style={styles.tagsContainer}>
                {profile.skates.map((skate, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{skate}</Text>
                  </View>
                ))}
              </View>
            )
          )}
        </View>

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
          <View style={styles.tagsContainer}>
            {(isEditing ? editedProfile.sports : profile?.sports)?.map((sport, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{sport}</Text>
                {isEditing && (
                  <TouchableOpacity
                    onPress={() => toggleSport(sport)}
                    style={styles.removeTagButton}
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
            <Text style={styles.sectionTitle}>Стиль катания</Text>
            {isEditing && (
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setShowStylesModal(true)}
              >
                <Plus size={20} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.tagsContainer}>
            {(isEditing ? editedProfile.skating_style : profile?.skating_style)?.map((style, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{style}</Text>
                {isEditing && (
                  <TouchableOpacity
                    onPress={() => toggleStyle(style)}
                    style={styles.removeTagButton}
                  >
                    <X size={16} color="#1976d2" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showSportsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSportsModal(false)}
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
                style={styles.modalOption}
                onPress={() => toggleSport(sport)}
              >
                <Text style={styles.modalOptionText}>{sport}</Text>
                {editedProfile.sports?.includes(sport) && (
                  <Check size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showStylesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStylesModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите стили катания</Text>
              <TouchableOpacity 
                onPress={() => setShowStylesModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {AVAILABLE_STYLES.map((style) => (
              <TouchableOpacity
                key={style}
                style={styles.modalOption}
                onPress={() => toggleStyle(style)}
              >
                <Text style={styles.modalOptionText}>{style}</Text>
                {editedProfile.skating_style?.includes(style) && (
                  <Check size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
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
  headerButton: {
    marginRight: 16,
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
  input: {
    fontSize: 16,
    color: '#1c1c1e',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginTop: 8,
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  sectionText: {
    fontSize: 16,
    color: '#1c1c1e',
    marginTop: 8,
  },
  editButton: {
    padding: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '500',
  },
  removeTagButton: {
    marginLeft: 6,
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
    color: '#1c1c1e',
  },
  closeButton: {
    padding: 4,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1c1c1e',
  },
});