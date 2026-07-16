import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Card, useTheme, SegmentedButtons } from 'react-native-paper';
import { useAuth, IEmergencyContact } from '../../context/AuthContext';

export const ProfileSetupScreen: React.FC = () => {
  const theme = useTheme();
  const { completeProfile, updateEmergencyContacts } = useAuth();

  // Personal details state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [profilePicture, setProfilePicture] = useState('https://via.placeholder.com/150');
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');

  // Emergency contact list state (multiple support)
  const [contacts, setContacts] = useState<IEmergencyContact[]>([]);
  
  // Temporary inputs to add a contact
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
    // E.164 phone formats
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  const handleAddContact = () => {
    setError('');
    
    if (!contactName.trim()) {
      setError('Emergency contact name is required.');
      return;
    }
    if (!contactPhone.trim()) {
      setError('Emergency contact phone is required.');
      return;
    }
    if (!validatePhone(contactPhone.trim())) {
      setError('Contact phone must match E.164 pattern (e.g. +16505553434).');
      return;
    }
    if (contacts.length >= 3) {
      setError('Maximum of 3 emergency contacts is allowed.');
      return;
    }

    const newContact: IEmergencyContact = {
      name: contactName.trim(),
      phoneNumber: contactPhone.trim(),
      relation: contactRelation.trim() || 'Friend',
    };

    setContacts([...contacts, newContact]);
    setContactName('');
    setContactPhone('');
    setContactRelation('');
  };

  const handleRemoveContact = (index: number) => {
    setContacts(contacts.filter((_, idx) => idx !== index));
  };

  const handleSaveProfile = async () => {
    setError('');

    // Personal details validation
    if (fullName.trim().length < 3) {
      setError('Full Name must be at least 3 characters.');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
    if (!dateRegex.test(dob.trim())) {
      setError('Date of birth must match YYYY-MM-DD pattern.');
      return;
    }

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!bloodGroups.includes(bloodGroup.trim().toUpperCase())) {
      setError('Please enter a valid blood group (e.g. O+, A-).');
      return;
    }

    if (!homeAddress.trim()) {
      setError('Home address is required.');
      return;
    }

    if (!workAddress.trim()) {
      setError('Work address is required.');
      return;
    }

    if (contacts.length === 0) {
      setError('At least one emergency contact is required to safeguard your transit.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Submit complete profile details
      const profileSuccess = await completeProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        gender,
        dob: dob.trim(),
        bloodGroup: bloodGroup.trim().toUpperCase(),
        profilePicture,
        homeAddress: homeAddress.trim(),
        workAddress: workAddress.trim(),
      });

      if (!profileSuccess) {
        setError('Failed to update personal profile details. Try again.');
        setIsLoading(false);
        return;
      }

      // 2. Submit emergency contacts list
      const contactSuccess = await updateEmergencyContacts(contacts);
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
      style={[styles.container, { backgroundColor: '#0B0C0E' }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Set up your profile and safety contacts to get started</Text>
        </View>

        <Card style={[styles.card, { borderColor: '#1F2937' }]} mode="outlined">
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Personal Details</Text>
            
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

            <Text style={styles.fieldLabel}>Gender</Text>
            <SegmentedButtons
              value={gender}
              onValueChange={setGender}
              buttons={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' },
              ]}
              style={styles.segmented}
            />

            <TextInput
              label="Date of Birth (YYYY-MM-DD)"
              placeholder="e.g. 1995-10-15"
              value={dob}
              onChangeText={setDob}
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
            />

            <TextInput
              label="Blood Group"
              placeholder="e.g. O+, AB-"
              value={bloodGroup}
              onChangeText={setBloodGroup}
              autoCapitalize="characters"
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
            />

            <TextInput
              label="Home Address"
              placeholder="e.g. 123 Maple St, Brooklyn"
              value={homeAddress}
              onChangeText={setHomeAddress}
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
            />

            <TextInput
              label="Work Address"
              placeholder="e.g. 456 Broadway, Manhattan"
              value={workAddress}
              onChangeText={setWorkAddress}
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
            />

            <View style={styles.divider} />

            {/* Emergency Contacts List Section */}
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Emergency Contacts ({contacts.length}/3)</Text>
            <Text style={styles.helperText}>
              Configured contacts receive immediate SMS notifications and maps links if our safety system flags route deviations.
            </Text>

            {contacts.map((contact, idx) => (
              <View key={idx} style={styles.contactItem}>
                <View>
                  <Text style={styles.contactItemName}>{contact.name} ({contact.relation})</Text>
                  <Text style={styles.contactItemPhone}>{contact.phoneNumber}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveContact(idx)}>
                  <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}

            {contacts.length < 3 && (
              <View style={styles.addContactBox}>
                <TextInput
                  label="Contact Name"
                  value={contactName}
                  onChangeText={setContactName}
                  mode="outlined"
                  dense
                  style={styles.denseInput}
                />
                <TextInput
                  label="Phone (e.g. +16505553434)"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  keyboardType="phone-pad"
                  mode="outlined"
                  dense
                  style={styles.denseInput}
                />
                <TextInput
                  label="Relation (e.g. Parent, Friend)"
                  value={contactRelation}
                  onChangeText={setContactRelation}
                  mode="outlined"
                  dense
                  style={styles.denseInput}
                />
                <Button
                  mode="outlined"
                  onPress={handleAddContact}
                  style={{ marginTop: 8, borderColor: theme.colors.primary }}
                  labelStyle={{ color: theme.colors.primary }}
                >
                  + Add Contact
                </Button>
              </View>
            )}

            {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}

            <Button
              mode="contained"
              onPress={handleSaveProfile}
              loading={isLoading}
              disabled={isLoading}
              style={[styles.button, { backgroundColor: theme.colors.primary, marginTop: 20 }]}
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
    color: '#FFF',
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
    backgroundColor: '#111827',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 6,
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
  denseInput: {
    marginBottom: 8,
  },
  segmented: {
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 20,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    marginBottom: 8,
  },
  contactItemName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  contactItemPhone: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  addContactBox: {
    marginTop: 12,
    padding: 12,
    borderColor: '#374151',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#181E29',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  button: {
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
