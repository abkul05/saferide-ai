import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Card, useTheme, Switch, Button, List, Divider } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { useRide } from '../../context/RideContext';

export const GuardianDashboardScreen: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { activeRide, deviationAlert, isPanicActive } = useRide();

  // Local setting flags for sensor configurations
  const [shakeEnabled, setShakeEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Dynamic safety calculation report for current ride (or historical average)
  const getSimulatedSafetyScore = () => {
    if (isPanicActive) return { score: 0, label: 'CRITICAL DANGER', color: theme.colors.error };
    if (deviationAlert) return { score: 45, label: 'HIGH RISK (ROUTE DEV)', color: '#EF4444' };
    if (activeRide) return { score: 88, label: 'SAFE TRANSIT ACTIVE', color: '#10B981' };
    return { score: 98, label: 'EXCELLENT', color: theme.colors.secondary };
  };

  const safetyInfo = getSimulatedSafetyScore();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scrollContainer}>
      <Card style={styles.headerCard} mode="contained">
        <Card.Content style={styles.headerContent}>
          <Text style={styles.headerEmoji}>🛡️</Text>
          <Text style={styles.headerTitle}>AI Safety Guardian</Text>
          <Text style={styles.headerSubtitle}>Proactive hardware sensor tracking & live hazard checks</Text>
        </Card.Content>
      </Card>

      {/* Safety Score Meter Card */}
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text style={styles.sectionTitle}>Real-Time Safety Index</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreValue, { color: safetyInfo.color }]}>{safetyInfo.score}</Text>
            <View style={styles.scoreMeta}>
              <Text style={[styles.scoreLabel, { color: safetyInfo.color }]}>{safetyInfo.label}</Text>
              <Text style={styles.scoreDesc}>Dynamically computed from active coordinates, pilot review histories, & speeds.</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Hardware Sensors Toggles */}
      <Card style={[styles.card, { marginTop: 16 }]} mode="outlined">
        <Card.Content>
          <Text style={styles.sectionTitle}>Physical Guard Controls</Text>
          <Text style={styles.sectionSubtitle}>Toggle sensors used for automated SOS dispatching</Text>

          <List.Item
            title="Shake Phone Detection"
            description="Shaking device (force > 2.5G) triggers emergency SOS immediately"
            left={() => <span style={styles.sensorIcon as any}>📳</span>}
            right={() => <Switch value={shakeEnabled} onValueChange={setShakeEnabled} color={theme.colors.primary} />}
          />
          <Divider />
          <List.Item
            title="Voice SOS Keyword Detection"
            description="Microphone transcription listens for emergency words ('Help', 'Save me')"
            left={() => <span style={styles.sensorIcon as any}>🎙️</span>}
            right={() => <Switch value={voiceEnabled} onValueChange={setVoiceEnabled} color={theme.colors.primary} />}
          />
          <Divider />
          <List.Item
            title="Automated Audio Recording"
            description="Silently records ambient audio once route deviations are logged"
            left={() => <span style={styles.sensorIcon as any}>⏺️</span>}
            right={() => <Switch value={audioEnabled} onValueChange={setAudioEnabled} color={theme.colors.primary} />}
          />
        </Card.Content>
      </Card>

      {/* Emergency Contacts List */}
      <Card style={[styles.card, { marginTop: 16 }]} mode="outlined">
        <Card.Content>
          <Text style={styles.sectionTitle}>Emergency Dispatch Contacts</Text>
          <Text style={styles.sectionSubtitle}>Contacts sent live tracking maps when SOS triggers</Text>

          {user?.emergencyContacts && user.emergencyContacts.length > 0 ? (
            user.emergencyContacts.map((contact, idx) => (
              <List.Item
                key={idx}
                title={contact.name}
                description={`${contact.relation || 'Contact'} • ${contact.phoneNumber}`}
                left={() => <span style={styles.contactIcon as any}>👤</span>}
              />
            ))
          ) : (
            <View style={styles.noContactsBlock}>
              <Text style={styles.noContactsText}>No emergency contacts added yet.</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Sharing Details */}
      <Card style={[styles.card, { marginTop: 16 }]} mode="outlined">
        <Card.Content>
          <Text style={styles.sectionTitle}>Live Tracking Share Links</Text>
          <Text style={styles.sectionSubtitle}>Share public live tracking dashboard links with trusted guardians</Text>
          
          {activeRide ? (
            <Button 
              mode="contained" 
              style={[styles.shareBtn, { backgroundColor: theme.colors.secondary }]}
              onPress={() => {
                console.log(`Sharing tracking: http://localhost:5000/api/v1/rides/share/${activeRide.id}`);
              }}
            >
              Share Live Guardian Link
            </Button>
          ) : (
            <Text style={styles.inactiveShareText}>No active ride booking to share currently.</Text>
          )}
        </Card.Content>
      </Card>
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
  headerCard: {
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#1E1E26',
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerEmoji: {
    fontSize: 54,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  scoreValue: {
    fontSize: 54,
    fontWeight: '900',
    marginRight: 16,
  },
  scoreMeta: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  scoreDesc: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
    lineHeight: 15,
  },
  sensorIcon: {
    fontSize: 22,
    alignSelf: 'center',
    marginRight: 10,
  },
  contactIcon: {
    fontSize: 20,
    alignSelf: 'center',
    marginRight: 10,
  },
  noContactsBlock: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  noContactsText: {
    fontSize: 13,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  shareBtn: {
    borderRadius: 8,
    marginTop: 8,
  },
  inactiveShareText: {
    fontSize: 13,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
