import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, useTheme, List } from 'react-native-paper';
import { useAuth, IEmergencyContact } from '../../context/AuthContext';

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const { user, updateEmergencyContacts, logout } = useAuth();

  const [contacts, setContacts] = useState<IEmergencyContact[]>(user?.emergencyContacts || []);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const validatePhone = (phoneStr: string): boolean => {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneStr);
  };

  const handleAddContact = () => {
    setError('');

    if (contacts.length >= 3) {
      setError('Maximum of 3 emergency contacts allowed');
      return;
    }

    if (!name.trim() || !phone.trim() || !relation.trim()) {
      setError('Please fill in all contact details');
      return;
    }

    if (!validatePhone(phone.trim())) {
      setError('Phone number must match E.164 (e.g. +15559999)');
      return;
    }

    const newContact: IEmergencyContact = {
      name: name.trim(),
      phoneNumber: phone.trim(),
      relation: relation.trim(),
    };

    setContacts([...contacts, newContact]);
    setName('');
    setPhone('');
    setRelation('');
  };

  const handleRemoveContact = (index: number) => {
    const updated = [...contacts];
    updated.splice(index, 1);
    setContacts(updated);
  };

  const handleSaveContacts = async () => {
    setError('');

    if (contacts.length === 0) {
      setError('At least one emergency contact is required for AI safety services');
      return;
    }

    setIsUpdating(true);
    try {
      const success = await updateEmergencyContacts(contacts);
      if (success) {
        Alert.alert('Success', 'Emergency contacts list updated successfully!');
      } else {
        setError('Failed to save changes onto server.');
      }
    } catch {
      setError('Connection timeout.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scrollContainer}>
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text style={styles.title}>Safety Dashboard</Text>
          <Text style={styles.subtitle}>Manage your emergency contacts and profile parameters</Text>

          <List.Item
            title={user?.fullName || 'Passenger User'}
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

      <Card style={[styles.card, { marginTop: 16 }]} mode="outlined">
        <Card.Content>
          <Text style={styles.sectionTitle}>Emergency Contacts ({contacts.length}/3)</Text>
          <Text style={styles.helperText}>
            These contacts receive immediate SMS location coordinate notifications if route anomalies are triggered.
          </Text>

          {/* Active Contacts List */}
          {contacts.map((c, index) => (
            <Card style={styles.contactItem} key={index} mode="contained">
              <Card.Content style={styles.contactRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>{c.name} ({c.relation})</Text>
                  <Text style={styles.contactPhone}>{c.phoneNumber}</Text>
                </View>
                <Button mode="text" onPress={() => handleRemoveContact(index)} labelStyle={{ color: theme.colors.error }}>
                  Remove
                </Button>
              </Card.Content>
            </Card>
          ))}

          {/* Add form */}
          {contacts.length < 3 ? (
            <View style={styles.form}>
              <Text style={styles.formHeader}>Add New Contact</Text>
              
              <TextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                dense
                style={styles.input}
              />
              <TextInput
                label="Phone Number"
                placeholder="+15559999"
                value={phone}
                onChangeText={setPhone}
                mode="outlined"
                dense
                style={styles.input}
              />
              <TextInput
                label="Relationship (e.g. Mother)"
                value={relation}
                onChangeText={setRelation}
                mode="outlined"
                dense
                style={styles.input}
              />

              <Button mode="outlined" onPress={handleAddContact} style={styles.addBtn}>
                Add to List
              </Button>
            </View>
          ) : null}

          {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}

          <Button
            mode="contained"
            onPress={handleSaveContacts}
            loading={isUpdating}
            disabled={isUpdating}
            style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
          >
            Save Emergency Config
          </Button>
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
  logoutBtn: {
    marginTop: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
    marginBottom: 16,
  },
  contactItem: {
    borderRadius: 8,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
  },
  contactPhone: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  form: {
    marginTop: 16,
    padding: 12,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
  },
  formHeader: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    marginBottom: 6,
  },
  addBtn: {
    marginTop: 6,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 12,
    marginLeft: 4,
  },
  saveBtn: {
    marginTop: 16,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
