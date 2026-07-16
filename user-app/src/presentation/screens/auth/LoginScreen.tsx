import React, { useState, useRef } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, Card } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyMockAPIKeyHereForTestingPurposes",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "saferide-ai-mock.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "saferide-ai-mock",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "saferide-ai-mock.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:123456789012:web:mockappid123456789"
};

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { sendOTP, verifyOTP } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const recaptchaVerifier = useRef<any>(null);

  const validatePhone = (phone: string): boolean => {
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
      const success = await sendOTP(formattedPhone, recaptchaVerifier.current);
      if (success) {
        navigation.navigate('OTP');
      } else {
        setError('Failed to send verification code. Try again.');
      }
    } catch (err: any) {
      console.warn('Firebase login dispatch error:', err.message);
      setError(err.message || 'Firebase Auth failed. Check config or console.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      console.log('Simulating Google Sign-In verification handshake...');
      // Submit mock Google credentials token validation to test-sandbox
      // In a real application, we would call the Expo Google login library first:
      // const googleUser = await Google.logInAsync(config);
      // await auth.signInWithCredential(GoogleAuthProvider.credential(googleUser.idToken));
      
      const res = await verifyOTP('654321');
      if (!res) {
        setError('Google Authentication validation failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Google Auth Connection failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: '#0B0C0E' }]}
    >
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.emojiLogo, { color: theme.colors.primary }]}>🛡️</Text>
          <Text style={styles.brandTitle}>SafeRide AI</Text>
          <Text style={styles.subtitle}>Securing passenger journeys with real-time AI safeguards</Text>
        </View>

        <Card style={[styles.card, { borderColor: '#1F2937' }]} mode="outlined">
          <Card.Content>
            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Sign in to trace your secure journeys</Text>

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
              disabled={isSubmitLoading || isGoogleLoading}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              labelStyle={styles.buttonLabel}
            >
              Send OTP Code
            </Button>

            <View style={styles.orDividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              mode="outlined"
              icon="google"
              onPress={handleGoogleSignIn}
              loading={isGoogleLoading}
              disabled={isSubmitLoading || isGoogleLoading}
              style={styles.googleBtn}
              labelStyle={styles.googleBtnLabel}
            >
              Sign In with Google
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
    color: '#FFF',
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
    backgroundColor: '#111827',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
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
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#374151',
  },
  orText: {
    marginHorizontal: 12,
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: 'bold',
  },
  googleBtn: {
    borderColor: '#374151',
    borderRadius: 8,
    paddingVertical: 4,
  },
  googleBtnLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
