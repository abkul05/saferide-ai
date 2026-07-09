import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, Card, useTheme, List } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const { user, driverDetails, logout } = useAuth();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scrollContainer}>
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text style={styles.title}>Driver Profile</Text>
          <Text style={styles.subtitle}>Verified SafeRide Partner Credentials</Text>

          <List.Item
            title={user?.fullName || 'Verified Driver'}
            description={user?.email || 'No email registered'}
            left={() => <span style={styles.avatarEmoji as any}>👤</span>}
          />
          <List.Item
            title="Registered Phone"
            description={user?.phoneNumber || 'No phone'}
            left={() => <span style={styles.avatarEmoji as any}>📱</span>}
          />

          <Button mode="outlined" onPress={logout} style={styles.logoutBtn} labelStyle={{ color: theme.colors.error }}>
            Log Out Account
          </Button>
        </Card.Content>
      </Card>

      {driverDetails ? (
        <Card style={[styles.card, { marginTop: 16 }]} mode="outlined">
          <Card.Content>
            <Text style={styles.sectionTitle}>Vehicle Specifications</Text>

            <List.Item
              title="Vehicle model"
              description={`${driverDetails.vehicle.color} ${driverDetails.vehicle.make} ${driverDetails.vehicle.model}`}
              left={() => <span style={styles.specsEmoji as any}>🚗</span>}
            />
            <List.Item
              title="License Plate"
              description={driverDetails.vehicle.plateNumber}
              left={() => <span style={styles.specsEmoji as any}>🔢</span>}
            />

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Ratings & Trust Score</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStars}>⭐️ {driverDetails.rating.toFixed(1)}</Text>
              <Text style={styles.ratingLabel}>Average Passenger Review Rating</Text>
            </View>
          </Card.Content>
        </Card>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingTop: 48,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 16,
  },
  avatarEmoji: {
    fontSize: 28,
    marginRight: 10,
    alignSelf: 'center',
  },
  specsEmoji: {
    fontSize: 24,
    marginRight: 10,
    alignSelf: 'center',
  },
  logoutBtn: {
    marginTop: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    marginTop: 8,
  },
  ratingStars: {
    fontSize: 22,
    fontWeight: '900',
    marginRight: 12,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#8E8E93',
    flex: 1,
  },
});
