import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Eye, EyeOff, ShieldCheck, Fingerprint } from 'lucide-react-native';

/**
 * DATA CONTRACTS & INTERFACES
 */
export interface VaultCardProps {
  balance: number;
  currency: string;
  accountName: string;
  onTransactionInitiated?: (amount: number) => Promise<void>;
}

export const SecureVaultCard: React.FC<VaultCardProps> = ({
  balance,
  currency = 'KES',
  accountName,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [biometricSupported, setBiometricSupported] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricSupported(compatible && enrolled);
    })();
  }, []);

  /**
   * Enforces Biometric Authentication before revealing sensitive data
   */
  const handleToggleVisibility = async () => {
    if (isVisible) {
      setIsVisible(false);
      return;
    }

    if (!biometricSupported) {
      Alert.alert(
        'Security Notice',
        'Biometric authentication is not set up on this device. Please enable it in settings to view your balance.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsAuthenticating(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify identity to view Vault balance',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsVisible(true);
      }
    } catch (error) {
      Alert.alert('Authentication Failed', 'Unable to verify identity.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <View style={styles.cardContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>Total Balance</Text>
          <Text style={styles.accountName}>{accountName}</Text>
        </View>
        <ShieldCheck size={24} color="#10B981" />
      </View>

      <View style={styles.balanceRow}>
        <Text style={styles.balanceText}>
          {isVisible ? formatBalance(balance) : '••••••••••'}
        </Text>
        
        <TouchableOpacity 
          onPress={handleToggleVisibility} 
          disabled={isAuthenticating}
          style={styles.toggleButton}
        >
          {isAuthenticating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : isVisible ? (
            <EyeOff size={24} color="#FFFFFF" />
          ) : (
            <Eye size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <View style={styles.biometricStatus}>
          <Fingerprint size={16} color={biometricSupported ? "#10B981" : "#94A3B8"} />
          <Text style={[styles.statusText, { color: biometricSupported ? "#10B981" : "#94A3B8" }]}>
            {biometricSupported ? 'Biometrics Active' : 'Biometrics Disabled'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  accountName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  balanceText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  toggleButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 16,
  },
  biometricStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
