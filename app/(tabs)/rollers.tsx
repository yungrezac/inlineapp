import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, Calendar, Users as UsersIcon, Search, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  sports: string[];
  location?: {
    latitude: number;
    longitude: number;
    last_updated: string;
  };
  followers_count: number;
  posts_count: number;
  created_at: string;
  is_online: boolean;
}

export default function RollersScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProfiles(profiles);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = profiles.filter(profile => {
      const fullName = (profile.full_name || '').toLowerCase();
      const bio = (profile.bio || '').toLowerCase();
      const sports = profile.sports?.map(s => s.toLowerCase()) || [];
      
      return fullName.includes(query) || 
             bio.includes(query) || 
             sports.some(sport => sport.includes(query));
    });
    
    setFilteredProfiles(filtered);
  }, [searchQuery, profiles]);

  async function fetchProfiles() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          location:athlete_locations(latitude, longitude, last_updated),
          followers:follows!follows_follower_id_fkey(count),
          posts:posts(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60000).toISOString();

      const profilesWithCounts = data.map(profile => ({
        ...profile,
        location: profile.location?.[0],
        followers_count: profile.followers[0]?.count || 0,
        posts_count: profile.posts[0]?.count || 0,
        is_online: profile.location?.[0]?.last_updated > thirtyMinutesAgo,
      }));

      setProfiles(profilesWithCounts);
      setFilteredProfiles(profilesWithCounts);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfiles();
    setRefreshing(false);
  };

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

  const renderProfile = ({ item, index }: { item: Profile; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100)}
      style={styles.profileCard}
    >
      <TouchableOpacity 
        style={styles.profileContent}
        onPress={() => router.push(`/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ 
                uri: item.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'
              }}
              style={styles.avatar}
            />
            {item.is_online && <View style={styles.onlineIndicator} />}
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.name} numberOfLines={1}>
                {item.full_name || 'Роллер инкогнито'}
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <UsersIcon size={14} color="#8E8E93" />
                  <Text style={styles.statText}>{item.followers_count}</Text>
                </View>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.timeText}>{getTimeSince(item.created_at)}</Text>
              </View>
            </View>
            {item.sports && item.sports.length > 0 && (
              <View style={styles.sportsContainer}>
                {item.sports.slice(0, 2).map((sport, index) => (
                  <View key={index} style={styles.sportTag}>
                    <Text style={styles.sportText}>{sport}</Text>
                  </View>
                ))}
                {item.sports.length > 2 && (
                  <Text style={styles.moreSports}>+{item.sports.length - 2}</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск роллеров"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <X size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredProfiles}
        renderItem={renderProfile}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Ничего не найдено' : 'Пока нет роллеров'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery 
                ? 'Попробуйте изменить параметры поиска'
                : 'Будьте первым, кто присоединится к сообществу!'}
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
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#1C1C1E',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileContent: {
    padding: 12,
  },
  profileHeader: {
    flexDirection: 'row',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f2f2f7',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#8E8E93',
  },
  dot: {
    marginHorizontal: 6,
    color: '#8E8E93',
    fontSize: 13,
  },
  timeText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  sportsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  sportTag: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  sportText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
  },
  moreSports: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 2,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
});