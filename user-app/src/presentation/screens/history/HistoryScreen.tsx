import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Text, Card, useTheme, Chip } from 'react-native-paper';
import { useRide } from '../../context/RideContext';

export const HistoryScreen: React.FC = () => {
  const theme = useTheme();
  const { rideHistory, fetchRideHistory } = useRide();
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
    const isSafe = item.safety === 'SAFE';

    return (
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.date}>{item.date}</Text>
            <Chip
              style={[
                styles.chip,
                { backgroundColor: isSafe ? '#D1FAE5' : '#FEF3C7' },
              ]}
              textStyle={{
                color: isSafe ? '#065F46' : '#92400E',
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {isSafe ? '✓ Safe' : '⚠ Alert Logged'}
            </Chip>
          </View>

          <View style={styles.addressSection}>
            <Text style={styles.address}><span style={{ color: '#8E8E93' } as any}>From:</span> {item.pickup}</Text>
            <Text style={styles.address}><span style={{ color: '#8E8E93' } as any}>To:</span> {item.dropoff}</Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.price}>${item.fare.toFixed(2)}</Text>
            <Text style={styles.status}>Status: {item.status}</Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={styles.headerTitle}>Ride History</Text>
      <Text style={styles.headerSubtitle}>Summaries of your previous routes and AI monitoring audits</Text>

      <FlatList
        data={rideHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderRideItem}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No ride history logged yet.</Text>
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
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  date: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  chip: {
    borderRadius: 6,
    height: 24,
  },
  addressSection: {
    marginBottom: 12,
  },
  address: {
    fontSize: 13,
    color: '#374151',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    marginTop: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  status: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
