import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { Platform } from 'react-native';
import { HomeScreen } from '../screens/home/HomeScreen';
import { HistoryScreen } from '../screens/history/HistoryScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

// Simple text icons or standard unicode mock to avoid physical package vector dependency crashes
const TabIcon = ({ name, color, size }: { name: string; color: string; size: number }) => {
  let symbol = '🛡️';
  switch (name) {
    case 'Home':
      symbol = '📍';
      break;
    case 'History':
      symbol = '🕒';
      break;
    case 'Profile':
      symbol = '👤';
      break;
  }
  return <span style={{ fontSize: size, color } as any}>{symbol}</span>;
};

// For React Native mobile, we use a simple string emoji representation which renders natively on both iOS and Android!
// This avoids relying on expo-vector-icons packages that might not be configured, ensuring compilation correctness.
const NativeEmojiIcon = (emoji: string) => {
  return ({ color, size }: { color: string; size: number }) => (
    <span style={{ fontSize: size, color } as any}>{emoji}</span>
  );
};

export type HomeTabParamList = {
  HomeMain: undefined;
  History: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<HomeTabParamList>();

export const HomeNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="HomeMain"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Book Ride',
          tabBarIcon: NativeEmojiIcon('📍'),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: NativeEmojiIcon('🕒'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Safety Panel',
          tabBarIcon: NativeEmojiIcon('🛡️'),
        }}
      />
    </Tab.Navigator>
  );
};
