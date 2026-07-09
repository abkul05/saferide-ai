import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, Card } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type OTPScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OTP'>;

interface Props {
  navigation: OTPScreenNavigationProp;
}

export const OTPScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { verifyOTP, phoneNumber } = useAuth();

  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setError('');
    const code = otpCode.trim();

    if (!code) {
      setError('Verification code is required');
      return;
    }

    if (code.length !== 6 || isNaN(Number(code))) {
      setError('Verification code must be a 6-digit number');
      return;
    }

    setIsVerifying(true);
    try {
      const success = await verifyOTP(code);
      if (success) {
        // Auth context will verify user details and auto-route. 
        // AppNavigator will trigger redirect to VerificationScreen if user is incomplete.
      } else {
        setError('Invalid verification code. Please check and retry.');
      }
    } catch {
      setError('An error occurred during verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Button
          mode="text"
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          labelStyle={{ color: theme.colors.primary }}
        >
          Back
        </Button>

        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text style={styles.formTitle}>Verification Code</Text>
            <Text style={styles.formSubtitle}>
              We sent a 6-digit verification code to <Text style={{ fontWeight: 'bold' }}>{phoneNumber}</Text>.
            </Text>

            <TextInput
              label="OTP Code"
              placeholder="123456"
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
              error={!!error}
            />

            {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}

            <Button
              mode="contained"
              onPress={handleVerify}
              loading={isVerifying}
              disabled={isVerifying}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              labelStyle={styles.buttonLabel}
            >
              Verify OTP
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
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    marginLeft: -12,
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
    lineHeight: 18,
    marginBottom: 20,
  },
  input: {
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 18,
    fontWeight: '600',
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
