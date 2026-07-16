import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  description: string;
  image: string;
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'AI Route Shield',
    description: 'We actively monitor driver coordinates and alert you instantly of any unexpected route deviation.',
    image: '🗺️',
  },
  {
    id: '2',
    title: 'Guardian Sensors',
    description: 'Advanced shake and crash detection monitors speed hazards, sudden brakes, and broadcasts SOS alerts.',
    image: '🚨',
  },
  {
    id: '3',
    title: 'Emergency Dashboard',
    description: 'Register trusted emergency contacts, share live maps, and view driver safety grades in real-time.',
    image: '🛡️',
  },
];

export const OnboardingScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = async () => {
    const nextIndex = currentSlideIndex + 1;
    if (nextIndex < slides.length) {
      flatListRef.current?.scrollToIndex({ index: nextIndex });
      setCurrentSlideIndex(nextIndex);
    } else {
      // Save onboarding status and navigate to login
      try {
        await AsyncStorage.setItem('@onboarding_completed', 'true');
        navigation.replace('Login');
      } catch (err) {
        navigation.replace('Login');
      }
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('@onboarding_completed', 'true');
      navigation.replace('Login');
    } catch {
      navigation.replace('Login');
    }
  };

  const renderSlide = ({ item }: { item: Slide }) => {
    return (
      <View style={styles.slideContainer}>
        <Text style={styles.slideImage}>{item.image}</Text>
        <Text style={[styles.slideTitle, { color: theme.colors.primary }]}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </View>
    );
  };

  const updateCurrentSlideIndex = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentSlideIndex(index);
  };

  // Render Indicator Dots
  const Indicator = () => {
    return (
      <View style={styles.indicatorContainer}>
        {slides.map((_, index) => {
          const opacity = scrollX.interpolate({
            inputRange: [(index - 1) * width, index * width, (index + 1) * width],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          
          const scale = scrollX.interpolate({
            inputRange: [(index - 1) * width, index * width, (index + 1) * width],
            outputRange: [1, 1.2, 1],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.indicatorDot,
                {
                  opacity,
                  transform: [{ scale }],
                  backgroundColor: theme.colors.primary,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: '#0B0C0E' }]}>
      {/* Skip Button */}
      {currentSlideIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slide Carousels */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        onMomentumScrollEnd={updateCurrentSlideIndex}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={32}
        keyExtractor={(item) => item.id}
      />

      {/* Dots and Navigation Buttons */}
      <View style={styles.footer}>
        <Indicator />
        <Button
          mode="contained"
          onPress={handleNext}
          style={[styles.nextBtn, { backgroundColor: theme.colors.primary }]}
          labelStyle={styles.nextBtnLabel}
        >
          {currentSlideIndex === slides.length - 1 ? 'GET STARTED' : 'NEXT'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipBtn: {
    position: 'absolute',
    top: 48,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    color: '#8F9092',
    fontSize: 15,
    fontWeight: '600',
  },
  slideContainer: {
    width: width,
    height: height * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  slideImage: {
    fontSize: 100,
    marginBottom: 40,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDescription: {
    fontSize: 15,
    color: '#8F9092',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    height: height * 0.25,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 48,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    height: 20,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  nextBtn: {
    width: width - 64,
    height: 48,
    justifyContent: 'center',
    borderRadius: 8,
  },
  nextBtnLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
