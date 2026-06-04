import React, { useState, useEffect } from "react";
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
  SafeAreaView,
} from "react-native";
import { ShieldCheck, Key, ArrowLeft, CheckCircle2 } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { hashPin } from "../lib/utils";

const SettingsScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"input" | "verify" | "success">("input");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserEmail();
  }, []);

  const fetchUserEmail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setEmail(user.email);
    }
  };

  const handleRequestChange = async () => {
    if (newPin.length !== 6 || confirmPin.length !== 6) {
      Alert.alert("Invalid PIN", "PIN must be exactly 6 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert("Invalid PIN", "PINs do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;
      setStep("verify");
      Alert.alert("Verification Sent", "A 6-digit code has been sent to your email to verify this change.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSave = async () => {
    if (code.length !== 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "recovery",
      });

      if (verifyError) throw verifyError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session not found.");

      const hashedPin = await hashPin(newPin);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ pin_hash: hashedPin })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setStep("success");
    } catch (error: any) {
      Alert.alert("Verification Failed", error.message || "Could not verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Security Settings</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {step === "input" && (
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Key size={48} color="#3B82F6" />
              </View>
              <Text style={styles.title}>Update Secure PIN</Text>
              <Text style={styles.subtitle}>
                Choose a new 6-digit PIN to secure your transactions and account access.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>New Secure PIN</Text>
                <TextInput
                  value={newPin}
                  onChangeText={setNewPin}
                  placeholder="123456"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Confirm New PIN</Text>
                <TextInput
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  placeholder="123456"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.input}
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleRequestChange}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Secure PIN</Text>}
              </TouchableOpacity>
            </View>
          )}

          {step === "verify" && (
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <ShieldCheck size={48} color="#10B981" />
              </View>
              <Text style={styles.title}>Verify Update</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit verification code to {email}. Enter it below to confirm your new PIN.
              </Text>

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

              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#10B981" }]}
                onPress={handleVerifyAndSave}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Confirm PIN Change</Text>}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.resendButton} 
                onPress={() => setStep("input")}
                disabled={loading}
              >
                <Text style={styles.resendText}>Back to PIN entry</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "success" && (
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <CheckCircle2 size={64} color="#10B981" />
              </View>
              <Text style={styles.title}>PIN Updated!</Text>
              <Text style={styles.subtitle}>
                Your Secure PIN has been updated successfully. Use your new PIN for future transactions.
              </Text>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#3B82F6" }]}
                onPress={() => navigation.navigate("Dashboard")}
              >
                <Text style={styles.buttonText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 30,
    alignItems: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  field: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    color: "#FFFFFF",
    fontSize: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    textAlign: "center",
    letterSpacing: 4,
  },
  button: {
    width: "100%",
    backgroundColor: "#3B82F6",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resendButton: {
    marginTop: 24,
    padding: 10,
  },
  resendText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
});
