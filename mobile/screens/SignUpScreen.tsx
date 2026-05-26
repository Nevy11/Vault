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

export default function SignUpScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "SignUp">) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"signUp" | "verify">("signUp");
  const [loading, setLoading] = useState(false);

  const showError = (message: string) => Alert.alert("Sign Up Error", message);

  const handleSignUp = async () => {
    if (!email || !pin || !confirmPin) {
      showError("Please fill in all fields.");
      return;
    }
    if (pin.length !== 6 || confirmPin.length !== 6) {
      showError("PIN must be exactly 6 digits.");
      return;
    }
    if (pin !== confirmPin) {
      showError("PINs do not match.");
      return;
    }

    setLoading(true);
    try {
      const randomPassword = Math.random().toString(36).slice(2, 12);
      const { error } = await supabase.auth.signUp({
        email,
        password: randomPassword,
      });
      if (error) throw error;

      setStep("verify");
      Alert.alert("Verification Sent", "A sign-up verification code was sent to your email.");
    } catch (error: any) {
      showError(error?.message || "Sign-up failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      showError("Enter the 6-digit code.");
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
        type: "signup",
      });

      if (error) throw error;
      if (!user) throw new Error("Verification failed.");

      const hashedPin = await hashPin(pin);
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email,
          pin_hash: hashedPin,
        },
        { onConflict: "id" },
      );
      if (profileError) throw profileError;

      Alert.alert("Welcome", "Your account is ready.");
      navigation.replace("Dashboard");
    } catch (error: any) {
      showError(error?.message || "Verification failed.");
      setStep("signUp");
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
        <Text style={styles.title}>Create your Vault account</Text>
        <Text style={styles.subtitle}>Start with your email and a 6-digit PIN.</Text>

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

        {step === "signUp" && (
          <>
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
            <View style={styles.field}>
              <Text style={styles.label}>Confirm PIN</Text>
              <TextInput
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="123456"
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                style={styles.input}
              />
            </View>
          </>
        )}

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
          onPress={step === "signUp" ? handleSignUp : handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {step === "signUp" ? "Create account" : "Verify code"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.link}>Log in</Text>
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
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#94A3B8",
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
