import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Fingerprint, ShieldCheck } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { hashPin } from "../lib/utils";

type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Dashboard: undefined;
};

export default function LoginScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Login">) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"signIn" | "verify">("signIn");
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const savedEmail = await SecureStore.getItemAsync("user_email");
      const savedPin = await SecureStore.getItemAsync("user_pin");

      setBiometricSupported(compatible && enrolled);
      setHasSavedCredentials(!!(savedEmail && savedPin));

      if (savedEmail) setEmail(savedEmail);

      // Auto-trigger biometrics if available
      if (compatible && enrolled && savedEmail && savedPin) {
        handleBiometricLogin(savedEmail, savedPin);
      }
    } catch (e) {
      console.error("Error checking biometrics", e);
    }
  };

  const handleBiometricLogin = async (savedEmail: string, savedPin: string) => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock your Vault",
        fallbackLabel: "Use PIN",
      });

      if (result.success) {
        setLoading(true);
        // Use the saved PIN to perform the silent login
        await performSilentLogin(savedEmail, savedPin);
      }
    } catch (error) {
      console.error("Biometric error:", error);
    } finally {
      setLoading(false);
    }
  };

  const performSilentLogin = async (e: string, p: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, pin_hash")
        .eq("email", e)
        .maybeSingle();

      if (profileError || !profile) throw new Error("Account check failed");

      const hashedPin = await hashPin(p);
      if (profile.pin_hash !== hashedPin) throw new Error("Invalid credentials");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session && session.user.email === e) {
        navigation.replace("Dashboard");
        return;
      }

      // If no session, we must go through OTP
      setStep("verify");
      setPin(p); // Set the PIN so handleVerify can use it
      const { error } = await supabase.auth.signInWithOtp({ email: e });
      if (error) throw error;
      Alert.alert("Welcome Back", "Please enter the verification code sent to your email.");
    } catch (error: any) {
      Alert.alert("Login Error", error.message);
    }
  };

  const showError = (message: string) => Alert.alert("Login Error", message);

  const handleSendCode = async () => {
    if (!email || !pin) {
      showError("Please enter both email and PIN.");
      return;
    }
    if (pin.length !== 6) {
      showError("PIN must be exactly 6 digits.");
      return;
    }

    setLoading(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        throw new Error("No account found with this email. Please sign up.");
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });

      if (error) throw error;
      setStep("verify");
      Alert.alert("Code Sent", "A verification code was sent to your email.");
    } catch (error: any) {
      showError(error?.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      showError("Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "magiclink",
      });

      if (error) throw error;
      if (!user) throw new Error("Verification failed.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("pin_hash")
        .eq("id", user.id)
        .single();

      if (profileError) {
        await supabase.auth.signOut();
        throw profileError;
      }

      const hashedPin = await hashPin(pin);
      if (profile.pin_hash !== hashedPin) {
        await supabase.auth.signOut();
        throw new Error("Incorrect PIN. Please try again.");
      }

      // Save credentials for future biometric login
      await SecureStore.setItemAsync("user_email", email);
      await SecureStore.setItemAsync("user_pin", pin);

      navigation.replace("Dashboard");
    } catch (error: any) {
      showError(error?.message || "Verification failed.");
      setStep("signIn");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ShieldCheck size={48} color="#2563EB" />
          <Text style={styles.title}>Vault Mobile</Text>
          <Text style={styles.subtitle}>Secure financial operating system.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#64748B"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PIN</Text>
            <TextInput
              value={pin}
              onChangeText={setPin}
              placeholder="123456"
              placeholderTextColor="#64748B"
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              style={styles.input}
            />
          </View>

          {step === "verify" && (
            <View style={styles.field}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                maxLength={6}
                style={styles.input}
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={step === "signIn" ? handleSendCode : handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {step === "signIn" ? "Send Code" : "Verify Code"}
              </Text>
            )}
          </TouchableOpacity>

          {biometricSupported && hasSavedCredentials && step === "signIn" && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={() => {
                SecureStore.getItemAsync("user_email").then((e) => {
                  SecureStore.getItemAsync("user_pin").then((p) => {
                    if (e && p) handleBiometricLogin(e, p);
                  });
                });
              }}
              disabled={loading}
            >
              <Fingerprint size={24} color="#2563EB" />
              <Text style={styles.biometricText}>Quick Unlock with Biometrics</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Need an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
            <Text style={styles.link}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0B1220",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    color: "#CBD5E1",
    fontWeight: "600",
    fontSize: 14,
  },
  input: {
    backgroundColor: "#0B1220",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
    paddingVertical: 12,
  },
  biometricText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 14,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 32,
  },
  footerText: {
    color: "#64748B",
  },
  link: {
    color: "#38BDF8",
    fontWeight: "700",
  },
});
