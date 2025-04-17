import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { MapPin } from 'lucide-react-native';

interface Athlete {
  id: string;
  latitude: number;
  longitude: number;
  user: {
    full_name: string;
    avatar_url: string;
  };
}

const MapPlaceholder = ({ location, athletes }: { location: Location.LocationObject | null, athletes: Athlete[] }) => {
  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <MapPin size={48} color="#007AFF" style={styles.mapIcon} />
        <Text style={styles.mapTitle}>Карта роллеров</Text>
        {location ? (
          <Text style={styles.mapCoords}>
            Ваши координаты:{'\n'}{location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
          </Text>
        ) : (
          <Text style={styles.mapText}>Определяем ваше местоположение...</Text>
        )}
        <Text style={styles.mapStats}>
          Роллеров поблизости: {athletes.length}
        </Text>
      </View>
    </View>
  );
}

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Для работы карты необходим доступ к геолокации');
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(location);

        // Update user location in database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('athlete_locations')
            .upsert({
              user_id: user.id,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              last_updated: new Date().toISOString(),
            });
        }
      } catch (error) {
        setErrorMsg('Не удалось определить местоположение');
        console.error('Location error:', error);
      }
    })();

    const interval = setInterval(fetchNearbyAthletes, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function fetchNearbyAthletes() {
    if (!location) return;

    try {
      const { data, error } = await supabase
        .from('athlete_locations')
        .select(`
          *,
          user:profiles(full_name, avatar_url)
        `)
        .gte('last_updated', new Date(Date.now() - 30 * 60000).toISOString()); // Only show active users (last 30 minutes)

      if (error) throw error;
      setAthletes(data || []);
    } catch (error) {
      console.error('Error fetching athletes:', error);
    }
  }

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      </View>
    );
  }

  return <MapPlaceholder location={location} athletes={athletes} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F2F2F7',
  },
  mapIcon: {
    marginBottom: 20,
  },
  mapTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  mapText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 8,
  },
  mapCoords: {
    fontSize: 16,
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  mapStats: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
});