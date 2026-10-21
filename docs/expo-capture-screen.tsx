/**
 * Expo Mobile App - Photo Body Measurement Capture Screen
 * Uses Expo Camera with an on-screen SVG silhouette overlay,
 * height calibration input, and direct upload to Sui Dhaga backend POST /measurements.
 */

import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Svg, { Path, Rect } from "react-native-svg";

interface MeasurementResult {
  id: string;
  title: string;
  chest?: number;
  waist?: number;
  hips?: number;
  shoulder?: number;
  sleeveLength?: number;
  inseam?: number;
  neck?: number;
  aiEstimation?: {
    estimated_weight_kg: number;
    scale_factor: number;
    accuracy_note: string;
    quality: {
      passed: boolean;
      warnings: string[];
    };
  };
}

export default function MeasurementCaptureScreen({ navigation, apiAuthToken }: { navigation: any; apiAuthToken: string }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<"back" | "front">("back");
  const [heightCm, setHeightCm] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [weightKg, setWeightKg] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [resultModalVisible, setResultModalVisible] = useState<boolean>(false);
  const [measurementResult, setMeasurementResult] = useState<MeasurementResult | null>(null);

  const cameraRef = useRef<any>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need your camera permission to capture your body photo.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCaptureAndMeasure = async () => {
    const parsedHeight = parseFloat(heightCm);
    if (!parsedHeight || parsedHeight < 100 || parsedHeight > 250) {
      Alert.alert("Height Required", "Please enter your height in cm (between 100 and 250 cm) for scale calibration.");
      return;
    }

    if (!cameraRef.current) return;

    try {
      setIsCapturing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      const formData = new FormData();
      formData.append("image", {
        uri: photo.uri,
        name: "body_photo.jpg",
        type: "image/jpeg",
      } as any);

      formData.append("heightCm", parsedHeight.toString());
      formData.append("gender", gender);
      if (weightKg) {
        formData.append("weightKg", weightKg);
      }
      formData.append("unit", "cm");
      formData.append("title", "AI Smart Fit Profile");

      const response = await fetch("https://api.suidhaga.pk/api/v1/measurements", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiAuthToken}`,
          Accept: "application/json",
        },
        body: formData,
      });

      const json = await response.json();

      if (!response.ok) {
        const errorMsg = json?.message || json?.error || "Measurement calculation failed.";
        Alert.alert("Quality Gate Alert", errorMsg);
        return;
      }

      setMeasurementResult(json.data);
      setResultModalVisible(true);
    } catch (err: any) {
      Alert.alert("Network Error", err.message || "Failed to reach measurement service.");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Camera Viewfinder */}
      <CameraView style={styles.camera} facing={cameraFacing} ref={cameraRef}>
        {/* On-screen A-Pose Silhouette Guide */}
        <View style={styles.silhouetteOverlay} pointerEvents="none">
          <Svg height="100%" width="100%" viewBox="0 0 100 100">
            {/* Target standing frame */}
            <Rect x="20" y="8" width="60" height="84" rx="4" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" strokeDasharray="3,3" fill="none" />
            {/* Anatomical head indicator */}
            <Path d="M 50 12 C 46 12 44 16 44 20 C 44 24 46 27 50 27 C 54 27 56 24 56 20 C 56 16 54 12 50 12 Z" stroke="#00E5FF" strokeWidth="0.8" fill="none" />
            {/* A-Pose Body Guidelines */}
            <Path d="M 50 28 L 50 56 M 40 32 L 28 54 M 60 32 L 72 54 M 50 56 L 42 88 M 50 56 L 58 88" stroke="#00E5FF" strokeWidth="0.8" fill="none" />
          </Svg>
        </View>

        {/* Guidance Banner */}
        <View style={styles.guidanceBanner}>
          <Text style={styles.guidanceTitle}>Pose Instructions</Text>
          <Text style={styles.guidanceSub}>
            • Stand straight, feet shoulder-width apart{"\n"}
            • Arms angled 30° away from your body{"\n"}
            • Wear form-fitted clothing (gymwear/leggings){"\n"}
            • Phone at chest height against a plain wall
          </Text>
        </View>

        {/* Controls Overlay */}
        <View style={styles.controlsContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Height (cm) *"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={heightCm}
              onChangeText={setHeightCm}
            />
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderBtn, gender === "female" && styles.genderBtnActive]}
                onPress={() => setGender("female")}
              >
                <Text style={styles.genderBtnText}>Female</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, gender === "male" && styles.genderBtnActive]}
                onPress={() => setGender("male")}
              >
                <Text style={styles.genderBtnText}>Male</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]}
            onPress={handleCaptureAndMeasure}
            disabled={isCapturing}
          >
            {isCapturing ? <ActivityIndicator color="#fff" /> : <Text style={styles.captureBtnText}>Capture & Measure</Text>}
          </TouchableOpacity>
        </View>
      </CameraView>

      {/* Results Modal */}
      <Modal visible={resultModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tailor Measurements Ready</Text>
            <Text style={styles.accuracyNote}>
              {measurementResult?.aiEstimation?.accuracy_note ||
                "Estimates from photo. Tailor must confirm before cutting."}
            </Text>

            <ScrollView style={styles.metricsList}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Chest Circumference:</Text>
                <Text style={styles.metricValue}>{measurementResult?.chest} cm</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Waist Circumference:</Text>
                <Text style={styles.metricValue}>{measurementResult?.waist} cm</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Hips Circumference:</Text>
                <Text style={styles.metricValue}>{measurementResult?.hips} cm</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Shoulder Width:</Text>
                <Text style={styles.metricValue}>{measurementResult?.shoulder} cm</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Sleeve Length:</Text>
                <Text style={styles.metricValue}>{measurementResult?.sleeveLength} cm</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Inseam (Inside Leg):</Text>
                <Text style={styles.metricValue}>{measurementResult?.inseam} cm</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Estimated Body Weight:</Text>
                <Text style={styles.metricValue}>
                  {measurementResult?.aiEstimation?.estimated_weight_kg} kg
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setResultModalVisible(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.buttonText}>Save Profile & Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1, justifyContent: "space-between" },
  permissionContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  permissionText: { fontSize: 16, color: "#333", textAlign: "center", marginBottom: 20 },
  primaryButton: { backgroundColor: "#0284C7", paddingVertical: 14, paddingHorizontal: 28, borderRadius: 10 },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  silhouetteOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.8 },
  guidanceBanner: { margin: 16, padding: 14, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 12 },
  guidanceTitle: { color: "#00E5FF", fontWeight: "700", fontSize: 14, marginBottom: 4 },
  guidanceSub: { color: "#E0E0E0", fontSize: 12, lineHeight: 18 },
  controlsContainer: { padding: 16, backgroundColor: "rgba(0,0,0,0.85)", borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  inputRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  input: { flex: 1, height: 44, backgroundColor: "#1E1E1E", borderRadius: 8, paddingHorizontal: 12, color: "#FFF", fontSize: 14 },
  genderRow: { flexDirection: "row", gap: 6 },
  genderBtn: { paddingHorizontal: 14, height: 44, justifyContent: "center", borderRadius: 8, backgroundColor: "#2A2A2A" },
  genderBtnActive: { backgroundColor: "#0284C7" },
  genderBtnText: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  captureBtn: { backgroundColor: "#10B981", height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  captureBtnDisabled: { opacity: 0.6 },
  captureBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 4 },
  accuracyNote: { fontSize: 12, color: "#DC2626", marginBottom: 16 },
  metricsList: { marginBottom: 20 },
  metricRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#F0F0F0" },
  metricLabel: { fontSize: 15, color: "#4B5563" },
  metricValue: { fontSize: 16, fontWeight: "700", color: "#111827" },
});
