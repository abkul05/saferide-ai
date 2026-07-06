import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card, useTheme } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';

export const ProfileSetupScreen: React.FC = () => {
  const theme = useTheme();
  const { completeProfile, updateEmergencyContacts } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  
  // Emergency contact fields
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  const handleSaveProfile = async () => {
    setError('');

    if (fullName.trim().length < 3) {
      setError('Full Name must be at least 3 characters');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (!contactName.trim() || !contactPhone.trim() || !contactRelation.trim()) {
      setError('Emergency contact details are required');
      return;
    }

    if (!validatePhone(contactPhone.trim())) {
      setError('Emergency contact phone must match E.164 (e.g. +15559999)');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Complete basic profile info
      const profileSuccess = await completeProfile(fullName.trim(), email.trim());
      if (!profileSuccess) {
        setError('Failed to update profile details. Try again.');
        setIsLoading(false);
        return;
      }

      // 2. Set emergency contacts
      const contactSuccess = await updateEmergencyContacts([
        {
          name: contactName.trim(),
          phoneNumber: contactPhone.trim(),
          relation: contactRelation.trim(),
        },
      ]);

      if (!contactSuccess) {
        setError('Failed to update emergency contact credentials.');
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
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Set up your profile and safety contacts to get started</Text>
        </View>

        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            
            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
            />

            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
            />

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Emergency Contact (Required)</Text>
            <Text style={styles.helperText}>
              This contact receives immediate SMS alerts with your real-time tracking link if our AI monitors route drift or warning incidents.
            </Text>

            <TextInput
              label="Contact Name"
              placeholder="e.g. John Doe"
              value={contactName}
              onChangeText={setContactName}
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
            />

            <TextInput
              label="Contact Phone"
              placeholder="e.g. +15559999"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
            />

            <TextInput
              label="Relationship"
              placeholder="e.g. Spouse, Parent"
              value={contactRelation}
              onChangeText={setContactRelation}
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
            />

            {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}

            <Button
              mode="contained"
              onPress={handleSaveProfile}
              loading={isLoading}
              disabled={isLoading}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              labelStyle={styles.buttonLabel}
            >
              Register & Complete
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
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
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
