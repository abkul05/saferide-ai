import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Card, useTheme } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';

export const VerificationScreen: React.FC = () => {
  const theme = useTheme();
  const { registerVehicle } = useAuth();

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');

  // Simulated upload statuses to wow the user (premium UI elements)
  const [licenseUploaded, setLicenseUploaded] = useState(false);
  const [registrationUploaded, setRegistrationUploaded] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setError('');

    if (!make.trim() || !model.trim() || !color.trim() || !plateNumber.trim()) {
      setError('All vehicle details are required');
      return;
    }

    if (!licenseUploaded || !registrationUploaded) {
      setError('Please upload your license and vehicle registration documents');
      return;
    }

    setIsLoading(true);
    try {
      const success = await registerVehicle({
        make: make.trim(),
        model: model.trim(),
        color: color.trim(),
        plateNumber: plateNumber.trim().toUpperCase()
      });

      if (success) {
        Alert.alert('Success', 'Vehicle verified and driver profile complete!');
      } else {
        setError('Failed to update driver details. Try again.');
      }
    } catch {
      setError('An unexpected connection error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Driver Verification</Text>
          <Text style={styles.headerSubtitle}>Submit vehicle specs and verify documents to start receiving rides</Text>
        </View>

        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text style={styles.sectionTitle}>Vehicle Specifications</Text>
            
            <TextInput
              label="Make (e.g. Tesla)"
              value={make}
              onChangeText={setMake}
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
            />

            <TextInput
              label="Model (e.g. Model 3)"
              value={model}
              onChangeText={setModel}
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
            />

            <TextInput
              label="Color (e.g. Silver)"
              value={color}
              onChangeText={setColor}
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
            />

            <TextInput
              label="License Plate Number"
              placeholder="e.g. SAFE-RIDE-1"
              value={plateNumber}
              onChangeText={setPlateNumber}
              autoCapitalize="characters"
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
            />

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Document Submissions</Text>
            <Text style={styles.helperText}>Upload photos of verification files (JPG, PNG, PDF up to 5MB)</Text>

            <View style={styles.uploadRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadLabel}>Driver's License Photo</Text>
                <Text style={styles.uploadStatus}>
                  {licenseUploaded ? '✅ Uploaded (Verifying)' : '❌ Not Uploaded'}
                </Text>
              </View>
              <Button
                mode="outlined"
                onPress={() => setLicenseUploaded(true)}
                style={styles.uploadBtn}
                labelStyle={{ fontSize: 12 }}
              >
                {licenseUploaded ? 'Change' : 'Upload'}
              </Button>
            </View>

            <View style={[styles.uploadRow, { marginTop: 10 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadLabel}>Vehicle Registration Papers</Text>
                <Text style={styles.uploadStatus}>
                  {registrationUploaded ? '✅ Uploaded (Verifying)' : '❌ Not Uploaded'}
                </Text>
              </View>
              <Button
                mode="outlined"
                onPress={() => setRegistrationUploaded(true)}
                style={styles.uploadBtn}
                labelStyle={{ fontSize: 12 }}
              >
                {registrationUploaded ? 'Change' : 'Upload'}
              </Button>
            </View>

            {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={isLoading}
              disabled={isLoading}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              labelStyle={styles.buttonLabel}
            >
              Submit Credentials
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 28,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  uploadLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  uploadStatus: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  uploadBtn: {
    borderRadius: 6,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 14,
    marginBottom: 16,
    marginLeft: 4,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
