import React, { useState } from 'react';
import { StyleSheet, View, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, Card } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { sendOTP } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  const validatePhone = (phone: string): boolean => {
    // E.164 verification format (e.g. +12345678901)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  const handleSendOTP = async () => {
    setError('');
    const formattedPhone = phoneNumber.trim();

    if (!formattedPhone) {
      setError('Phone number is required');
      return;
    }

    if (!validatePhone(formattedPhone)) {
      setError('Invalid format. Use country code (e.g., +15550199)');
      return;
    }

    setIsSubmitLoading(true);
    try {
      const success = await sendOTP(formattedPhone);
      if (success) {
        navigation.navigate('OTP');
      } else {
        setError('Failed to send verification code. Try again.');
      }
    } catch {
      setError('An error occurred. Please check network.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.emojiLogo, { color: theme.colors.accent }]}>🛡️</Text>
          <Text style={styles.brandTitle}>SafeRide AI</Text>
          <Text style={styles.subtitle}>Securing passenger journeys with real-time AI safeguards</Text>
        </View>

        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text style={styles.formTitle}>Phone Verification</Text>
            <Text style={styles.formSubtitle}>Enter your phone number to receive a secure OTP code</Text>

            <TextInput
              label="Phone Number"
              placeholder="+15550199"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
              error={!!error}
            />

            {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}

            <Button
              mode="contained"
              onPress={handleSendOTP}
              loading={isSubmitLoading}
              disabled={isSubmitLoading}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              labelStyle={styles.buttonLabel}
            >
              Send OTP Code
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
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emojiLogo: {
    fontSize: 72,
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 20,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
    marginLeft: 4,
  },
  button: {
    marginTop: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
