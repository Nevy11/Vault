import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';

type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Dashboard: undefined;
};

export default function DashboardScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Dashboard'>) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        Alert.alert('Error', 'Failed to load user information.');
        setLoading(false);
        return;
      }
      setEmail(user?.email ?? null);
      setLoading(false);
    }
    loadUser();
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) {
      Alert.alert('Sign Out Failed', error.message || 'Unable to sign out.');
      return;
    }
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vault Dashboard</Text>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.body}>
          Welcome back{email ? `, ${email}` : ''}! Your mobile experience starts here.
        </Text>
      )}
      <TouchableOpacity style={styles.button} onPress={handleSignOut} disabled={loading}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#0B1220',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 18,
  },
  body: {
    color: '#CBD5E1',
    fontSize: 16,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
