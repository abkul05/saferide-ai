import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const LightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#000000',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    accent: '#10B981', // Emerald Safe Green
    error: '#EF4444',  // Crimson Red
    outline: '#E5E7EB',
    secondary: '#3B82F6', // Electric Action Blue
    text: '#1F2937',
  },
};

export const DarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#FFFFFF',
    background: '#0B0C0E', // Deep Obsidian
    surface: '#15181F',    // Dark Slate
    accent: '#34D399',     // Mint Green
    error: '#F87171',      // Neon Red
    outline: '#262930',
    secondary: '#60A5FA',   // Soft Blue
    text: '#F3F4F6',
  },
};
