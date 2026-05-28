import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Dimensions,
  Platform
} from 'react-native';
import { MessageCircle, Sparkles } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface FloatingAdvisorProps {
  onPress: () => void;
}

export function FloatingAdvisor({ onPress }: FloatingAdvisorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const widthAnim = useRef(new Animated.Value(56)).current; // Initial circle size
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Entrance animation after a short delay
    const timer = setTimeout(() => {
      expand();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const expand = () => {
    setIsExpanded(true);
    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: 180,
        friction: 8,
        tension: 40,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start();
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { width: widthAnim }
      ]}
    >
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.button}
      >
        <Animated.View 
          style={[
            styles.content, 
            { opacity: opacityAnim, transform: [{ translateX: slideAnim }] }
          ]}
        >
          <Sparkles size={16} color="#6EE7B7" style={styles.sparkles} />
          <Text style={styles.label}>Ask Vault AI</Text>
        </Animated.View>

        <View style={styles.iconContainer}>
          <MessageCircle size={24} color="#FFFFFF" />
          <View style={styles.indicator} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    height: 56,
    backgroundColor: '#004D2C',
    borderRadius: 28,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'flex-end',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  sparkles: {
    marginRight: 6,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#004D2C',
  }
});
