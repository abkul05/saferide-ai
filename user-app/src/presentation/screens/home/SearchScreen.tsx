import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput, Card, useTheme, List, Divider, Button } from 'react-native-paper';
import { useRide } from '../../context/RideContext';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SearchScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { searchPlacesList, estimateRideFares } = useRide();

  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  // Default mock shortcuts for Home, Work, and Favorites
  const savedPlaces = {
    home: { address: '123 Maple St, Brooklyn, NY', lat: 40.6582, lng: -73.9544 },
    work: { address: '456 Broadway, Manhattan, NY', lat: 40.7223, lng: -73.9987 },
    favorites: [
      { name: 'Gym', address: '789 5th Ave, Brooklyn, NY', lat: 40.6621, lng: -73.9875 },
      { name: 'Central Park', address: 'Central Park, New York, NY', lat: 40.7851, lng: -73.9682 }
    ]
  };

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem('@recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      } else {
        // Fallback default mock recents
        setRecentSearches([
          { description: 'Astoria, Queens, NY, USA', lat: 40.7644, lng: -73.9235 },
          { description: 'Grand Central Terminal, New York, NY, USA', lat: 40.7527, lng: -73.9772 }
        ]);
      }
    } catch {
      // Ignored
    }
  };

  const saveRecentSearch = async (place: any) => {
    try {
      const updated = [place, ...recentSearches.filter(p => p.description !== place.description)].slice(0, 5);
      setRecentSearches(updated);
      await AsyncStorage.setItem('@recent_searches', JSON.stringify(updated));
    } catch {
      // Ignored
    }
  };

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length > 2) {
      const results = await searchPlacesList(text);
      setPredictions(results);
    } else {
      setPredictions([]);
    }
  };

  const handleSelectPlace = async (placeDescription: string, lat?: number, lng?: number) => {
    // Save to recents
    const resolvedPlace = {
      description: placeDescription,
      lat: lat || 40.7580, // fallbacks
      lng: lng || -73.9855
    };
    await saveRecentSearch(resolvedPlace);

    // Navigate back to HomeScreen and pass selected dropoff drop params
    navigation.navigate('Home', {
      dropoff: {
        address: placeDescription,
        latitude: resolvedPlace.lat,
        longitude: resolvedPlace.lng
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: '#0B0C0E' }]}>
      {/* Search Header */}
      <Card style={[styles.searchCard, { backgroundColor: '#111827', borderColor: '#1F2937' }]} mode="outlined">
        <Card.Content>
          <View style={styles.inputContainer}>
            <TextInput
              label="Enter Dropoff Destination"
              value={query}
              onChangeText={handleSearch}
              mode="outlined"
              activeOutlineColor={theme.colors.primary}
              left={<TextInput.Icon icon="map-marker-distance" />}
              autoFocus
            />
          </View>
        </Card.Content>
      </Card>

      {query.trim().length > 0 ? (
        /* Autocomplete Suggestions predictions */
        <FlatList
          data={predictions}
          keyExtractor={(item, idx) => item.place_id || idx.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleSelectPlace(item.description, item.lat, item.lng)}>
              <List.Item
                title={item.description}
                left={() => <Text style={styles.itemIcon}>📍</Text>}
                titleStyle={{ color: '#FFF', fontSize: 14 }}
              />
              <Divider style={{ backgroundColor: '#1F2937' }} />
            </TouchableOpacity>
          )}
          style={styles.predictionsList}
        />
      ) : (
        /* Saved places & Recents shortcuts */
        <ScrollView style={styles.scrollBody} keyboardShouldPersistTaps="handled">
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Saved Places</Text>
          
          <TouchableOpacity onPress={() => handleSelectPlace(savedPlaces.home.address, savedPlaces.home.lat, savedPlaces.home.lng)}>
            <List.Item
              title="Home"
              description={savedPlaces.home.address}
              left={() => <Text style={styles.itemIcon}>🏠</Text>}
              titleStyle={{ color: '#FFF', fontWeight: 'bold' }}
              descriptionStyle={{ color: '#8F9092' }}
            />
            <Divider style={{ backgroundColor: '#1F2937' }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleSelectPlace(savedPlaces.work.address, savedPlaces.work.lat, savedPlaces.work.lng)}>
            <List.Item
              title="Work"
              description={savedPlaces.work.address}
              left={() => <Text style={styles.itemIcon}>💼</Text>}
              titleStyle={{ color: '#FFF', fontWeight: 'bold' }}
              descriptionStyle={{ color: '#8F9092' }}
            />
            <Divider style={{ backgroundColor: '#1F2937' }} />
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: theme.colors.primary, marginTop: 24 }]}>Recent Searches</Text>
          <FlatList
            data={recentSearches}
            scrollEnabled={false}
            keyExtractor={(item, idx) => idx.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleSelectPlace(item.description, item.lat, item.lng)}>
                <List.Item
                  title={item.description}
                  left={() => <Text style={styles.itemIcon}>🕒</Text>}
                  titleStyle={{ color: '#E5E7EB', fontSize: 13 }}
                />
                <Divider style={{ backgroundColor: '#1F2937' }} />
              </TouchableOpacity>
            )}
          />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
  },
  searchCard: {
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  inputContainer: {
    marginTop: 4,
  },
  predictionsList: {
    paddingHorizontal: 16,
  },
  scrollBody: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginVertical: 12,
    letterSpacing: 0.5,
  },
  itemIcon: {
    fontSize: 18,
    marginRight: 8,
    alignSelf: 'center',
  },
});
