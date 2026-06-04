import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import FaceDetection from "@react-native-ml-kit/face-detection";
import { ShieldCheck, Camera as CameraIcon, CheckCircle2, XCircle } from "lucide-react-native";
import { supabase } from "../lib/supabase";

const KYCScreen = ({ navigation }: any) => {
  const [step, setStep] = useState<"intro" | "scanning" | "success">("intro");
  const [loading, setLoading] = useState(false);
  const device = useCameraDevice("front");
  const { hasPermission, requestPermission } = useCameraPermission();
  const camera = useRef<Camera>(null);

  useEffect(() => {
    if (step === "scanning" && !hasPermission) {
      requestPermission();
    }
  }, [step, hasPermission]);

  const handleStartScanning = () => {
    setStep("scanning");
  };

  const onFaceDetected = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Simulate taking a photo and processing it with ML Kit
      // In a real implementation, you would use a frame processor or take a photo
      // For now, we simulate the ML Kit detection success
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { error } = await supabase
        .from("profiles")
        .update({ kyc_status: "verified" })
        .eq("id", user.id);

      if (error) throw error;

      setStep("success");
    } catch (error: any) {
      Alert.alert("KYC Error", error.message || "Face detection failed. Please try again.");
      setStep("intro");
    } finally {
      setLoading(false);
    }
  };

  if (!device && step === "scanning") {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No camera device found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {step === "intro" && (
        <View style={styles.content}>
          <ShieldCheck size={80} color="#3B82F6" strokeWidth={1.5} />
          <Text style={styles.title}>Identity Verification</Text>
          <Text style={styles.description}>
            To keep your account secure, we need to verify your identity before your first
            transaction.
          </Text>
          <View style={styles.bulletPoints}>
            <View style={styles.bullet}>
              <CheckCircle2 size={18} color="#10B981" />
              <Text style={styles.bulletText}>Secure and encrypted</Text>
            </View>
            <View style={styles.bullet}>
              <CheckCircle2 size={18} color="#10B981" />
              <Text style={styles.bulletText}>Takes less than 30 seconds</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.button} onPress={handleStartScanning}>
            <Text style={styles.buttonText}>Start Face Verification</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === "scanning" && (
        <View style={styles.cameraContainer}>
          {hasPermission ? (
            <Camera
              ref={camera}
              style={StyleSheet.absoluteFill}
              device={device!}
              isActive={true}
              photo={true}
            />
          ) : (
            <View style={styles.permissionContainer}>
              <Text style={styles.errorText}>Camera permission is required</Text>
              <TouchableOpacity onPress={requestPermission} style={styles.smallButton}>
                <Text style={styles.buttonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.overlay}>
            <View style={styles.faceGuide} />
            <Text style={styles.overlayText}>Center your face in the frame</Text>
            <TouchableOpacity 
              style={styles.captureButton} 
              onPress={onFaceDetected}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <CameraIcon size={32} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === "success" && (
        <View style={styles.content}>
          <CheckCircle2 size={80} color="#10B981" strokeWidth={1.5} />
          <Text style={styles.title}>Verification Complete!</Text>
          <Text style={styles.description}>
            Thank you for verifying your identity. You can now proceed with your transaction.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#10B981" }]}
            onPress={() => navigation.navigate("Dashboard")}
          >
            <Text style={styles.buttonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default KYCScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    flex: 1,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 24,
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  bulletPoints: {
    width: "100%",
    marginBottom: 40,
  },
  bullet: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  bulletText: {
    color: "#CBD5E1",
    fontSize: 15,
  },
  button: {
    width: "100%",
    backgroundColor: "#3B82F6",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  smallButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cameraContainer: {
    flex: 1,
    overflow: "hidden",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  faceGuide: {
    width: 280,
    height: 380,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: "#3B82F6",
    backgroundColor: "transparent",
  },
  overlayText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 30,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  captureButton: {
    position: "absolute",
    bottom: 50,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
});
