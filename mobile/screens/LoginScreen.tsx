import { useState } from "react";
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
        <Text style={styles.title}>Vault Mobile</Text>
        <Text style={styles.subtitle}>Sign in to access your Vault account.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>PIN</Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            placeholder="123456"
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
            <Text style={styles.buttonText}>{step === "signIn" ? "Send Code" : "Verify Code"}</Text>
          )}
        </TouchableOpacity>

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
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#CBD5E1",
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    color: "#E2E8F0",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  footerText: {
    color: "#94A3B8",
  },
  link: {
    color: "#38BDF8",
    fontWeight: "700",
  },
});
