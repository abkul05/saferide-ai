import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { useRide } from '../../context/RideContext';

export const EarningsScreen: React.FC = () => {
  const theme = useTheme();
  const { earnings, rideHistory, fetchRideHistory } = useRide();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRideHistory();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRideHistory();
    setRefreshing(false);
  };

  const renderRideItem = ({ item }: { item: any }) => {
    return (
      <Card style={styles.historyCard} mode="outlined">
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.fare}>+${item.fare.toFixed(2)}</Text>
          </View>

          <View style={styles.routeSection}>
            <Text style={styles.routeText}><span style={{ color: '#8E8E93' } as any}>From:</span> {item.pickup}</Text>
            <Text style={styles.routeText}><span style={{ color: '#8E8E93' } as any}>To:</span> {item.dropoff}</Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={styles.headerTitle}>Driver Earnings</Text>
      <Text style={styles.headerSubtitle}>Weekly earnings summary and ride history logs</Text>

      {/* Main stats card */}
      <Card style={styles.statsCard} mode="elevated">
        <Card.Content style={styles.statsContent}>
          <Text style={styles.statsLabel}>Total Balance</Text>
          <Text style={[styles.statsBalance, { color: theme.colors.primary }]}>
            ${earnings.toFixed(2)}
          </Text>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            <View style={styles.statsCol}>
              <Text style={styles.subLabel}>Completed Rides</Text>
              <Text style={styles.subVal}>{rideHistory.length}</Text>
            </View>
            <View style={styles.statsCol}>
              <Text style={styles.subLabel}>Safety Audit</Text>
              <Text style={styles.subVal}>100% Safe</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Text style={styles.sectionTitle}>Ride Earnings History</Text>

      <FlatList
        data={rideHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderRideItem}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No earnings logged yet. Go online to accept rides.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: '#0B0C0E',
  },
  statsContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  statsBalance: {
    fontSize: 36,
    fontWeight: '900',
    marginTop: 6,
  },
  divider: {
    height: 1,
    width: '90%',
    backgroundColor: '#262930',
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  statsCol: {
    alignItems: 'center',
  },
  subLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  subVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 40,
  },
  historyCard: {
    borderRadius: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  fare: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10B981',
  },
  routeSection: {
    marginTop: 8,
  },
  routeText: {
    fontSize: 12,
    color: '#374151',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
